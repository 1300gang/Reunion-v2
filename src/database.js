const sqlite3 = require('sqlite3').verbose();

// Use /tmp directory for write permissions in the sandbox environment
const DB_SOURCE = "/tmp/database.sqlite";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
        console.log('Connecté à la base de données SQLite.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS lobbies (
                id TEXT PRIMARY KEY,
                gmId TEXT,
                currentQuestion TEXT,
                questionPath TEXT,
                gameStarted INTEGER,
                createdAt INTEGER,
                scenarioTitle TEXT,
                scenarioFile TEXT,
                mode TEXT
            )`, (err) => { if (err) console.error("Erreur table lobbies:", err.message); });

            db.run(`CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lobbyId TEXT,
                playerName TEXT,
                age INTEGER,
                genre TEXT,
                ecole TEXT,
                playerToken TEXT UNIQUE,
                socketId TEXT,
                status TEXT,
                UNIQUE(lobbyId, playerName)
            )`, (err) => { if (err) console.error("Erreur table players:", err.message); });

            db.run(`CREATE TABLE IF NOT EXISTS responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lobbyId TEXT,
                playerName TEXT,
                questionId TEXT,
                answer TEXT
            )`, (err) => { if (err) console.error("Erreur table responses:", err.message); });

            db.run(`CREATE TABLE IF NOT EXISTS feedbacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lobbyId TEXT,
                playerName TEXT,
                feedback TEXT,
                createdAt INTEGER
            )`, (err) => { if (err) console.error("Erreur table feedbacks:", err.message); });
        });
    }
});

module.exports = db;
