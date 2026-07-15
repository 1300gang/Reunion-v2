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

// Les fichiers statiques sont servis plus bas après les routes
// pour que la route '/' puisse renvoyer menu.html sans être remplacée
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
app.use(express.json()); // Middleware pour parser les corps de requête JSON

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

// Route API pour lire un scénario spécifique pour l'éditeur
app.get('/api/scenario/:filename', (req, res) => {
    // Sécurité : `path.basename` empêche les attaques de type "directory traversal"
    const filename = path.basename(req.params.filename);

    if (!filename.endsWith('.json')) {
        return res.status(400).send('Nom de fichier invalide.');
    }

    const filePath = path.join(__dirname, 'public', 'scenario', filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            // Log l'erreur côté serveur mais n'expose pas de détails au client
            console.error(`Tentative de lecture du scénario échouée: ${filePath}`, err);
            res.status(404).send('Scénario non trouvé.');
        }
    });
});

// Route API pour sauvegarder (créer/mettre à jour) un scénario
app.post('/api/scenario', async (req, res) => {
    const scenarioData = req.body;

    // Validation de base des données reçues
    if (!scenarioData || !scenarioData.scenario_info || !scenarioData.scenario_info.file) {
        return res.status(400).json({ message: 'Données de scénario invalides : scenario_info.file est requis.' });
    }

    // Sécurité : Nettoyage du nom de fichier
    const filename = path.basename(scenarioData.scenario_info.file);
    if (!filename.endsWith('.json')) {
        return res.status(400).json({ message: 'Le nom de fichier du scénario doit se terminer par .json.' });
    }

    const filePath = path.join(__dirname, 'public', 'scenario', filename);

    try {
        // Écriture du fichier (joliment formaté avec une indentation de 2 espaces)
        await fs.writeFile(filePath, JSON.stringify(scenarioData, null, 2), 'utf-8');

        // Recharger le scénario dans le cache pour que les modifs soient prises en compte immédiatement
        await scenarioLoader.loadScenario(filename);

        res.status(200).json({ message: `Scénario '${filename}' sauvegardé avec succès.` });
    } catch (err) {
        console.error(`Erreur lors de la sauvegarde du scénario ${filename}:`, err);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la sauvegarde du fichier.' });
    }
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
initializeSocketIO(io);
setInterval(lobbyManager.cleanupInactiveLobbies, 60 * 60 * 1000);

// === DÉMARRAGE DU SERVEUR ===
const PORT = process.env.PORT || 3000;
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