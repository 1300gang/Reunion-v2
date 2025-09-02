const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importer les modules refactorisés
const scenarioLoader = require('./src/scenarioLoader');
const lobbyManager = require('./src/lobbyManager');
const { initializeSocketIO } = require('./src/socketHandlers');
const db = require('./src/database'); // Cette ligne initialise la connexion à la BDD

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

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
  max: process.env.NODE_ENV === 'production' ? 100000 : 10000000,
  message: 'Trop de requêtes, réessayez plus tard'
});
app.use(limiter);

// === ROUTES ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'menu.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'public', 'menu.html')));
app.get('/menu.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'menu.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Route API pour obtenir la liste des scénarios disponibles
app.get('/api/scenarios', (req, res) => {
  const availableScenarios = Object.entries(scenarioLoader.scenarioMapping).map(([key, file]) => ({
    key,
    file,
    loaded: !!scenarioLoader.scenarios[file],
    title: scenarioLoader.scenarios[file]?.scenario_info?.title || 'Non chargé'
  }));
  res.json(availableScenarios);
});

// Route pour le téléchargement des exports CSV
app.get('/exports/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  if (!/^results_[a-zA-Z0-9_\-]+\.csv$/.test(filename)) {
    return res.status(400).send('Nom de fichier invalide');
  }
  
  const filePath = path.join(__dirname, 'exports', filename);
  
  if (!lobbyManager.fileAccess[filename]) {
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
        delete lobbyManager.fileAccess[filename];
      } catch (e) {
        console.error('Erreur suppression fichier:', e);
      }
    }, 60000);
  } catch (error) {
    res.status(404).send('Fichier non trouvé');
  }
});

// === INITIALISATION DES MODULES ===

// Initialiser les gestionnaires d'événements Socket.IO
initializeSocketIO(io);

// Lancer le nettoyage périodique des lobbies inactifs
setInterval(lobbyManager.cleanupInactiveLobbies, 60 * 60 * 1000);

// === DÉMARRAGE DU SERVEUR ===
const PORT = process.env.PORT || 3000;

// Précharger les scénarios puis démarrer le serveur
scenarioLoader.preloadScenarios().then(() => {
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