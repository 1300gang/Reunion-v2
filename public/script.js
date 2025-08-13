const socket = io();
let currentMode = 'home';
let currentLobby = '';
let playerName = '';
let currentQuestion = null;
let allPlayers = [];
let votedPlayers = new Set();
let playerLink = '';
let voteComponents = {};
let hasVoted = false;
let chaptersMenu = null; // Instance du menu chapitres
let scenario = null; // Stockage du scénario
let responses = {}; // Stockage des réponses pour le menu

// === UTILITAIRES ===
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function playNotificationSound() {
  // Placeholder pour le son de notification
}

// Fonction pour vérifier si c'est une question "Continuer"
function isContinueQuestion(questionData) {
  return questionData && 
         questionData.choices && 
         questionData.choices.length === 1 && 
         (questionData.choices[0].toLowerCase() === 'continuer' || 
          questionData.question === '' ||
          questionData.question === null);
}

// Fonction pour afficher des notifications
function showNotification(message, duration = 3000) {
  let notif = document.getElementById('notification-toast');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'notification-toast';
    notif.className = 'notification-toast';
    document.body.appendChild(notif);
  }
  
  notif.textContent = message;
  notif.classList.add('show');
  
  setTimeout(() => {
    notif.classList.remove('show');
  }, duration);
}

async function animateMessages(messages) {
  const container = document.querySelector('.messenger-messages');
  const typingIndicator = document.querySelector('.typing-indicator');
  
  for (let i = 0; i < messages.length; i++) {
    showElement('typing-indicator');
    await sleep(300);
    hideElement('typing-indicator');
    
    const messageDiv = createMessageElement(messages[i]);
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px)';
    container.appendChild(messageDiv);
    
    await sleep(50);
    messageDiv.style.transition = 'all 0.3s ease-out';
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateY(0)';
    
    container.scrollTop = container.scrollHeight;
    playNotificationSound();
    await sleep(500);
  }
}

function createMessageElement(message) {
  const messageDiv = document.createElement('div');
  const isCurrentUser = message.isCurrentUser || false;
  messageDiv.className = `message ${isCurrentUser ? 'message-right' : 'message-left'}`;
  
  const isImageAvatar = message.avatar && (
    message.avatar.startsWith('http') || 
    message.avatar.startsWith('/') || 
    message.avatar.includes('.jpg') || 
    message.avatar.includes('.png') || 
    message.avatar.includes('.gif') ||
    message.avatar.includes('.svg')
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

function updatePendingPlayers() {
  const pending = allPlayers.filter(p => !votedPlayers.has(p));
  const pendingText = pending.length > 0 ? pending.join(', ') : 'Tous ont voté !';
  
  const pendingEl = document.getElementById('pendingPlayersGame');
  if (pendingEl) pendingEl.textContent = pendingText;
  
  const waitingDiv = document.getElementById('waitingForVotesGame');
  if (waitingDiv) {
    if (pending.length > 0) {
      showElement('waitingForVotesGame');
    } else {
      hideElement('waitingForVotesGame');
    }
  }
}

function generateQRCode(text) {
  const qrCodeElement = document.getElementById('qrcode');
  qrCodeElement.innerHTML = '';
  
  try {
    if (typeof QRious !== 'undefined') {
      const canvas = document.createElement('canvas');
      const qr = new QRious({
        element: canvas,
        value: text,
        size: 200,
        foreground: '#FF6B6B',
        background: '#ffffff'
      });
      
      qrCodeElement.appendChild(canvas);
    }
  } catch (e) {
    console.error('Erreur QR Code:', e);
  }
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', function() {
  initializeEventListeners();
  checkUrlParameters();
  
  if (!window.location.search.includes('lobby')) {
    currentMode = 'intervenant';
    showScreen('intervenant-screen');
  }
});

function initializeEventListeners() {
  // Intervenant
  document.getElementById('createLobbyBtn').onclick = createLobby;
  document.getElementById('copyLinkBtn').onclick = copyPlayerLink;
  document.getElementById('startGameBtn').onclick = startGame;
  document.getElementById('endGameBtn').onclick = endGame;
  document.getElementById('generateCsvBtn').onclick = generateCsv;
  document.getElementById('finalDownloadCsvBtn').onclick = () => {
    const existingLink = document.getElementById('csvDownloadLink');
    if (existingLink && existingLink.href) {
      existingLink.click();
    } else {
      generateCsv();
    }
  };
  document.getElementById('sendResultsBtn').onclick = sendResults;
  document.getElementById('newSessionBtn').onclick = () => location.reload();

  // Joueur
  document.getElementById('joinLobbyBtn').onclick = joinLobby;
  document.getElementById('playerInfoForm').onsubmit = submitPlayerInfo;
  document.getElementById('randomFillBtn').onclick = fillRandomInfo;
  document.getElementById('backToHomeBtn').onclick = backToHome;
  document.getElementById('showAnswersBtn').onclick = showAnswerPanel;
  document.getElementById('closeAnswersBtn').onclick = hideAnswerPanel;
  document.getElementById('sendFeedbackBtn').onclick = sendPlayerFeedback;
}

function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const lobbyFromUrl = urlParams.get('lobby');
  if (lobbyFromUrl) {
    currentMode = 'player';
    showScreen('player-screen');
    document.getElementById('lobbyCodeInput').value = lobbyFromUrl;
    hideElement('player-join');
    showElement('player-info');
    currentLobby = lobbyFromUrl;
    socket.emit('join-lobby', { lobbyName: lobbyFromUrl });
  } else {
    showElement('player-join');
    hideElement('player-info');
  }
}

// === FONCTIONS INTERVENANT ===
function createLobby() {
  const lobbyName = document.getElementById('lobbyNameInput').value.trim();
  if (lobbyName) {
    currentLobby = lobbyName;
    socket.emit('create-lobby', lobbyName);
  } else {
    alert('Veuillez entrer un nom de partie');
  }
}

function copyPlayerLink() {
  if (!playerLink) {
    alert('Aucun lien à copier');
    return;
  }
  
  navigator.clipboard.writeText(playerLink).then(() => {
    const btn = document.getElementById('copyLinkBtn');
    btn.textContent = '✓ Copié !';
    setTimeout(() => {
      btn.textContent = '📋 Copier le lien';
    }, 2000);
  }).catch(() => {
    const textArea = document.createElement('textarea');
    textArea.value = playerLink;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    const btn = document.getElementById('copyLinkBtn');
    btn.textContent = '✓ Copié !';
    setTimeout(() => {
      btn.textContent = '📋 Copier le lien';
    }, 2000);
  });
}

function startGame() {
  console.log('Tentative de démarrage de la partie...');
  socket.emit('start-game');
  
  // Remplacer l'image-container par le menu des chapitres
  const imageContainer = document.querySelector('.image-container');
  if (imageContainer && scenario) {
    chaptersMenu = new ChaptersMenu(imageContainer, {
      scenario: scenario,
      currentQuestion: null,
      responses: responses[currentLobby] || {},
      questionPath: []
    });
  }
  
  hideElement('qr-overlay');
}

function sendResults() {
  alert('Fonction d\'envoi par email à implémenter');
}

function sendPlayerFeedback() {
  const feedback = document.getElementById('playerFeedback').value;
  if (feedback.trim()) {
    socket.emit('player-feedback', { feedback });
    alert('Merci pour votre feedback !');
    document.getElementById('playerFeedback').value = '';
  }
}

function endGame() {
  if (confirm('Êtes-vous sûr de vouloir terminer la partie ?')) {
    socket.emit('end-game');
  }
}

function generateCsv() {
  socket.emit('generate-csv');
}

function displayQuestion(questionData) {
  currentQuestion = questionData;
  
  if (currentMode === 'intervenant') {
    // Mettre à jour le menu des chapitres
    if (chaptersMenu) {
      chaptersMenu.update({
        currentQuestion: questionData.id,
        responses: responses[currentLobby] || {},
        questionPath: questionData.questionPath || []
      });
    }
    
    // Gérer les questions "Continuer" automatiquement côté MJ
    if (questionData.isContinue || isContinueQuestion(questionData)) {
      console.log('Question Continue détectée côté MJ:', questionData.id);
      
      // Afficher brièvement le contexte si présent
      if (questionData.context) {
        showNotification(`📍 ${questionData.context}`, 2000);
      }
      
      // Passer automatiquement à la question suivante après un court délai
      if (questionData.nextQuestions && questionData.nextQuestions.A) {
        setTimeout(() => {
          socket.emit('gm-auto-continue', { 
            currentQuestionId: questionData.id,
            nextQuestionId: questionData.nextQuestions.A 
          });
        }, 15000); // Délai de 1.5s pour laisser le temps de voir le contexte
      }
      return;
    }
    
    // Question normale avec votes
    hideElement('qr-overlay');
    hideElement('participants-section');
    hideElement('startGameBtn');
    showElement('game-control');
    
    document.getElementById('lobbyNameGame').textContent = currentLobby;
    
    // Réinitialiser les votes
    votedPlayers.clear();
    updatePendingPlayers();
    
    // Afficher l'image contextuelle
    if (questionData.contextual_image) {
      document.getElementById('questionImage').src = questionData.contextual_image;
    }
    
    // Afficher le contexte et la question
    document.getElementById('questionContext').textContent = questionData.context || '';
    document.getElementById('questionTitle').textContent = questionData.question;
    
    // Créer les options de vote
    const votingDiv = document.getElementById('votingOptions');
    votingDiv.innerHTML = '';
    voteComponents = {};
    
    questionData.choices.forEach((choice, index) => {
      const letter = String.fromCharCode(65 + index);
      const optionDiv = document.createElement('div');
      optionDiv.className = 'voting-option';
      optionDiv.id = `voting-option-${letter}`;
      
      votingDiv.appendChild(optionDiv);
      
      voteComponents[letter] = new VoteComponent(optionDiv, {
        letter: letter,
        text: choice,
        count: 0,
        totalVotes: 0,
        voters: [],
        isClickable: true,
        showVoters: true,
        nextQuestionId: questionData.nextQuestions ? questionData.nextQuestions[letter] : null,
        onVote: (nextQuestionId) => confirmNextQuestion(nextQuestionId)
      });
    });
  }
}

function confirmNextQuestion(nextQuestionId) {
  if (confirm('Passer à la question suivante ?')) {
    socket.emit('choose-next-question', { nextQuestionId });
  }
}

function updateVotes(voteData) {
  const { voteCounts, voteDetails, playerName: votingPlayer } = voteData;
  
  if (votingPlayer) {
    votedPlayers.add(votingPlayer);
    updatePendingPlayers();
  }
  
  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  
  Object.keys(voteComponents).forEach(letter => {
    if (voteComponents[letter]) {
      voteComponents[letter].update({
        count: voteCounts[letter] || 0,
        totalVotes: totalVotes,
        voters: voteDetails[letter] || []
      });
    }
  });
}

// === FONCTIONS JOUEUR ===
function joinLobby() {
  const lobby = document.getElementById('lobbyCodeInput').value.trim();
  
  if (!lobby) {
    alert('Veuillez entrer le code de la partie');
    return;
  }
  
  currentLobby = lobby;
  socket.emit('join-lobby', { lobbyName: lobby });
}

function submitPlayerInfo(e) {
  e.preventDefault();
  
  const info = {
    prenom: document.getElementById('playerPrenom').value.trim(),
    age: document.getElementById('playerAge').value,
    genre: document.getElementById('playerGenre').value,
    ecole: document.getElementById('playerEcole').value.trim()
  };
  
  playerName = info.prenom;
  socket.emit('player-info', info);
}

function fillRandomInfo() {
  const prenoms = ['Alex', 'Jordan', 'Charlie', 'Sam', 'Robin', 'Casey', 'Taylor', 'Morgan'];
  const ecoles = ['Lycée Victor Hugo', 'Collège Jean Moulin', 'Lycée Saint-Exupéry', 'Collège Simone Veil'];
  
  document.getElementById('playerPrenom').value = prenoms[Math.floor(Math.random() * prenoms.length)];
  document.getElementById('playerAge').value = Math.floor(Math.random() * 8) + 12;
  document.getElementById('playerGenre').value = ['Fille', 'Garçon', 'Autre'][Math.floor(Math.random() * 3)];
  document.getElementById('playerEcole').value = ecoles[Math.floor(Math.random() * ecoles.length)];
}

async function displayPlayerQuestion(questionData) {
  currentQuestion = questionData;
  hasVoted = false;
  
  hideAnswerPanel();
  hideElement('waitingMessage');
  
  // Afficher l'image contextuelle
  if (questionData.contextual_image) {
    document.getElementById('playerContextImage').src = questionData.contextual_image;
  }
  
  // Afficher le contexte
  const contextDiv = document.getElementById('playerQuestionContext');
  if (questionData.context) {
    contextDiv.textContent = questionData.context;
    showElement('playerQuestionContext');
  } else {
    hideElement('playerQuestionContext');
  }
  
  // Afficher la conversation messenger si présente
  if (questionData.type === 'messenger_scenario' && questionData.conversation) {
    await displayMessengerConversation(questionData.conversation);
    showElement('messengerView');
  } else {
    hideElement('messengerView');
  }
  
  // Gérer les questions "Continuer"
  if (questionData.isContinue || isContinueQuestion(questionData)) {
    console.log('Question Continue détectée côté joueur:', questionData.id);
    
    // Créer un bouton de continuation simple
    document.getElementById('playerQuestionTitle').textContent = 'Cliquez pour continuer';
    
    const choicesDiv = document.getElementById('answerChoices');
    choicesDiv.innerHTML = '';
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'button button-primary continue-button';
    continueBtn.innerHTML = `
      <span>${questionData.choices[0] || 'Continuer'}</span>
      <span class="arrow">→</span>
    `;
    continueBtn.onclick = () => handlePlayerContinue(questionData);
    choicesDiv.appendChild(continueBtn);
    
    // Pas besoin d'attendre les autres joueurs
    hideElement('waitingMessage');
    showElement('showAnswersBtn');
    return;
  }
  
  // Question normale avec choix multiples
  document.getElementById('playerQuestionTitle').textContent = questionData.question || 'Que faire ?';
  
  const choicesDiv = document.getElementById('answerChoices');
  choicesDiv.innerHTML = '';
  voteComponents = {};
  
  questionData.choices.forEach((choice, index) => {
    const letter = String.fromCharCode(65 + index);
    const choiceContainer = document.createElement('div');
    choiceContainer.className = 'answer-choice-container';
    choiceContainer.id = `answer-choice-${letter}`;
    
    choicesDiv.appendChild(choiceContainer);
    
    voteComponents[letter] = new VoteComponent(choiceContainer, {
      letter: letter,
      text: choice,
      count: 0,
      totalVotes: 0,
      isClickable: true,
      showVoters: false,
      onVote: (selectedLetter) => submitAnswer(questionData.id, selectedLetter)
    });
  });
  
  document.getElementById('answerStatus').textContent = '';
  showElement('showAnswersBtn');
}

// Nouvelle fonction pour gérer la continuation côté joueur
async function handlePlayerContinue(questionData) {
  console.log('Joueur continue depuis:', questionData.id);
  
  // Envoyer la confirmation de continuation
  socket.emit('player-answer', { 
    questionId: questionData.id, 
    answer: 'continue' 
  });
  
  // Feedback visuel
  document.getElementById('answerStatus').textContent = '✅ Suite de l\'histoire...';
  
  // Animation de transition
  const continueBtn = document.querySelector('.continue-button');
  if (continueBtn) {
    continueBtn.classList.add('clicked');
    continueBtn.disabled = true;
  }
  
  // Masquer le panneau de réponses
  hideAnswerPanel();
  
  // Attendre la prochaine question du serveur
  showElement('waitingMessage');
  const waitingEl = document.querySelector('.waiting-message-panel');
  if (waitingEl) {
    waitingEl.textContent = '⏳ Chargement de la suite...';
  }
}

async function displayMessengerConversation(conversation) {
  const messengerDiv = document.getElementById('messengerView');
  messengerDiv.innerHTML = '<div class="messenger-messages"></div>';
  const messagesContainer = messengerDiv.querySelector('.messenger-messages');
  
  const messages = conversation.messages.map(message => {
    const participant = conversation.participants.find(p => p.id === message.sender);
    return {
      sender: participant.name,
      avatar: message.avatar || participant.avatar,
      content: message.content,
      isCurrentUser: participant.isCurrentUser
    };
  });
  
  await animateMessages(messages);
}

function submitAnswer(questionId, answer) {
  if (hasVoted) return;
  
  hasVoted = true;
  socket.emit('player-answer', { questionId, answer });
  
  Object.values(voteComponents).forEach(component => {
    component.disable();
  });
  
  if (voteComponents[answer]) {
    voteComponents[answer].showVoteAnimation();
    voteComponents[answer].update({
      count: 1,
      totalVotes: 1
    });
  }
  
  document.getElementById('answerStatus').textContent = '✅ Réponse enregistrée !';
  
  const waitingInPanel = document.querySelector('.waiting-message-panel');
  if (waitingInPanel) {
    waitingInPanel.classList.remove('hidden');
  }
}

function showAnswerPanel() {
  document.getElementById('answerPanel').classList.add('show');
  document.getElementById('showAnswersBtn').style.display = 'none';
}

function hideAnswerPanel() {
  document.getElementById('answerPanel').classList.remove('show');
  document.getElementById('showAnswersBtn').style.display = 'block';
}

function backToHome() {
  window.location.href = window.location.origin + window.location.pathname;
}

// === ÉVÉNEMENTS SOCKET ===

// Intervenant
socket.on('lobby-created', ({ lobbyName, scenarioTitle, scenarioData }) => {
  hideElement('intervenant-creation');
  showElement('intervenant-lobby');
  
  // Stocker le scénario si fourni
  if (scenarioData) {
    scenario = scenarioData;
  }
  
  document.getElementById('lobbyNameDisplay').textContent = lobbyName;
  document.getElementById('lobbyNameGame').textContent = lobbyName;
  document.getElementById('lobbyNameEnd').textContent = lobbyName;
  
  playerLink = `${window.location.origin}?lobby=${lobbyName}`;
  generateQRCode(playerLink);
  
  updateStartButton();
});

socket.on('player-joined', ({ playerName, playerCount }) => {
  const playersDiv = document.getElementById('playersList');
  const pill = document.createElement('span');
  pill.className = 'player-pill';
  pill.id = `pill-${playerName}`;
  pill.textContent = playerName;
  playersDiv.appendChild(pill);
  
  allPlayers.push(playerName);
  
  document.getElementById('playerCount').textContent = playerCount;
  updateStartButton();
});

socket.on('player-left', ({ playerName, playerCount }) => {
  const pill = document.getElementById(`pill-${playerName}`);
  if (pill) pill.remove();
  
  allPlayers = allPlayers.filter(p => p !== playerName);
  votedPlayers.delete(playerName);
  
  document.getElementById('playerCount').textContent = playerCount;
  updateStartButton();
  updatePendingPlayers();
});

socket.on('player-continued', ({ playerName, questionId }) => {
  console.log(`${playerName} a continué depuis ${questionId}`);
  
  if (currentMode === 'intervenant') {
    showNotification(`✅ ${playerName} continue`, 1000);
  }
});

function updateStartButton() {
  const btn = document.getElementById('startGameBtn');
  const count = parseInt(document.getElementById('playerCount').textContent);
  
  if (count >= 2) {
    btn.disabled = false;
    hideElement('minPlayersText');
  } else {
    btn.disabled = true;
    showElement('minPlayersText');
  }
}

socket.on('vote-update', (voteData) => {
  console.log('Vote update reçu:', voteData);
  
  if (currentMode === 'intervenant') {
    updateVotes(voteData);
  }
  
  if (currentMode === 'player' && hasVoted) {
    const { voteCounts, voteDetails } = voteData;
    const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
    
    console.log('Mise à jour joueur - Total votes:', totalVotes, 'Counts:', voteCounts);
    
    Object.keys(voteComponents).forEach(letter => {
      if (voteComponents[letter]) {
        voteComponents[letter].update({
          count: voteCounts[letter] || 0,
          totalVotes: totalVotes
        });
      }
    });
  }
});

socket.on('question', (questionData) => {
  console.log('Question reçue:', questionData);
  
  // Ajouter le flag isContinue si pas présent
  if (!questionData.hasOwnProperty('isContinue')) {
    questionData.isContinue = isContinueQuestion(questionData);
  }
  
  if (currentMode === 'intervenant') {
    displayQuestion(questionData);
  } else if (currentMode === 'player') {
    hideElement('player-waiting');
    showElement('player-game');
    displayPlayerQuestion(questionData);
  }
});

socket.on('question-path-update', ({ questionPath }) => {
  if (chaptersMenu && currentMode === 'intervenant') {
    chaptersMenu.update({
      questionPath: questionPath
    });
  }
});

socket.on('csv-ready', (filename) => {
  const link = document.getElementById('csvDownloadLink');
  link.href = '/exports/' + filename;
  link.download = filename;
  showElement('csvDownloadLink');
  
  if (!document.getElementById('game-over-gm').classList.contains('hidden')) {
    link.click();
  }
});

// Joueur
socket.on('request-player-info', () => {
  hideElement('player-join');
  showElement('player-info');
  document.getElementById('playerLobbyName').textContent = currentLobby;
});

socket.on('joined-lobby', ({ scenarioTitle }) => {
  hideElement('player-info');
  showElement('player-waiting');
  document.getElementById('waitingLobbyName').textContent = currentLobby;
  document.getElementById('gameLobbyName').textContent = currentLobby;
});

socket.on('game-start', () => {
  console.log('Événement game-start reçu, mode:', currentMode);
  
  if (currentMode === 'player') {
    hideElement('player-waiting');
    showElement('player-game');
  } else if (currentMode === 'intervenant') {
    console.log('Partie démarrée côté intervenant');
  }
});

socket.on('answer-recorded', () => {
  // Confirmation visuelle déjà gérée dans submitAnswer
});

socket.on('game-over', () => {
  if (currentMode === 'player') {
    hideElement('player-game');
    showElement('player-game-over');
  } else if (currentMode === 'intervenant') {
    hideElement('game-control');
    showElement('game-over-gm');
    
    const difficultyDiv = document.getElementById('difficultyPoints');
    difficultyDiv.innerHTML = `
      <p>• Question 3 : Temps de réponse moyen élevé (possible hésitation)</p>
      <p>• Question 5 : Réponses très partagées entre les options</p>
    `;
  }
});

socket.on('lobby-closed', () => {
  alert('La partie a été fermée par l\'intervenant.');
  window.location.href = window.location.origin + window.location.pathname;
});

socket.on('error', (message) => {
  console.error('Erreur socket:', message);
  alert('❌ ' + message);
});

socket.on('connect', () => {
  console.log('✅ Connecté au serveur');
});

socket.on('disconnect', () => {
  console.log('❌ Déconnecté du serveur');
});

// === AMÉLIORATIONS À AJOUTER DANS script.js ===

// Fonction pour ajouter des effets de particules sur les votes
function createVoteParticles(element) {
  const particles = 5;
  const container = element.closest('.voting-option') || element;
  
  for (let i = 0; i < particles; i++) {
    const particle = document.createElement('div');
    particle.className = 'vote-particle';
    particle.style.cssText = `
      position: absolute;
      width: 6px;
      height: 6px;
      background: var(--couleur-jaunePeps);
      border-radius: 50%;
      opacity: 0.8;
      pointer-events: none;
      z-index: 100;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    
    container.appendChild(particle);
    
    // Animation de dispersion
    const angle = (360 / particles) * i;
    const distance = 50 + Math.random() * 30;
    
    particle.animate([
      { 
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 0.8
      },
      {
        transform: `translate(
          calc(-50% + ${Math.cos(angle * Math.PI / 180) * distance}px),
          calc(-50% + ${Math.sin(angle * Math.PI / 180) * distance}px)
        ) scale(0)`,
        opacity: 0
      }
    ], {
      duration: 800,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });
    
    // Nettoyer après l'animation
    setTimeout(() => particle.remove(), 800);
  }
}

// Animation de progression fluide pour les jauges
function animateProgressBar(element, targetWidth, duration = 800) {
  const startWidth = parseFloat(element.style.width) || 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing cubic-bezier
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentWidth = startWidth + (targetWidth - startWidth) * easeProgress;
    
    element.style.width = `${currentWidth}%`;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Ajouter un effet de brillance à la fin
      element.classList.add('shine-effect');
      setTimeout(() => element.classList.remove('shine-effect'), 1000);
    }
  }
  
  requestAnimationFrame(update);
}

// Effet de papier froissé au survol des cards
function addPaperEffect(element) {
  element.addEventListener('mouseenter', function() {
    this.style.transform = `
      perspective(1000px) 
      rotateX(${Math.random() * 2 - 1}deg) 
      rotateY(${Math.random() * 2 - 1}deg)
      translateY(-2px)
    `;
  });
  
  element.addEventListener('mouseleave', function() {
    this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
  });
}

// Initialiser les effets papier sur toutes les cards
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.card').forEach(card => {
    addPaperEffect(card);
  });
  
  // Ajouter des transitions douces aux changements de vue
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  });
});

// Animation de notification améliorée avec texture
function showNotificationEnhanced(message, duration = 3000, type = 'info') {
  let notif = document.getElementById('notification-toast');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'notification-toast';
    notif.className = 'notification-toast';
    document.body.appendChild(notif);
  }
  
  // Ajouter une classe selon le type
  notif.className = `notification-toast notification-${type}`;
  
  // Ajouter l'icône selon le type
  const icons = {
    'info': '📍',
    'success': '✅',
    'warning': '⚠️',
    'error': '❌'
  };
  
  notif.innerHTML = `
    <span class="notification-icon">${icons[type] || icons.info}</span>
    <span class="notification-text">${message}</span>
  `;
  
  // Animation d'entrée
  notif.style.animation = 'slideInDown 0.3s ease-out forwards';
  notif.classList.add('show');
  
  setTimeout(() => {
    notif.style.animation = 'slideOutUp 0.3s ease-out forwards';
    setTimeout(() => {
      notif.classList.remove('show');
    }, 300);
  }, duration);
}

// Remplacer la fonction showNotification existante
window.showNotification = showNotificationEnhanced;

// Animation des avatars dans le messenger
function animateAvatar(avatarElement) {
  avatarElement.animate([
    { transform: 'scale(0) rotate(-180deg)', opacity: 0 },
    { transform: 'scale(1.1) rotate(10deg)', opacity: 1 },
    { transform: 'scale(1) rotate(0deg)', opacity: 1 }
  ], {
    duration: 500,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    fill: 'forwards'
  });
}

// Améliorer l'animation des messages
async function animateMessagesEnhanced(messages) {
  const container = document.querySelector('.messenger-messages');
  const typingIndicator = document.querySelector('.typing-indicator');
  
  for (let i = 0; i < messages.length; i++) {
    // Indicateur de frappe amélioré
    if (typingIndicator) {
      typingIndicator.classList.add('active');
      showElement('typing-indicator');
    }
    
    await sleep(300 + Math.random() * 200); // Variation naturelle
    
    if (typingIndicator) {
      typingIndicator.classList.remove('active');
      hideElement('typing-indicator');
    }
    
    const messageDiv = createMessageElement(messages[i]);
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px) scale(0.9)';
    container.appendChild(messageDiv);
    
    // Animer l'avatar
    const avatar = messageDiv.querySelector('.message-avatar');
    if (avatar) {
      animateAvatar(avatar);
    }
    
    // Animation du message
    await sleep(50);
    messageDiv.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateY(0) scale(1)';
    
    // Son de notification subtil
    playNotificationSound();
    
    // Scroll fluide
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    await sleep(400 + Math.random() * 100);
  }
}

// Remplacer la fonction animateMessages existante
window.animateMessages = animateMessagesEnhanced;

// Effet de survol pour les boutons de vote
function enhanceVoteButtons() {
  document.querySelectorAll('.answer-button, .voting-option').forEach(button => {
    button.addEventListener('mouseenter', function() {
      this.style.setProperty('--hover-offset', Math.random() * 10 - 5 + 'deg');
    });
    
    button.addEventListener('click', function(e) {
      // Créer un effet de ripple
      const ripple = document.createElement('div');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: rgba(233, 188, 64, 0.4);
        transform: translate(${x}px, ${y}px) scale(0);
        pointer-events: none;
        z-index: 100;
      `;
      
      this.appendChild(ripple);
      
      ripple.animate([
        { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 1 },
        { transform: `translate(${x}px, ${y}px) scale(4)`, opacity: 0 }
      ], {
        duration: 600,
        easing: 'ease-out',
        fill: 'forwards'
      });
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

// Initialiser les améliorations au chargement
document.addEventListener('DOMContentLoaded', function() {
  enhanceVoteButtons();
  
  // Observer pour les nouveaux éléments dynamiques
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        setTimeout(enhanceVoteButtons, 100);
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

// CSS supplémentaire pour les animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideInDown {
    from {
      transform: translateX(-50%) translateY(-100px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutUp {
    from {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    to {
      transform: translateX(-50%) translateY(-100px);
      opacity: 0;
    }
  }
  
  .notification-toast {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .notification-icon {
    font-size: 1.2rem;
  }
  
  .notification-success {
    background: var(--couleur-grisBleuClair);
    color: var(--couleur-noirVolcan);
  }
  
  .notification-warning {
    background: var(--couleur-jaunePeps);
    color: var(--couleur-noirVolcan);
  }
  
  .notification-error {
    background: #e74c3c;
    color: white;
  }
  
  .typing-indicator.active span {
    animation: typingBounce 1.4s infinite;
  }
  
  .typing-indicator.active span:nth-child(1) {
    animation-delay: 0s;
  }
  
  .typing-indicator.active span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-indicator.active span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes typingBounce {
    0%, 60%, 100% {
      transform: translateY(0);
      background: var(--couleur-grisFonce);
    }
    30% {
      transform: translateY(-10px);
      background: var(--couleur-jaunePeps);
    }
  }
  
  .shine-effect {
    position: relative;
    overflow: hidden;
  }
  
  .shine-effect::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.5) 50%,
      transparent 70%
    );
    animation: shine 0.5s ease-out;
  }
  
  @keyframes shine {
    from {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    to {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }
`;
document.head.appendChild(styleSheet);