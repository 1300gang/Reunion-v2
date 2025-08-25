// ============================================================================
// SOLO-MODE.JS - Logique complète du mode Solo
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
      if (imageEl) imageEl.src = questionData.contextual_image;
    }
    
    // Afficher le contexte
    this.displayContext(questionData.context);
    
    // Gérer selon le type de question
    if (questionData.type === 'messenger_scenario' && questionData.conversation) {
      await this.displayMessengerConversation(questionData.conversation);
      this.showElement('soloMessengerView');
    } else {
      this.hideElement('soloMessengerView');
    }
    
    // Gérer les questions "Continuer"
    if (this.isContinueQuestion(questionData)) {
      this.handleContinueQuestion(questionData);
    } else {
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
           (questionData.choices[0].toLowerCase() === 'continuer' || 
            questionData.question === '' ||
            questionData.question === null);
  }
  
  displayContext(context) {
    const contextDiv = document.getElementById('soloQuestionContext');
    if (contextDiv) {
      if (context) {
        contextDiv.textContent = context;
        this.showElement('soloQuestionContext');
      } else {
        this.hideElement('soloQuestionContext');
      }
    }
  }
  
  // ============================================================================
  // 4. GESTION DES CHOIX ET RÉPONSES
  // ============================================================================
  
  setupChoices(questionData) {
    const titleEl = document.getElementById('soloQuestionTitle');
    if (titleEl) titleEl.textContent = questionData.question || 'Que faire ?';
    
    const choicesDiv = document.getElementById('soloAnswerChoices');
    if (!choicesDiv) return;
    
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
        this.state.voteComponents[letter] = new VoteComponent(choiceContainer, {
          letter: letter,
          text: choice,
          count: 0,
          totalVotes: 0,
          isClickable: true,
          showVoters: false,
          onVote: (selectedLetter) => this.submitAnswer(
            questionData.id, 
            selectedLetter, 
            questionData.nextQuestions[selectedLetter]
          )
        });
      } else {
        // Fallback sans VoteComponent
        this.createSimpleChoice(choiceContainer, letter, choice, questionData);
      }
    });
    
    document.getElementById('soloAnswerStatus').textContent = '';
    this.showElement('soloShowAnswersBtn');
  }
  
  createSimpleChoice(container, letter, text, questionData) {
    const button = document.createElement('button');
    button.className = 'solo-answer-button';
    button.innerHTML = `
      <span class="answer-letter">${letter}</span>
      <span class="answer-text">${text}</span>
    `;
    button.onclick = () => this.submitAnswer(
      questionData.id, 
      letter, 
      questionData.nextQuestions[letter]
    );
    container.appendChild(button);
  }
  
  handleContinueQuestion(questionData) {
    console.log('Question Continue:', questionData.id);
    
    document.getElementById('soloQuestionTitle').textContent = 'Cliquez pour continuer';
    
    const choicesDiv = document.getElementById('soloAnswerChoices');
    if (!choicesDiv) return;
    
    choicesDiv.innerHTML = '';
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'button button-primary continue-button';
    continueBtn.innerHTML = `
      <span>${questionData.choices[0] || 'Continuer'}</span>
      <span class="arrow">→</span>
    `;
    
    continueBtn.onclick = () => {
      if (questionData.nextQuestions && questionData.nextQuestions.A) {
        this.socket.emit('choose-next-question', { 
          nextQuestionId: questionData.nextQuestions.A 
        });
      }
      
      continueBtn.classList.add('clicked');
      continueBtn.disabled = true;
      
      document.getElementById('soloAnswerStatus').textContent = '✅ Suite de l\'histoire...';
      this.hideAnswerPanel();
      this.showElement('soloWaitingMessage');
    };
    
    choicesDiv.appendChild(continueBtn);
    this.showElement('soloShowAnswersBtn');
  }
  
  submitAnswer(questionId, answer, nextQuestionId) {
    if (this.state.hasVoted) return;
    
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
    
    document.getElementById('soloAnswerStatus').textContent = '✅ Choix enregistré !';
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
  
  async displayMessengerConversation(conversation) {
    const messengerDiv = document.getElementById('soloMessengerView');
    if (!messengerDiv) return;
    
    messengerDiv.innerHTML = '<div class="messenger-messages"></div>';
    
    const messages = conversation.messages.map(message => {
      const participant = conversation.participants.find(p => p.id === message.sender);
      return {
        sender: participant.name,
        avatar: message.avatar || participant.avatar,
        content: message.content,
        isCurrentUser: participant.isCurrentUser
      };
    });
    
    await this.animateMessages(messages);
  }
  
  async animateMessages(messages) {
    const container = document.querySelector('#soloMessengerView .messenger-messages');
    if (!container) return;
    
    for (const message of messages) {
      // Indicateur de frappe (si présent)
      const typingIndicator = document.querySelector('#soloMessengerView .typing-indicator');
      if (typingIndicator) {
        typingIndicator.classList.remove('hidden');
        await this.sleep(300 + Math.random() * 200);
        typingIndicator.classList.add('hidden');
      }
      
      const messageDiv = this.createMessageElement(message);
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = 'translateY(20px) scale(0.9)';
      container.appendChild(messageDiv);
      
      await this.sleep(50);
      messageDiv.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      messageDiv.style.opacity = '1';
      messageDiv.style.transform = 'translateY(0) scale(1)';
      
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
      
      await this.sleep(400);
    }
  }
  
  createMessageElement(message) {
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
      await this.sleep(3000);
      
      this.showNotification('🎉 Félicitations ! Vous avez terminé le scénario', 'success', 4000);
      await this.sleep(2000);
    }
    
    this.prepareEndScreen();
    this.showEndScreen();
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
    
    return {
      questionCount,
      themes: Array.from(themes),
      responses,
      duration
    };
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
    if (!keyChoicesContainer || Object.keys(responses).length === 0) return;
    
    keyChoicesContainer.innerHTML = '';
    
    const responseEntries = Object.entries(responses);
    const keyChoices = responseEntries.slice(-3);
    
    keyChoices.forEach(([questionId, answer]) => {
      const question = this.config.scenario?.questions?.[questionId];
      if (question) {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'key-choice-item';
        
        const choiceIndex = answer.charCodeAt(0) - 65;
        const choiceText = question.choices?.[choiceIndex] || answer;
        
        choiceDiv.innerHTML = `
          <div>
            <strong>${question.question || 'Question'}</strong><br>
            <span>→ ${choiceText}</span>
          </div>
        `;
        keyChoicesContainer.appendChild(choiceDiv);
      }
    });
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
    
    window.location.href = '/menu.html?return=game';
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
    if (el) el.classList.remove('hidden');
  }
  
  hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  showNotification(message, type = 'info', duration = 3000) {
    // Utiliser la fonction globale si elle existe
    if (typeof showNotification === 'function') {
      showNotification(message, type, duration);
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
      console.log('Lobby solo créé:', scenarioTitle);
      this.config.scenario = scenarioData;
      
      // Démarrer automatiquement
      setTimeout(() => {
        this.socket.emit('start-game');
      }, 500);
    });
    
    // Partie démarrée
    this.socket.on('game-start', () => {
      console.log('🎮 Partie solo démarrée');
    });
    
    // Question reçue
    this.socket.on('question', (questionData) => {
      console.log('Question reçue:', questionData);
      this.displayQuestion(questionData);
    });
    
    // Fin de partie
    this.socket.on('game-over', () => {
      console.log('🏁 Fin de partie solo');
      // La fin est gérée par handleScenarioEnd
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
  window.soloGameManager.initialize(socket, scenarioFile, level);
  window.soloGameManager.handleSocketEvents();
};

console.log('📱 Solo Mode Manager chargé avec succès');