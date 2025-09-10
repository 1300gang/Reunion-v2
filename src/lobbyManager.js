const db = require('./database');
const { promisify } = require('util');
const validator = require('validator');
const crypto =require('crypto');

// Promisify the db methods for async/await usage
db.run = promisify(db.run);
db.get = promisify(db.get);
db.all = promisify(db.all);

// --- Utility Functions (Stateless) ---
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

function isContinueQuestion(questionData) {
  return questionData &&
         questionData.choices &&
         questionData.choices.length === 1 &&
         (questionData.choices[0].toLowerCase() === 'continuer' ||
          questionData.question === '' ||
          questionData.question === null);
}

// --- Database-driven Lobby Functions ---

async function createLobby(id, gmId, scenario, mode, scenarioFile) {
    const sql = `INSERT INTO lobbies (id, gmId, currentQuestion, questionPath, gameStarted, createdAt, scenarioTitle, scenarioFile, mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [id, gmId, null, JSON.stringify([]), 0, Date.now(), scenario.scenario_info.title, scenarioFile, mode];
    await db.run(sql, params);
}

async function getLobby(id) {
    return await db.get("SELECT * FROM lobbies WHERE id = ?", [id]);
}

async function getLobbyByGmId(gmId) {
    return await db.get("SELECT * FROM lobbies WHERE gmId = ?", [gmId]);
}

async function addPlayer(lobbyId, playerInfo, socketId) {
    const { prenom, age, genre, ecole } = playerInfo;
    const token = crypto.randomBytes(16).toString('hex');
    const sql = `INSERT INTO players (lobbyId, playerName, age, genre, ecole, playerToken, socketId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await db.run(sql, [lobbyId, prenom, age, genre, ecole, token, socketId, 'connected']);
    return token; // Return the generated token
}

async function getPlayer(lobbyId, playerName) {
    return await db.get("SELECT * FROM players WHERE lobbyId = ? AND playerName = ?", [lobbyId, playerName]);
}

async function getPlayerBySocketId(socketId) {
    return await db.get("SELECT * FROM players WHERE socketId = ?", [socketId]);
}

async function getPlayerByToken(token) {
    return await db.get("SELECT * FROM players WHERE playerToken = ?", [token]);
}

async function updatePlayer(token, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    if (!setClause) return;
    const sql = `UPDATE players SET ${setClause} WHERE playerToken = ?`;
    return await db.run(sql, [...values, token]);
}

async function updatePlayerStatusBySocketId(socketId, status) {
    const sql = `UPDATE players SET status = ? WHERE socketId = ?`;
    return await db.run(sql, [status, socketId]);
}

async function getPlayers(lobbyId) {
    return await db.all("SELECT * FROM players WHERE lobbyId = ?", [lobbyId]);
}

async function removePlayer(lobbyId, playerName) {
    await db.run("DELETE FROM responses WHERE lobbyId = ? AND playerName = ?", [lobbyId, playerName]);
    return await db.run("DELETE FROM players WHERE lobbyId = ? AND playerName = ?", [lobbyId, playerName]);
}

async function updateLobby(lobbyId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    if (!setClause) return; // Avoid empty updates
    const sql = `UPDATE lobbies SET ${setClause} WHERE id = ?`;
    return await db.run(sql, [...values, lobbyId]);
}

async function recordAnswer(lobbyId, playerName, questionId, answer) {
    const sql = `INSERT INTO responses (lobbyId, playerName, questionId, answer) VALUES (?, ?, ?, ?)`;
    return await db.run(sql, [lobbyId, playerName, questionId, answer]);
}

async function recordFeedback(lobbyId, playerName, feedback) {
    const sql = `INSERT INTO feedbacks (lobbyId, playerName, feedback, createdAt) VALUES (?, ?, ?, ?)`;
    const params = [lobbyId, playerName, feedback, Date.now()];
    return await db.run(sql, params);
}

async function getVotesForQuestion(lobbyId, questionId) {
    const sql = `SELECT answer, COUNT(answer) as count, GROUP_CONCAT(playerName) as players FROM responses WHERE lobbyId = ? AND questionId = ? GROUP BY answer`;
    return await db.all(sql, [lobbyId, questionId]);
}

async function getPlayerResponses(lobbyId, playerName) {
    const sql = `SELECT questionId, answer FROM responses WHERE lobbyId = ? AND playerName = ?`;
    const rows = await db.all(sql, [lobbyId, playerName]);
    return rows.reduce((acc, row) => {
        acc[row.questionId] = row.answer;
        return acc;
    }, {});
}

async function deleteLobby(lobbyId) {
    await db.run("DELETE FROM feedbacks WHERE lobbyId = ?", [lobbyId]);
    await db.run("DELETE FROM responses WHERE lobbyId = ?", [lobbyId]);
    await db.run("DELETE FROM players WHERE lobbyId = ?", [lobbyId]);
    await db.run("DELETE FROM lobbies WHERE id = ?", [lobbyId]);
}

async function cleanupInactiveLobbies() {
  const maxAge = 3 * 60 * 60 * 1000; // 3 hours
  const cutoff = Date.now() - maxAge;
  const oldLobbies = await db.all("SELECT id FROM lobbies WHERE createdAt < ?", [cutoff]);

  for (const lobby of oldLobbies) {
      console.log(`Nettoyage du lobby inactif via BDD: ${lobby.id}`);
      await deleteLobby(lobby.id);
  }
}

// This remains in-memory as it's for temporary, single-request access control.
const fileAccess = {};

module.exports = {
  sanitizeInput,
  isValidLobbyName,
  isValidPlayerName,
  generateSecureFilename,
  isContinueQuestion,
  createLobby,
  getLobby,
  getLobbyByGmId,
  addPlayer,
  getPlayer,
  getPlayerBySocketId,
  getPlayerByToken,
  updatePlayer,
  updatePlayerStatusBySocketId,
  getPlayers,
  removePlayer,
  updateLobby,
  recordAnswer,
  recordFeedback,
  getVotesForQuestion,
  getPlayerResponses,
  deleteLobby,
  cleanupInactiveLobbies,
  fileAccess,
};
