const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// État global
const lobbies = {};
const responses = {};
const playerData = {};
const fileAccess = {};

// Charger le scénario au démarrage
let scenario = null;
const SCENARIO_FILE = 'scenario_lgbtqia_V2.json';

async function loadScenario() {
  try {
    const data = await fs.readFile(path.join(__dirname, 'public', SCENARIO_FILE), 'utf-8');
    scenario = JSON.parse(data);
    console.log(`Scénario chargé: ${scenario.scenario_info.title}`);
  } catch (error) {
    console.error('Erreur chargement scénario:', error);
    process.exit(1);
  }
}

// === CONFIGURATION SÉCURISÉE ===
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "https://api.qrserver.com", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes, réessayez plus tard'
});

app.use(limiter);
app.use(express.static(path.join(__dirname, 'public')));

// === FONCTIONS UTILITAIRES ===
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  return validator.escape(input.trim()).substring(0, 50);
}

function isValidLobbyName(name) {
  return /^[a-zA-Z0-9\s\-_éèêëàâäôöûüçÉÈÊËÀÂÄÔÖÛÜÇ]{1,30}$/.test(name);
}

function isValidPlayerName(name) {
  return /^[a-zA-Z0-9\s\-_éèêëàâäôöûüçÉÈÊËÀÂÄÔÖÛÜÇ]{1,20}$/.test(name);
}

function generateSecureFilename(lobbyName) {
  const hash = crypto.randomBytes(8).toString('hex');
  const sanitizedLobby = lobbyName.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `results_${sanitizedLobby}_${timestamp}_${hash}.csv`;
}

function getQuestion(questionId) {
  if (!scenario) {
    console.error('Scénario non chargé !');
    return null;
  }
  
  if (!scenario.questions || !scenario.questions[questionId]) {
    console.warn(`Question non trouvée: ${questionId}`);
    console.log('Questions disponibles:', scenario.questions ? Object.keys(scenario.questions) : 'aucune');
    return null;
  }
  
  return scenario.questions[questionId];
}

// Fonction améliorée pour vérifier si c'est une question "Continuer"
function isContinueQuestion(questionData) {
  return questionData && 
         questionData.choices && 
         questionData.choices.length === 1 && 
         (questionData.choices[0].toLowerCase() === 'continuer' || 
          questionData.question === '' ||
          questionData.question === null);
}

function getThemesForPath(questionPath) {
  const themes = new Set();
  questionPath.forEach(questionId => {
    const question = getQuestion(questionId);
    if (question && question.metadata && question.metadata.themes_abordes) {
      question.metadata.themes_abordes.forEach(theme => themes.add(theme));
    }
  });
  return Array.from(themes);
}

// === GESTION DES EXPORTS CSV ===
app.get('/exports/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  if (!/^results_[a-zA-Z0-9_\-]+\.csv$/.test(filename)) {
    return res.status(400).send('Nom de fichier invalide');
  }
  
  const filePath = path.join(__dirname, 'exports', filename);
  
  if (!fileAccess[filename]) {
    return res.status(403).send('Accès non autorisé');
  }
  
  try {
    await fs.access(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
    
    setTimeout(async () => {
      try {
        await fs.unlink(filePath);
        delete fileAccess[filename];
      } catch (e) {
        console.error('Erreur suppression fichier:', e);
      }
    }, 60000);
  } catch (error) {
    res.status(404).send('Fichier non trouvé');
  }
});

// === GESTION SOCKET.IO ===
io.on('connection', (socket) => {
  console.log(`Nouvelle connexion: ${socket.id}`);

  socket.on('create-lobby', (lobbyName) => {
    const sanitizedLobbyName = sanitizeInput(lobbyName);
    
    if (!isValidLobbyName(sanitizedLobbyName)) {
      socket.emit('error', 'Nom de lobby invalide');
      return;
    }
    
    if (lobbies[sanitizedLobbyName]) {
      socket.emit('error', 'Ce nom existe déjà');
      return;
    }
    
    socket.lobby = sanitizedLobbyName;
    socket.join(sanitizedLobbyName);
    
    lobbies[sanitizedLobbyName] = {
      gmId: socket.id,
      players: [],
      currentQuestion: null,
      questionPath: [],
      gameStarted: false,
      createdAt: Date.now(),
      scenarioTitle: scenario.scenario_info.title
    };
    responses[sanitizedLobbyName] = {};
    playerData[sanitizedLobbyName] = {};
    
    socket.emit('lobby-created', {
      lobbyName: sanitizedLobbyName,
      scenarioTitle: scenario.scenario_info.title,
      scenarioData: scenario // Envoyer le scénario complet au MJ
    });
    
    console.log(`Lobby créé: ${sanitizedLobbyName} par ${socket.id}`);
  });

  socket.on('join-lobby', ({ lobbyName }) => {
    const sanitizedLobbyName = sanitizeInput(lobbyName);
    
    if (!lobbies[sanitizedLobbyName]) {
      socket.emit('error', 'Lobby introuvable');
      return;
    }
    
    socket.lobby = sanitizedLobbyName;
    socket.join(sanitizedLobbyName);
    socket.emit('request-player-info');
  });

  socket.on('player-info', (info) => {
    if (!socket.lobby || !lobbies[socket.lobby]) {
      socket.emit('error', 'Lobby invalide');
      return;
    }
    
    const sanitizedInfo = {
      prenom: sanitizeInput(info.prenom),
      age: parseInt(info.age) || 0,
      genre: sanitizeInput(info.genre),
      ecole: sanitizeInput(info.ecole)
    };
    
    if (!isValidPlayerName(sanitizedInfo.prenom)) {
      socket.emit('error', 'Prénom invalide');
      return;
    }
    
    if (lobbies[socket.lobby].players.includes(sanitizedInfo.prenom)) {
      socket.emit('error', 'Ce prénom est déjà pris');
      return;
    }
    
    socket.playerName = sanitizedInfo.prenom;
    lobbies[socket.lobby].players.push(sanitizedInfo.prenom);
    playerData[socket.lobby][sanitizedInfo.prenom] = sanitizedInfo;
    responses[socket.lobby][sanitizedInfo.prenom] = {};
    
    io.to(lobbies[socket.lobby].gmId).emit('player-joined', {
      playerName: sanitizedInfo.prenom,
      playerCount: lobbies[socket.lobby].players.length
    });
    
    socket.emit('joined-lobby', {
      scenarioTitle: scenario.scenario_info.title
    });
    
    if (lobbies[socket.lobby].gameStarted && lobbies[socket.lobby].currentQuestion) {
      const question = getQuestion(lobbies[socket.lobby].currentQuestion);
      if (question) {
        socket.emit('question', {
          ...question,
          isContinue: isContinueQuestion(question)
        });
      }
    }
  });

  socket.on('start-game', () => {
    console.log('Demande de démarrage de partie reçue');
    const lobby = lobbies[socket.lobby];
    
    if (!lobby) {
      console.log('Erreur: lobby non trouvé:', socket.lobby);
      socket.emit('error', 'Lobby non trouvé');
      return;
    }
    
    if (lobby.gmId !== socket.id) {
      console.log('Erreur: non autorisé, gmId:', lobby.gmId, 'socket.id:', socket.id);
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    if (lobby.players.length < 1) {
      console.log('Erreur: pas assez de joueurs:', lobby.players.length);
      socket.emit('error', 'Au moins 1 joueur requis');
      return;
    }
    
    lobby.gameStarted = true;
    lobby.currentQuestion = scenario.scenario_info.start_question || 'scene1';
    lobby.questionPath.push(lobby.currentQuestion);
    
    const question = getQuestion(lobby.currentQuestion);
    console.log('Question de départ:', lobby.currentQuestion, question ? 'trouvée' : 'non trouvée');
    
    if (question) {
      io.in(socket.lobby).emit('game-start');
      
      // Envoyer la question avec un flag pour indiquer si c'est une question "Continuer"
      io.in(socket.lobby).emit('question', {
        ...question,
        isContinue: isContinueQuestion(question)
      });
      
      console.log('Événements game-start et question envoyés');
    } else {
      socket.emit('error', 'Question de départ non trouvée');
    }
  });

  socket.on('choose-next-question', ({ nextQuestionId }) => {
    const lobby = lobbies[socket.lobby];
    if (!lobby || lobby.gmId !== socket.id) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    const question = getQuestion(nextQuestionId);
    if (!question) {
      socket.emit('error', 'Question invalide');
      return;
    }
    
    // Mettre à jour l'état du lobby
    const previousQuestion = lobby.currentQuestion;
    lobby.currentQuestion = nextQuestionId;
    lobby.questionPath.push(nextQuestionId);
    
    // Nettoyer les réponses précédentes pour cette nouvelle question
    Object.keys(responses[socket.lobby]).forEach(player => {
      delete responses[socket.lobby][player][nextQuestionId];
    });
    
    // Envoyer la question avec les métadonnées
    io.in(socket.lobby).emit('question', {
      ...question,
      isContinue: isContinueQuestion(question),
      previousQuestionId: previousQuestion
    });
    
    // Envoyer le chemin mis à jour au MJ
    socket.emit('question-path-update', {
      questionPath: lobby.questionPath,
      currentQuestion: nextQuestionId
    });
    
    console.log(`Transition: ${previousQuestion} → ${nextQuestionId} (Continue: ${isContinueQuestion(question)})`);
  });

  // NOUVEAU gestionnaire pour l'auto-continuation du MJ
  socket.on('gm-auto-continue', ({ currentQuestionId, nextQuestionId }) => {
    const lobby = lobbies[socket.lobby];
    if (!lobby || lobby.gmId !== socket.id) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    const question = getQuestion(nextQuestionId);
    if (!question) {
      socket.emit('error', 'Question invalide');
      return;
    }
    
    // Enregistrer que c'est une transition automatique
    console.log(`Auto-continuation MJ: ${currentQuestionId} → ${nextQuestionId}`);
    
    // Mettre à jour le lobby
    lobby.currentQuestion = nextQuestionId;
    lobby.questionPath.push(nextQuestionId);
    
    // Envoyer la nouvelle question à tous
    io.in(socket.lobby).emit('question', {
      ...question,
      isContinue: isContinueQuestion(question),
      previousQuestionId: currentQuestionId,
      autoTransition: true
    });
    
    // Mettre à jour le menu des chapitres
    socket.emit('question-path-update', {
      questionPath: lobby.questionPath,
      currentQuestion: nextQuestionId
    });
  });

  socket.on('player-answer', ({ questionId, answer }) => {
    if (!socket.lobby || !socket.playerName) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    // Pour les questions "Continuer", on enregistre simplement "continue"
    if (answer === 'continue') {
      responses[socket.lobby][socket.playerName][questionId] = 'continue';
      
      // Notifier le MJ que le joueur a continué
      io.to(lobbies[socket.lobby].gmId).emit('player-continued', {
        playerName: socket.playerName,
        questionId: questionId
      });
      
      socket.emit('answer-recorded');
      return;
    }
    
    const sanitizedAnswer = sanitizeInput(answer);
    
    if (!['A', 'B', 'C', 'D'].includes(sanitizedAnswer)) {
      socket.emit('error', 'Réponse invalide');
      return;
    }
    
    responses[socket.lobby][socket.playerName][questionId] = sanitizedAnswer;
    
    const voteCounts = { A: 0, B: 0, C: 0, D: 0 };
    const voteDetails = { A: [], B: [], C: [], D: [] };
    
    for (const player in responses[socket.lobby]) {
      const playerAnswer = responses[socket.lobby][player][questionId];
      if (playerAnswer && voteCounts[playerAnswer] !== undefined) {
        voteCounts[playerAnswer]++;
        voteDetails[playerAnswer].push(player);
      }
    }
    
    io.in(socket.lobby).emit('vote-update', {
      questionId,
      voteCounts,
      voteDetails,
      playerName: socket.playerName
    });
    
    socket.emit('answer-recorded');
  });

  // NOUVEAU gestionnaire pour synchroniser tous les joueurs sur une question continue
  socket.on('sync-continue-for-all', ({ nextQuestionId }) => {
    const lobby = lobbies[socket.lobby];
    if (!lobby || lobby.gmId !== socket.id) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    const question = getQuestion(nextQuestionId);
    if (!question) return;
    
    // Enregistrer que tous les joueurs ont "continué"
    lobby.players.forEach(playerName => {
      responses[socket.lobby][playerName][lobby.currentQuestion] = 'continue';
    });
    
    // Mettre à jour et envoyer la nouvelle question
    lobby.currentQuestion = nextQuestionId;
    lobby.questionPath.push(nextQuestionId);
    
    io.in(socket.lobby).emit('question', {
      ...question,
      isContinue: isContinueQuestion(question),
      syncedContinue: true
    });
  });

  socket.on('end-game', () => {
    const lobby = lobbies[socket.lobby];
    if (!lobby || lobby.gmId !== socket.id) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    io.in(socket.lobby).emit('game-over');
  });

  socket.on('generate-csv', async () => {
    const lobbyName = socket.lobby;
    const lobby = lobbies[lobbyName];
    
    if (!lobby || lobby.gmId !== socket.id) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    try {
      const exportsDir = path.join(__dirname, 'exports');
      await fs.mkdir(exportsDir, { recursive: true });
      
      const filename = generateSecureFilename(lobbyName);
      const filepath = path.join(exportsDir, filename);
      
      const themes = getThemesForPath(lobby.questionPath);
      const headers = [
        'Nom de la partie',
        'Nom du scénario',
        'Prénom',
        'Âge',
        'Genre',
        'École',
        ...lobby.questionPath,
        'Thèmes abordés'
      ];
      
      const rows = [headers];
      
      for (const playerName in playerData[lobbyName]) {
        const player = playerData[lobbyName][playerName];
        const row = [
          lobbyName,
          scenario.scenario_info.title,
          player.prenom,
          player.age,
          player.genre,
          player.ecole,
          ...lobby.questionPath.map(q => responses[lobbyName][playerName][q] || ''),
          themes.join('; ')
        ];
        rows.push(row);
      }
      
      const csvContent = '\ufeff' + rows.map(r => 
        r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      await fs.writeFile(filepath, csvContent, 'utf-8');
      
      fileAccess[filename] = {
        lobbyName,
        createdAt: Date.now()
      };
      
      socket.emit('csv-ready', filename);
      console.log(`CSV généré: ${filename}`);
      
    } catch (error) {
      console.error('Erreur génération CSV:', error);
      socket.emit('error', 'Erreur lors de la génération du fichier');
    }
  });

  socket.on('player-feedback', ({ feedback }) => {
    if (!socket.lobby || !socket.playerName) return;
    
    console.log(`Feedback de ${socket.playerName} dans ${socket.lobby}: ${feedback}`);
    
    if (!lobbies[socket.lobby].feedbacks) {
      lobbies[socket.lobby].feedbacks = {};
    }
    lobbies[socket.lobby].feedbacks[socket.playerName] = feedback;
  });

  socket.on('send-results-email', ({ observations }) => {
    const lobby = lobbies[socket.lobby];
    if (!lobby || lobby.gmId !== socket.id) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    console.log('Envoi email demandé avec observations:', observations);
    socket.emit('email-sent');
  });

  socket.on('disconnect', () => {
    if (socket.lobby && lobbies[socket.lobby]) {
      const lobby = lobbies[socket.lobby];
      
      if (lobby.gmId === socket.id) {
        delete lobbies[socket.lobby];
        delete responses[socket.lobby];
        delete playerData[socket.lobby];
        io.in(socket.lobby).emit('lobby-closed');
      } else if (socket.playerName) {
        const index = lobby.players.indexOf(socket.playerName);
        if (index > -1) {
          lobby.players.splice(index, 1);
          delete playerData[socket.lobby][socket.playerName];
          delete responses[socket.lobby][socket.playerName];
          io.to(lobby.gmId).emit('player-left', {
            playerName: socket.playerName,
            playerCount: lobby.players.length
          });
        }
      }
    }
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;

loadScenario().then(() => {
  server.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
  });
}).catch(error => {
  console.error('Erreur démarrage:', error);
  process.exit(1);
});