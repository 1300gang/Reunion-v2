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

// === ÉTAT GLOBAL ===
const lobbies = {};
const responses = {};
const playerData = {};
const fileAccess = {};
const scenarios = {}; // Cache pour les scénarios chargés

// === CONFIGURATION DES SCÉNARIOS ===
const SCENARIOS_DIR = 'scenario'; // Changé de 'scenarios' à 'scenario'
const DEFAULT_SCENARIO = 'scenario_lgbtqia_V2.json';

// Mapping des noms de niveaux vers les fichiers de scénarios
const scenarioMapping = {
  'lgbtqia': 'scenario_lgbtqia_V2.json',
  'anthology': 'anthology_completeh7.json',
  'parcours-vie': 'parcours-vie-json-imagais.json',
  // Gardez ces entrées pour compatibilité future
  'lea': 'lea_scenario.json',
  'aglae': 'aglae_scenario.json',
  'pornographie': 'pornographie_scenario.json',
  'consentement': 'consentement_scenario.json',
  'stade_foot': 'stade_foot_scenario.json'
};

// === CHARGEMENT DES SCÉNARIOS ===
async function loadScenario(scenarioFile) {
  // Vérifier le cache
  if (scenarios[scenarioFile]) {
    console.log(`Scénario depuis le cache: ${scenarioFile}`);
    return scenarios[scenarioFile];
  }

  try {
    // Chercher dans le dossier scenario (sans 's')
    let filePath = path.join(__dirname, 'public', SCENARIOS_DIR, scenarioFile);
    
    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch {
      // Si pas trouvé dans public/scenario/, essayer directement dans public/
      console.log(`Fichier non trouvé dans ${SCENARIOS_DIR}, essai dans public/`);
      filePath = path.join(__dirname, 'public', scenarioFile);
    }
    
    const data = await fs.readFile(filePath, 'utf-8');
    const scenario = JSON.parse(data);
    
    // Mettre en cache
    scenarios[scenarioFile] = scenario;
    console.log(`Scénario chargé: ${scenario.scenario_info.title} (${scenarioFile})`);
    
    return scenario;
  } catch (error) {
    console.error(`Erreur chargement scénario ${scenarioFile}:`, error);
    throw new Error(`Impossible de charger le scénario: ${scenarioFile}`);
  }
}

// Précharger tous les scénarios au démarrage (optionnel)
async function preloadScenarios() {
  console.log('Préchargement des scénarios...');
  
  for (const [key, file] of Object.entries(scenarioMapping)) {
    try {
      await loadScenario(file);
      console.log(`✓ ${key}: ${file}`);
    } catch (error) {
      console.warn(`✗ ${key}: ${error.message}`);
    }
  }
  
  console.log(`${Object.keys(scenarios).length} scénarios en cache`);
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
  max: process.env.NODE_ENV === 'production' ? 100 : 10000,
  message: 'Trop de requêtes, réessayez plus tard'
});

app.use(limiter);

// === ROUTES - DÉFINIR AVANT express.static ===
// Route principale - affiche le menu (DOIT être AVANT express.static)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

// Route pour le menu (alias)
app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

// Route pour le menu.html direct
app.get('/menu.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

// Route pour le jeu
app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour l'index (redirige vers le jeu pour compatibilité)
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// APRÈS toutes les routes, mettre express.static avec une option pour ignorer index.html
app.use(express.static(path.join(__dirname, 'public'), {
  index: false // Empêche de servir index.html automatiquement
}));

// Route API pour obtenir la liste des scénarios disponibles
app.get('/api/scenarios', (req, res) => {
  const availableScenarios = Object.entries(scenarioMapping).map(([key, file]) => ({
    key,
    file,
    loaded: !!scenarios[file],
    title: scenarios[file]?.scenario_info?.title || 'Non chargé'
  }));
  
  res.json(availableScenarios);
});

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

function generateSecureFilename(lobbyName, scenarioName) {
  const hash = crypto.randomBytes(8).toString('hex');
  const sanitizedLobby = lobbyName.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedScenario = scenarioName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  const timestamp = new Date().toISOString().split('T')[0];
  return `results_${sanitizedScenario}_${sanitizedLobby}_${timestamp}_${hash}.csv`;
}

// Fonction modifiée pour utiliser le scénario du lobby
function getQuestion(lobbyName, questionId) {
  const lobby = lobbies[lobbyName];
  if (!lobby || !lobby.scenario) {
    console.error(`Scénario non trouvé pour le lobby: ${lobbyName}`);
    return null;
  }
  
  const scenario = lobby.scenario;
  if (!scenario.questions || !scenario.questions[questionId]) {
    console.warn(`Question non trouvée: ${questionId} dans ${lobby.scenarioFile}`);
    return null;
  }
  
  return scenario.questions[questionId];
}

function isContinueQuestion(questionData) {
  return questionData && 
         questionData.choices && 
         questionData.choices.length === 1 && 
         (questionData.choices[0].toLowerCase() === 'continuer' || 
          questionData.question === '' ||
          questionData.question === null);
}

function getThemesForPath(lobbyName, questionPath) {
  const themes = new Set();
  questionPath.forEach(questionId => {
    const question = getQuestion(lobbyName, questionId);
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
    
    // Supprimer le fichier après téléchargement
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

  // MODIFICATION: Accepter un objet avec scenarioFile et mode
  socket.on('create-lobby', async (data) => {
    // Gérer les deux formats : string (ancien) ou objet (nouveau)
    let lobbyName, scenarioFile, mode;
    
    if (typeof data === 'string') {
      // Ancien format pour compatibilité
      lobbyName = data;
      scenarioFile = 'scenario_lgbtqia_V2.json';
      mode = 'group';
    } else {
      // Nouveau format avec scénario et mode
      lobbyName = data.lobbyName;
      scenarioFile = data.scenarioFile || DEFAULT_SCENARIO;
      mode = data.mode || 'group';
    }
    
    const sanitizedLobbyName = sanitizeInput(lobbyName);
    
    if (!isValidLobbyName(sanitizedLobbyName)) {
      socket.emit('error', 'Nom de lobby invalide');
      return;
    }
    
    if (lobbies[sanitizedLobbyName]) {
      socket.emit('error', 'Ce nom existe déjà');
      return;
    }
    
    // Charger le scénario spécifique
    let scenario;
    try {
      scenario = await loadScenario(scenarioFile);
    } catch (error) {
      console.error('Erreur chargement scénario:', error);
      socket.emit('error', 'Impossible de charger le scénario');
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
      scenarioTitle: scenario.scenario_info.title,
      scenarioFile: scenarioFile,
      scenario: scenario,
      mode: mode // 'solo' ou 'group'
    };
    
    responses[sanitizedLobbyName] = {};
    playerData[sanitizedLobbyName] = {};
    
    // Pour le mode solo, ajouter automatiquement un joueur
    if (mode === 'solo') {
      const soloPlayerName = 'Joueur';
      lobbies[sanitizedLobbyName].players.push(soloPlayerName);
      playerData[sanitizedLobbyName][soloPlayerName] = {
        prenom: soloPlayerName,
        age: 0,
        genre: 'N/A',
        ecole: 'Mode Solo'
      };
      responses[sanitizedLobbyName][soloPlayerName] = {};
      
      // Démarrage automatique en mode solo
      socket.playerName = soloPlayerName;
    }
    
    socket.emit('lobby-created', {
      lobbyName: sanitizedLobbyName,
      scenarioTitle: scenario.scenario_info.title,
      scenarioData: scenario,
      mode: mode
    });
    
    console.log(`Lobby créé: ${sanitizedLobbyName} | Scénario: ${scenarioFile} | Mode: ${mode}`);
  });

  socket.on('join-lobby', ({ lobbyName }) => {
    const sanitizedLobbyName = sanitizeInput(lobbyName);
    
    if (!lobbies[sanitizedLobbyName]) {
      socket.emit('error', 'Lobby introuvable');
      return;
    }
    
    socket.lobby = sanitizedLobbyName;
    socket.join(sanitizedLobbyName);
    
    // Si c'est un lobby en mode solo, refuser les joueurs supplémentaires
    if (lobbies[sanitizedLobbyName].mode === 'solo') {
      socket.emit('error', 'Cette partie est en mode solo');
      return;
    }
    
    socket.emit('request-player-info');
  });

  socket.on('player-info', (info) => {
    if (!socket.lobby || !lobbies[socket.lobby]) {
      socket.emit('error', 'Lobby invalide');
      return;
    }
    
    const lobby = lobbies[socket.lobby];
    
    // Empêcher l'ajout de joueurs en mode solo
    if (lobby.mode === 'solo' && lobby.players.length > 0) {
      socket.emit('error', 'Partie solo déjà en cours');
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
    
    if (lobby.players.includes(sanitizedInfo.prenom)) {
      socket.emit('error', 'Ce prénom est déjà pris');
      return;
    }
    
    socket.playerName = sanitizedInfo.prenom;
    lobby.players.push(sanitizedInfo.prenom);
    playerData[socket.lobby][sanitizedInfo.prenom] = sanitizedInfo;
    responses[socket.lobby][sanitizedInfo.prenom] = {};
    
    io.to(lobby.gmId).emit('player-joined', {
      playerName: sanitizedInfo.prenom,
      playerCount: lobby.players.length
    });
    
    socket.emit('joined-lobby', {
      scenarioTitle: lobby.scenario.scenario_info.title
    });
    
    // Si la partie a déjà commencé, envoyer la question actuelle
    if (lobby.gameStarted && lobby.currentQuestion) {
      const question = getQuestion(socket.lobby, lobby.currentQuestion);
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
    
    // En mode solo, pas de minimum de joueurs
    if (lobby.mode !== 'solo' && lobby.players.length < 1) {
      console.log('Erreur: pas assez de joueurs:', lobby.players.length);
      socket.emit('error', 'Au moins 1 joueur requis');
      return;
    }
    
    lobby.gameStarted = true;
    lobby.currentQuestion = lobby.scenario.scenario_info.start_question || 'scene1';
    lobby.questionPath.push(lobby.currentQuestion);
    
    const question = getQuestion(socket.lobby, lobby.currentQuestion);
    console.log(`Démarrage: ${lobby.scenarioTitle} - Question: ${lobby.currentQuestion}`);
    
    if (question) {
      io.in(socket.lobby).emit('game-start');
      io.in(socket.lobby).emit('question', {
        ...question,
        isContinue: isContinueQuestion(question)
      });
    } else {
      socket.emit('error', 'Question de départ non trouvée');
    }
  });

  socket.on('choose-next-question', ({ nextQuestionId }) => {
    const lobby = lobbies[socket.lobby];
    if (!lobby || (lobby.gmId !== socket.id && lobby.mode !== 'solo')) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    const question = getQuestion(socket.lobby, nextQuestionId);
    if (!question) {
      socket.emit('error', 'Question invalide');
      return;
    }
    
    const previousQuestion = lobby.currentQuestion;
    lobby.currentQuestion = nextQuestionId;
    lobby.questionPath.push(nextQuestionId);
    
    // Nettoyer les réponses précédentes
    Object.keys(responses[socket.lobby]).forEach(player => {
      delete responses[socket.lobby][player][nextQuestionId];
    });
    
    io.in(socket.lobby).emit('question', {
      ...question,
      isContinue: isContinueQuestion(question),
      previousQuestionId: previousQuestion
    });
    
    socket.emit('question-path-update', {
      questionPath: lobby.questionPath,
      currentQuestion: nextQuestionId
    });
    
    console.log(`${socket.lobby}: ${previousQuestion} → ${nextQuestionId}`);
  });

  socket.on('gm-auto-continue', ({ currentQuestionId, nextQuestionId }) => {
    const lobby = lobbies[socket.lobby];
    if (!lobby || lobby.gmId !== socket.id) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    const question = getQuestion(socket.lobby, nextQuestionId);
    if (!question) {
      socket.emit('error', 'Question invalide');
      return;
    }
    
    console.log(`Auto-continuation: ${currentQuestionId} → ${nextQuestionId}`);
    
    lobby.currentQuestion = nextQuestionId;
    lobby.questionPath.push(nextQuestionId);
    
    io.in(socket.lobby).emit('question', {
      ...question,
      isContinue: isContinueQuestion(question),
      previousQuestionId: currentQuestionId,
      autoTransition: true
    });
    
    socket.emit('question-path-update', {
      questionPath: lobby.questionPath,
      currentQuestion: nextQuestionId
    });
  });

  socket.on('player-answer', ({ questionId, answer }) => {
    if (!socket.lobby) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    const lobby = lobbies[socket.lobby];
    
    // En mode solo, le socket est à la fois MJ et joueur
    const playerName = lobby.mode === 'solo' ? 'Joueur' : socket.playerName;
    
    if (!playerName) {
      socket.emit('error', 'Joueur non identifié');
      return;
    }
    
    if (answer === 'continue') {
      responses[socket.lobby][playerName][questionId] = 'continue';
      
      if (lobby.mode !== 'solo') {
        io.to(lobby.gmId).emit('player-continued', {
          playerName: playerName,
          questionId: questionId
        });
      }
      
      socket.emit('answer-recorded');
      return;
    }
    
    const sanitizedAnswer = sanitizeInput(answer);
    
    if (!['A', 'B', 'C', 'D'].includes(sanitizedAnswer)) {
      socket.emit('error', 'Réponse invalide');
      return;
    }
    
    responses[socket.lobby][playerName][questionId] = sanitizedAnswer;
    
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
      playerName: playerName
    });
    
    socket.emit('answer-recorded');
  });

  socket.on('sync-continue-for-all', ({ nextQuestionId }) => {
    const lobby = lobbies[socket.lobby];
    if (!lobby || lobby.gmId !== socket.id) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    const question = getQuestion(socket.lobby, nextQuestionId);
    if (!question) return;
    
    lobby.players.forEach(playerName => {
      responses[socket.lobby][playerName][lobby.currentQuestion] = 'continue';
    });
    
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
    if (!lobby || (lobby.gmId !== socket.id && lobby.mode !== 'solo')) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    io.in(socket.lobby).emit('game-over');
  });

  socket.on('generate-csv', async () => {
    const lobbyName = socket.lobby;
    const lobby = lobbies[lobbyName];
    
    if (!lobby || (lobby.gmId !== socket.id && lobby.mode !== 'solo')) {
      socket.emit('error', 'Non autorisé');
      return;
    }
    
    try {
      const exportsDir = path.join(__dirname, 'exports');
      await fs.mkdir(exportsDir, { recursive: true });
      
      const filename = generateSecureFilename(lobbyName, lobby.scenarioTitle);
      const filepath = path.join(exportsDir, filename);
      
      const themes = getThemesForPath(lobbyName, lobby.questionPath);
      const headers = [
        'Nom de la partie',
        'Nom du scénario',
        'Mode',
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
          lobby.scenarioTitle,
          lobby.mode,
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
    
    const lobby = lobbies[socket.lobby];
    if (!lobby) return;
    
    if (!lobby.feedbacks) {
      lobby.feedbacks = {};
    }
    lobby.feedbacks[socket.playerName] = feedback;
  });

  socket.on('disconnect', () => {
    if (socket.lobby && lobbies[socket.lobby]) {
      const lobby = lobbies[socket.lobby];
      
      // Si c'est le MJ qui se déconnecte
      if (lobby.gmId === socket.id) {
        // En mode solo, nettoyer immédiatement
        if (lobby.mode === 'solo') {
          delete lobbies[socket.lobby];
          delete responses[socket.lobby];
          delete playerData[socket.lobby];
        } else {
          // En mode groupe, notifier les joueurs
          io.in(socket.lobby).emit('lobby-closed');
          delete lobbies[socket.lobby];
          delete responses[socket.lobby];
          delete playerData[socket.lobby];
        }
      } 
      // Si c'est un joueur qui se déconnecte
      else if (socket.playerName) {
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
    
    console.log(`Déconnexion: ${socket.id}`);
  });
});

// === NETTOYAGE PÉRIODIQUE ===
// Nettoyer les lobbies inactifs toutes les heures
setInterval(() => {
  const now = Date.now();
  const maxAge = 3 * 60 * 60 * 1000; // 3 heures
  
  Object.entries(lobbies).forEach(([lobbyName, lobby]) => {
    if (now - lobby.createdAt > maxAge) {
      console.log(`Nettoyage du lobby inactif: ${lobbyName}`);
      delete lobbies[lobbyName];
      delete responses[lobbyName];
      delete playerData[lobbyName];
    }
  });
}, 60 * 60 * 1000);

// === DÉMARRAGE DU SERVEUR ===
const PORT = process.env.PORT || 3000;

// Précharger les scénarios puis démarrer le serveur
preloadScenarios().then(() => {
  server.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📱 Menu principal: http://localhost:${PORT}`);
    console.log(`🎮 Jeu direct: http://localhost:${PORT}/game`);
    console.log(`📊 API Scénarios: http://localhost:${PORT}/api/scenarios`);
    console.log(`${'='.repeat(50)}\n`);
  });
}).catch(error => {
  console.error('Erreur démarrage:', error);
  process.exit(1);
});