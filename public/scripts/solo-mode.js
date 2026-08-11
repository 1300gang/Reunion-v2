// ============================================================================
// SOLO-MODE.JS - Logique complète du mode Solo (Version corrigée)
// ============================================================================

class SoloGameManager {
  constructor() {
    this.config = {
      lobby: null,
      playerName: 'Joueur Solo',
      scenario: null,
      scenarioFile: null,
      levelColors: null,
      levelName: null
    };
    
    this.state = {
      currentQuestion: null,
      hasVoted: false,
      responses: {},
      voteComponents: {},
      questionHistory: [],
      startTime: Date.now(),
      endTime: null
    };
    
    this.socket = null;
  }
  
  // ============================================================================
  // 1. INITIALISATION
  // ============================================================================
  
  initialize(socket, scenarioFile, level) {
    console.log('🎮 Initialisation du mode SOLO');
    
    this.socket = socket;
    this.config.scenarioFile = scenarioFile;
    this.config.levelName = level;
    
    // Récupérer la config solo depuis sessionStorage
    const soloConfig = JSON.parse(sessionStorage.getItem('soloMode') || '{}');
    this.config.lobby = soloConfig.lobbyName || `solo_${Date.now()}`;
    this.config.playerName = soloConfig.playerName || 'Joueur Solo';
    
    // Récupérer les couleurs du thème
    this.loadThemeColors();
    
    // Créer le lobby en mode solo
    this.createSoloLobby();
    
    // Afficher l'interface
    this.showSoloScreen();
    
    // Appliquer le thème au pill
    this.applyThemeToPill();
    
    // Initialiser les listeners
    this.initializeEventListeners();
  }
  
  loadThemeColors() {
    const storedConfig = sessionStorage.getItem('gameConfig');
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        if (config.levelColors) {
          this.config.levelColors = config.levelColors;
        }
        if (config.level) {
          this.config.levelName = config.level;
        }
      } catch (e) {
        console.warn('Erreur récupération config thème:', e);
      }
    }
  }
  
  createSoloLobby() {
    this.socket.emit('create-lobby', {
      lobbyName: this.config.lobby,
      scenarioFile: this.config.scenarioFile,
      mode: 'solo'
    });
  }
  
  showSoloScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const soloScreen = document.getElementById('solo-screen');
    if (soloScreen) soloScreen.classList.add('active');
  }
  
  applyThemeToPill() {
    const pillEl = document.querySelector('#solo-screen .pill');
    if (pillEl && this.config.levelColors) {
      pillEl.style.background = this.config.levelColors[0];
      pillEl.style.color = this.config.levelColors[0].startsWith('#e') ? 
                            'var(--couleur-noirVolcan)' : 'var(--couleur-blancSite)';
    }
    
    const lobbyNameEl = document.getElementById('soloLobbyName');
    if (lobbyNameEl) {
      lobbyNameEl.textContent = `Mode Solo - ${this.config.levelName || 'Niveau'}`;
    }
  }
  
  // ============================================================================
  // 2. EVENT LISTENERS
  // ============================================================================
  
  initializeEventListeners() {
    // Boutons de contrôle
    const showAnswersBtn = document.getElementById('soloShowAnswersBtn');
    if (showAnswersBtn) {
      showAnswersBtn.onclick = () => this.showAnswerPanel();
    }
    
    const closeAnswersBtn = document.getElementById('soloCloseAnswersBtn');
    if (closeAnswersBtn) {
      closeAnswersBtn.onclick = () => this.hideAnswerPanel();
    }
    
    // Boutons de fin de partie
    const replayBtn = document.getElementById('soloReplayBtn');
    if (replayBtn) {
      replayBtn.onclick = () => location.reload();
    }
    
    const newLevelBtn = document.getElementById('soloNewLevelBtn');
    if (newLevelBtn) {
      newLevelBtn.onclick = () => this.backToMenu();
    }
    
    const downloadBtn = document.getElementById('soloDownloadBtn');
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadPDF();
    }
    
    const shareBtn = document.getElementById('soloShareBtn');
    if (shareBtn) {
      shareBtn.onclick = () => this.shareResults();
    }
  }
  
  // ============================================================================
  // 3. GESTION DES QUESTIONS
  // ============================================================================
  
  async displayQuestion(questionData) {
    this.showElement('soloShowAnswersBtn');
    console.log('📋 Affichage question solo:', questionData.id);
    
    this.state.currentQuestion = questionData;
    this.state.hasVoted = false;
    
    // Ajouter à l'historique
    this.state.questionHistory.push(questionData.id);
    
    // Vérifier si c'est la fin du scénario
    if (this.isEndOfScenario(questionData)) {
      console.log('🎯 Fin du scénario détectée');
      await this.handleScenarioEnd(questionData);
      return;
    }
    
    // Réinitialiser l'interface
    this.hideAnswerPanel();
    this.hideElement('soloWaitingMessage');
    
    // Afficher l'image contextuelle
    if (questionData.contextual_image) {
      const imageEl = document.getElementById('soloContextImage');
      if (imageEl) {
        imageEl.src = questionData.contextual_image;
        console.log('🖼️ Image mise à jour:', questionData.contextual_image);
      }
    }
    
    // Afficher le contexte
    this.displayContext(questionData.context);
    
    // Gérer selon le type de question
    if (questionData.type === 'messenger_scenario' && questionData.conversation) {
      console.log('💬 Conversation détectée');
      await this.displayMessengerConversation(questionData.conversation);
      this.showElement('soloMessengerView');
    } else {
      this.hideElement('soloMessengerView');
    }
    
    // Gérer les questions "Continuer"
    if (this.isContinueQuestion(questionData)) {
      console.log('⏭️ Question Continue détectée');
      this.handleContinueQuestion(questionData);
    } else {
      console.log('🎯 Question standard avec choix');
      this.setupChoices(questionData);
    }
  }
  
  isEndOfScenario(questionData) {
    return (
      (!questionData.choices || questionData.choices.length === 0) &&
      (!questionData.nextQuestions || Object.keys(questionData.nextQuestions).length === 0)
    );
  }
  
  isContinueQuestion(questionData) {
    return questionData &&
           questionData.choices &&
           questionData.choices.length === 1 &&
           questionData.choices[0] &&
           typeof questionData.choices[0].text === 'string' &&
           (questionData.choices[0].text.toLowerCase() === 'continuer' ||
            questionData.question === '' ||
            questionData.question === null);
  }
  
  displayContext(context) {
    const contextDiv = document.getElementById('soloQuestionContext');
    if (contextDiv) {
      if (context) {
        contextDiv.textContent = context;
        this.showElement('soloQuestionContext');
        console.log('📝 Contexte affiché');
      } else {
        this.hideElement('soloQuestionContext');
      }
    }
  }
  
  // ============================================================================
  // 4. GESTION DES CHOIX ET RÉPONSES
  // ============================================================================
  
  setupChoices(questionData) {
    console.log('🎯 Configuration des choix:', questionData.choices);
    
    const titleEl = document.getElementById('soloQuestionTitle');
     titleEl.style.fontFamily =  'mocraRegular';
    if (titleEl) titleEl.textContent = questionData.question || 'Que faIre ?';
    
    const choicesDiv = document.getElementById('soloAnswerChoices');
    if (!choicesDiv) {
      console.error('❌ Élément soloAnswerChoices non trouvé');
      return;
    }

    
    choicesDiv.innerHTML = '';
    this.state.voteComponents = {};
    
    questionData.choices.forEach((choice, index) => {
      const letter = String.fromCharCode(65 + index);
      const choiceContainer = document.createElement('div');
      choiceContainer.className = 'answer-choice-container';
      choiceContainer.id = `solo-answer-choice-${letter}`;
      
      choicesDiv.appendChild(choiceContainer);
      
      // Utiliser VoteComponent si disponible
      if (typeof VoteComponent !== 'undefined') {
        console.log(`📊 Création VoteComponent pour ${letter}: ${choice.text}`);
        this.state.voteComponents[letter] = new VoteComponent(choiceContainer, {
          letter: letter,
          text: choice.text,
          count: 0,
          totalVotes: 0,
          isClickable: true,
          showVoters: false,
          onVote: (selectedLetter) => this.submitAnswer(
            questionData.id, 
            selectedLetter, 
            questionData.nextQuestions ? questionData.nextQuestions[selectedLetter] : null
          )
        });
      } else {
        // Fallback sans VoteComponent
        console.log(`🔘 Création bouton simple pour ${letter}: ${choice}`);
        this.createSimpleChoice(choiceContainer, letter, choice, questionData);
      }
    });
    
    const statusEl = document.getElementById('soloAnswerStatus');
    if (statusEl) statusEl.textContent = '';
    
    this.showElement('soloShowAnswersBtn');
    console.log('✅ Choix configurés avec succès');
  }
  
  createSimpleChoice(container, letter, text, questionData) {
    const button = document.createElement('button');
    button.className = 'answer-button';
    button.innerHTML = `
      <span class="answer-letter">${letter}</span>
      <span class="answer-text">${text}</span>
    `;
    button.onclick = () => this.submitAnswer(
      questionData.id, 
      letter, 
      questionData.nextQuestions ? questionData.nextQuestions[letter] : null
    );
    container.appendChild(button);
  }
  
  handleContinueQuestion(questionData) {
    console.log('⏭️ Question Continue:', questionData.id);
    
    const titleEl = document.getElementById('soloQuestionTitle');
    if (titleEl) titleEl.textContent = 'Cliquez pour continuer';
    
    const choicesDiv = document.getElementById('soloAnswerChoices');
    if (!choicesDiv) return;
    
    choicesDiv.innerHTML = '';
    const choice = questionData.choices[0];
    const letter = 'A';

    const choiceContainer = document.createElement('div');
    choiceContainer.className = 'answer-choice-container';
    choiceContainer.id = `solo-answer-choice-${letter}`;
    choicesDiv.appendChild(choiceContainer);

    if (typeof VoteComponent !== 'undefined') {
        this.state.voteComponents[letter] = new VoteComponent(choiceContainer, {
            letter: letter,
            text: choice.text || 'Continuer',
            isClickable: true,
            onVote: (selectedLetter) => this.submitAnswer(
                questionData.id,
                selectedLetter,
                choice.next_question_id
            )
        });
    }

    const statusEl = document.getElementById('soloAnswerStatus');
    if (statusEl) statusEl.textContent = '';
    
    this.showElement('soloShowAnswersBtn');
  }
  
  submitAnswer(questionId, answer, nextQuestionId) {
    if (this.state.hasVoted) return;
    
    console.log('📝 Soumission réponse:', { questionId, answer, nextQuestionId });
    
    this.state.hasVoted = true;
    
    // Stocker la réponse
    if (!this.state.responses[this.config.lobby]) {
      this.state.responses[this.config.lobby] = {};
    }
    this.state.responses[this.config.lobby][questionId] = answer;
    
    // Envoyer au serveur
    this.socket.emit('player-answer', { questionId, answer });
    
    // Désactiver tous les choix
    Object.values(this.state.voteComponents).forEach(component => {
      if (component.disable) component.disable();
    });
    
    // Animer le choix sélectionné
    if (this.state.voteComponents[answer]) {
      if (this.state.voteComponents[answer].showVoteAnimation) {
        this.state.voteComponents[answer].showVoteAnimation();
      }
      if (this.state.voteComponents[answer].update) {
        this.state.voteComponents[answer].update({
          count: 1,
          totalVotes: 1
        });
      }
    }
    
    const statusEl = document.getElementById('soloAnswerStatus');
    if (statusEl) statusEl.textContent = '✅ Choix enregistré !';
    
    this.showElement('soloWaitingMessage');
    
    // Passer à la question suivante
    if (nextQuestionId) {
      setTimeout(() => {
        this.socket.emit('choose-next-question', { nextQuestionId });
        this.hideAnswerPanel();
      }, 1000);
    }
  }
  
  // ============================================================================
  // 5. MESSENGER CONVERSATION
  // ============================================================================
  calculateReadingTime(messageContent) {
  const MINIMUM_DELAY = 500; // Un délai minimum de 0.5s, même pour les messages très courts
  const CHARS_PER_SECOND = 52; // Vitesse de lecture (ajustez selon vos préférences)
  
  const calculatedDelay = (messageContent.length / CHARS_PER_SECOND) * 1000;
  
  // On s'assure de ne jamais avoir un délai plus court que le minimum
  return Math.max(calculatedDelay, MINIMUM_DELAY);
}


  async displayMessengerConversation(conversation) {
    console.log('💬 Affichage conversation messenger');
    this.hideElement('soloShowAnswersBtn');
    const messengerDiv = document.getElementById('soloMessengerView');
    if (!messengerDiv) {
      console.error('❌ Élément soloMessengerView non trouvé');
      return;
    }
    
    // Créer le conteneur des messages avec indicateur de frappe
    messengerDiv.innerHTML = `
      <div class="messenger-messages"></div>
      <div class="typing-indicator hidden">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    `;
    
    const messages = conversation.messages.map(message => {
      const participant = conversation.participants.find(p => p.id === message.sender);
      return {
        sender: participant ? participant.name : 'Utilisateur',
        avatar: message.avatar || (participant ? participant.avatar : null),
        content: message.content,
        isCurrentUser: participant ? participant.isCurrentUser : false
      };
    });
    
    console.log('💬 Messages préparés:', messages.length);
    await this.animateMessages(messages);
  }
  
async animateMessages(messages) {
  const container = document.querySelector('.messenger-messages');
  if (!container) return;
  
  for (const message of messages) {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
      showElement('typing-indicator');
      await sleep(300 + Math.random() * 200);
      hideElement('typing-indicator');
    }
    
    const messageDiv = createMessageElement(message);
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px) scale(0.9)';
    container.appendChild(messageDiv);
    
    await sleep(50);
    messageDiv.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateY(0) scale(1)';
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    // ===== MODIFICATION CI-DESSOUS =====
    // On remplace le délai fixe par notre calcul dynamique
    const readingTime = calculateReadingTime(message.content);
    console.log(`📖 Message: "${message.content.substring(0, 20)}..." | Délai de lecture: ${Math.round(readingTime)}ms`);
    await sleep(readingTime);
    // ===== FIN DE LA MODIFICATION =====
  }
}


  
  createMessageElement(message) {
    playMessageSound()
    const messageDiv = document.createElement('div');
    const isCurrentUser = message.isCurrentUser || false;
    messageDiv.className = `message ${isCurrentUser ? 'message-right' : 'message-left'}`;
    
    const isImageAvatar = message.avatar && (
      message.avatar.startsWith('http') || 
      message.avatar.startsWith('/') || 
      /\.(jpg|jpeg|png|gif|svg)$/i.test(message.avatar)
    );
    
    const avatarContent = isImageAvatar 
      ? `<img src="${message.avatar}" alt="${message.sender}" class="avatar-image" />`
      : (message.avatar || '👤');
    
    messageDiv.innerHTML = `
      <div class="message-avatar">${avatarContent}</div>
      <div class="message-content">
        <div class="message-name">${message.sender || 'Utilisateur'}</div>
        <div class="message-text">${message.content}</div>
      </div>
    `;
    
    // Jouer un son si la fonction existe
    if (typeof window.ambientPlayer !== 'undefined' && window.ambientPlayer.playMessageSound) {
      try {
        window.ambientPlayer.playMessageSound();
      } catch (e) {
        console.log('Son de message non disponible');
      }
    }
    
    return messageDiv;
  }
  
  // ============================================================================
  // 6. FIN DE SCÉNARIO
  // ============================================================================
  
  async handleScenarioEnd(finalQuestion) {
    console.log('🏁 Gestion de la fin du scénario');
    this.state.endTime = Date.now();

    // Si c'est une conversation messenger finale, l'afficher
    if (finalQuestion.type === 'messenger_scenario' && finalQuestion.conversation) {
        if (finalQuestion.contextual_image) {
            const imageEl = document.getElementById('soloContextImage');
            if (imageEl) imageEl.src = finalQuestion.contextual_image;
        }
        await this.displayMessengerConversation(finalQuestion.conversation);
        this.showElement('soloMessengerView');
        await this.sleep(1000); // Shorter wait
    }

    this.showNotification('Génération de votre rapport personnalisé...', 'info', 2000);
    this.socket.emit('generate-json-report');
  }

  async populateEndScreenWithReport(report) {
    console.log('📊 Préparation de l\'écran de fin avec le rapport JSON');

    const playerReport = report.players[0];
    if (!playerReport) {
        console.error("Rapport invalide: pas de données de joueur.");
        return;
    }

    const scenarioTitle = report.gameInfo.scenarioTitle || 'Scénario';
    const scenarioCreators = this.config.scenario?.scenario_info?.creators || ['les créateurs'];

    // Calculer la durée
    const duration = this.state.endTime ? Math.floor((this.state.endTime - this.state.startTime) / 1000) : 0;
    const formattedDuration = this.formatDuration(duration);

    // Mettre à jour les stats de base
    this.setTextContent('solo-completed-scenario', scenarioTitle);
    this.setTextContent('solo-creators', Array.isArray(scenarioCreators) ? scenarioCreators.join(', ') : scenarioCreators);
    this.setTextContent('solo-total-answers', playerReport.responses.length);
    this.setTextContent('solo-total-time', formattedDuration);
    this.setTextContent('solo-path-taken', `${playerReport.responses.length} décisions prises`);

    // Afficher les scores thématiques
    this.displayThematicScores(playerReport.thematicScores);

    // Afficher les choix clés (les 3 derniers)
    this.displayKeyChoices(playerReport.responses.slice(-3));

    this.showEndScreen();
  }

  displayThematicScores(scores) {
      const container = document.getElementById('solo-themes-list'); // Re-using this container for scores
      if (!container || !scores) return;

      container.innerHTML = `
          <div class="summary-stat">
              <span class="summary-icon">🤝</span>
              <div class="summary-content">
                  <span class="summary-label">Consentement</span>
                  <span class="summary-value">${scores.consentement}</span>
              </div>
          </div>
          <div class="summary-stat">
              <span class="summary-icon">❤️</span>
              <div class="summary-content">
                  <span class="summary-label">Entraide</span>
                  <span class="summary-value">${scores.entraide}</span>
              </div>
          </div>
          <div class="summary-stat">
              <span class="summary-icon">💪</span>
              <div class="summary-content">
                  <span class="summary-label">Résilience</span>
                  <span class="summary-value">${scores.resilience}</span>
              </div>
          </div>
      `;
  }
  
  prepareEndScreen() {
    console.log('📊 Préparation de l\'écran de fin');
    
    const scenarioTitle = this.config.scenario?.scenario_info?.title || 'Scénario';
    const scenarioCreators = this.config.scenario?.scenario_info?.creators || ['les créateurs'];
    
    const stats = this.calculateStats();
    this.updateEndScreen(scenarioTitle, scenarioCreators, stats);
  }
  
  calculateStats() {
    const responses = this.state.responses[this.config.lobby] || {};
    const questionCount = Object.keys(responses).length;
    
    const themes = new Set();
    if (this.config.scenario && this.config.scenario.questions) {
      Object.values(this.config.scenario.questions).forEach(q => {
        if (q.metadata && q.metadata.themes_abordes) {
          q.metadata.themes_abordes.forEach(theme => themes.add(theme));
        }
      });
    }
    
    // Calculer la durée totale
    const duration = this.state.endTime ? 
      Math.floor((this.state.endTime - this.state.startTime) / 1000) : 0;
    
    const formattedDuration = this.formatDuration(duration);
    
    return {
      questionCount,
      themes: Array.from(themes),
      responses,
      duration: formattedDuration
    };
  }
  
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  updateEndScreen(scenarioTitle, creators, stats) {
    // Titre du scénario
    const scenarioEl = document.getElementById('solo-completed-scenario');
    if (scenarioEl) scenarioEl.textContent = scenarioTitle;
    
    // Créateurs
    const creatorsEl = document.getElementById('solo-creators');
    if (creatorsEl) {
      creatorsEl.textContent = Array.isArray(creators) ? creators.join(', ') : creators;
    }
    
    // Statistiques
    const answersEl = document.getElementById('solo-total-answers');
    if (answersEl) answersEl.textContent = stats.questionCount;
    
    const timeEl = document.getElementById('solo-total-time');
    if (timeEl) timeEl.textContent = stats.duration;
    
    const pathEl = document.getElementById('solo-path-taken');
    if (pathEl) {
      pathEl.textContent = `${stats.questionCount} décisions prises`;
    }
    
    // Thèmes abordés
    this.displayThemes(stats.themes);
    
    // Choix clés
    this.displayKeyChoices(stats.responses);
  }
  
  displayThemes(themes) {
    const themesContainer = document.getElementById('solo-themes-list');
    if (!themesContainer || themes.length === 0) return;
    
    themesContainer.innerHTML = '';
    
    const themesToDisplay = themes.slice(0, 7);
    
    themesToDisplay.forEach(theme => {
      const pill = document.createElement('span');
      pill.className = 'theme-pill';
      pill.textContent = theme;
      themesContainer.appendChild(pill);
    });
    
    if (themes.length > 7) {
      const morePill = document.createElement('span');
      morePill.className = 'theme-pill';
      morePill.style.fontStyle = 'italic';
      morePill.textContent = `+${themes.length - 7} autres...`;
      themesContainer.appendChild(morePill);
    }
  }
  
  displayKeyChoices(responses) {
    const keyChoicesContainer = document.getElementById('solo-key-choices');
    if (!keyChoicesContainer || responses.length === 0) return;
    
    keyChoicesContainer.innerHTML = '';
    
    responses.forEach(response => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'key-choice-item';
        
        choiceDiv.innerHTML = `
          <div>
            <strong>${response.questionText || 'Question'}</strong><br>
            <span>→ ${response.answerText || 'Réponse'}</span>
          </div>
        `;
        keyChoicesContainer.appendChild(choiceDiv);
    });
  }

  setTextContent(id, text) {
      const el = document.getElementById(id);
      if (el) {
          el.textContent = text;
      }
  }
  
  showEndScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const endScreen = document.getElementById('solo-end-screen');
    if (endScreen) endScreen.classList.add('active');
  }
  
  // ============================================================================
  // 7. PANNEAU DE RÉPONSES
  // ============================================================================
  
  showAnswerPanel() {
    const panel = document.getElementById('soloAnswerPanel');
    if (panel) panel.classList.add('show');
    this.hideElement('soloShowAnswersBtn');
  }
  
  hideAnswerPanel() {
    const panel = document.getElementById('soloAnswerPanel');
    if (panel) panel.classList.remove('show');
    this.showElement('soloShowAnswersBtn');
  }
  
  // ============================================================================
  // 8. ACTIONS FINALES
  // ============================================================================
  
  backToMenu() {
    sessionStorage.removeItem('gameConfig');
    sessionStorage.removeItem('soloMode');
    sessionStorage.removeItem('currentScenarioFile');
    
    if (this.socket) this.socket.disconnect();
    
    window.location.href = '/menu.html';
  }
  
  downloadPDF() {
    // TODO: Implémenter la génération PDF
    this.showNotification('Fonction PDF à implémenter', 'info');
  }
  
  shareResults() {
    // TODO: Implémenter le partage
    this.showNotification('Fonction partage à implémenter', 'info');
  }
  
  // ============================================================================
  // 9. UTILITAIRES
  // ============================================================================
  
  showElement(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      console.log('👁️ Élément affiché:', id);
    } else {
      console.warn('⚠️ Élément non trouvé:', id);
    }
  }
  
  hideElement(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      console.log('🙈 Élément masqué:', id);
    } else {
      console.warn('⚠️ Élément non trouvé:', id);
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  showNotification(message, type = 'info', duration = 3000) {
    // Utiliser la fonction globale si elle existe
    if (typeof showNotification === 'function') {
      showNotification(message, type, duration);
    } else if (window.gameManager && window.gameManager.showNotification) {
      window.gameManager.showNotification(message, type, duration);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
  
  // ============================================================================
  // 10. GESTIONNAIRE D'ÉVÉNEMENTS SOCKET
  // ============================================================================
  
  handleSocketEvents() {
    // Lobby créé
    this.socket.on('lobby-created', ({ scenarioTitle, scenarioData }) => {
      console.log('🎯 Lobby solo créé:', scenarioTitle);
      this.config.scenario = scenarioData;
      
      // Démarrer automatiquement
      setTimeout(() => {
        console.log('▶️ Démarrage automatique de la partie solo');
        this.socket.emit('start-game');
      }, 500);
    });
    
    // Partie démarrée
    this.socket.on('game-start', () => {
      console.log('🎮 Partie solo démarrée');
    });
    
    // Question reçue
    this.socket.on('question', (questionData) => {
      console.log('📋 Question reçue en mode solo:', questionData);
      this.displayQuestion(questionData);
    });
    
    // Fin de partie
    this.socket.on('game-over', () => {
      console.log('🏁 Fin de partie solo');
      // La fin est gérée par handleScenarioEnd, qui déclenche la génération du rapport
    });

    // Rapport prêt
    this.socket.on('json-report-ready', async (filename) => {
        console.log('[SOLO] Rapport JSON prêt:', filename);
        const url = '/exports/' + filename;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const report = await response.json();
            this.populateEndScreenWithReport(report);
        } catch (error) {
            console.error("Erreur lors de la récupération du rapport solo:", error);
            this.showNotification("Impossible d'afficher le rapport final.", "error");
        }
    });
    
    // Gestion des erreurs
    this.socket.on('error', (error) => {
      console.error('❌ Erreur socket solo:', error);
      this.showNotification('Erreur de connexion: ' + error, 'error');
    });
  }
}

// ============================================================================
// EXPORT ET INITIALISATION
// ============================================================================

// Créer une instance globale
window.soloGameManager = new SoloGameManager();

// Fonction d'initialisation à appeler depuis game.js
window.initializeSoloMode = function(socket, scenarioFile, level) {
  console.log('🚀 Lancement du mode solo:', { scenarioFile, level });
  window.soloGameManager.initialize(socket, scenarioFile, level);
  window.soloGameManager.handleSocketEvents();
};

console.log('📱 Solo Mode Manager chargé avec succès (Version corrigée)');