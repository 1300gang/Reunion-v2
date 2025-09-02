const sqlite3 = require('sqlite3').verbose();

const DB_SOURCE = "database.sqlite";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
        console.log('Connecté à la base de données SQLite.');
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
        )`, (err) => {
            if (err) {
                console.error("Erreur création table lobbies:", err.message);
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lobbyId TEXT,
            playerName TEXT,
            age INTEGER,
            genre TEXT,
            ecole TEXT,
            UNIQUE(lobbyId, playerName)
        )`, (err) => {
            if (err) {
                console.error("Erreur création table players:", err.message);
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lobbyId TEXT,
            playerName TEXT,
            questionId TEXT,
            answer TEXT
        )`, (err) => {
            if (err) {
                console.error("Erreur création table responses:", err.message);
            }
        });
    }
});

module.exports = db;
