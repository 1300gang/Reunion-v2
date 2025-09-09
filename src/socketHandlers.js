const fs = require('fs').promises;
const path = require('path');
const lobbyManager = require('./lobbyManager');
const scenarioLoader = require('./scenarioLoader');

// Helper function to get a question from a loaded scenario object
function getQuestionFromScenario(scenario, questionId) {
    if (!scenario || !scenario.questions || !scenario.questions[questionId]) {
        console.warn(`Question non trouvée: ${questionId}`);
        return null;
    }
    return scenario.questions[questionId];
}

function initializeSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`Nouvelle connexion: ${socket.id}`);

    // Wrapped each handler in a try/catch to gracefully handle DB errors.
    socket.on('create-lobby', async (data) => {
      try {
        let lobbyName, scenarioFile, mode;
        if (typeof data === 'string') {
          lobbyName = data;
          scenarioFile = scenarioLoader.DEFAULT_SCENARIO;
          mode = 'group';
        } else {
          lobbyName = data.lobbyName;
          scenarioFile = data.scenarioFile || scenarioLoader.DEFAULT_SCENARIO;
          mode = data.mode || 'group';
        }

        const sanitizedLobbyName = lobbyManager.sanitizeInput(lobbyName);
        if (!lobbyManager.isValidLobbyName(sanitizedLobbyName)) return socket.emit('error', 'Nom de lobby invalide');

        const existingLobby = await lobbyManager.getLobby(sanitizedLobbyName);
        if (existingLobby) return socket.emit('error', 'Ce nom existe déjà');

        const scenario = await scenarioLoader.loadScenario(scenarioFile);
        if (!scenario) return socket.emit('error', 'Impossible de charger le scénario');

        await lobbyManager.createLobby(sanitizedLobbyName, socket.id, scenario, mode, scenarioFile);

        socket.lobby = sanitizedLobbyName;
        socket.join(sanitizedLobbyName);

        if (mode === 'solo') {
            await lobbyManager.addPlayer(sanitizedLobbyName, { prenom: 'Joueur', age: 0, genre: 'N/A', ecole: 'Mode Solo' });
            socket.playerName = 'Joueur';
        }

        socket.emit('lobby-created', { lobbyName: sanitizedLobbyName, scenarioTitle: scenario.scenario_info.title, scenarioData: scenario, mode: mode });
        console.log(`Lobby créé en BDD: ${sanitizedLobbyName}`);
      } catch (err) { console.error("Erreur 'create-lobby':", err); socket.emit('error', 'Erreur serveur.'); }
    });

    socket.on('reconnect-player', async ({ token }) => {
        try {
            if (!token) return socket.emit('reconnect-failed');

            const player = await lobbyManager.getPlayerByToken(token);
            if (!player) return socket.emit('reconnect-failed');

            await lobbyManager.updatePlayer(token, { status: 'connected', socketId: socket.id });

            const lobby = await lobbyManager.getLobby(player.lobbyId);
            if (!lobby) return socket.emit('reconnect-failed');

            // Restore player state on the socket
            socket.lobby = player.lobbyId;
            socket.playerName = player.playerName;
            socket.join(player.lobbyId);

            // Notify client of success and send current game state
            const scenario = await scenarioLoader.loadScenario(lobby.scenarioFile);
            socket.emit('reconnect-success', {
                lobbyName: lobby.id,
                playerName: player.playerName,
                scenarioTitle: lobby.scenarioTitle
            });

            // Send current question if game has started
            if (lobby.gameStarted && lobby.currentQuestion) {
                const question = getQuestionFromScenario(scenario, lobby.currentQuestion);
                if (question) {
                    socket.emit('question', { ...question, isContinue: lobbyManager.isContinueQuestion(question) });
                }
            }

            // Notify GM
            const players = await lobbyManager.getPlayers(lobby.id);
            const connectedPlayers = players.filter(p => p.status === 'connected');
            io.to(lobby.gmId).emit('player-joined', { playerName: player.playerName, playerCount: connectedPlayers.length, reconnected: true });

            console.log(`Joueur '${player.playerName}' reconnecté au lobby '${lobby.id}'`);

        } catch(err) {
            console.error("Erreur 'reconnect-player':", err);
            socket.emit('reconnect-failed');
        }
    });

    socket.on('join-lobby', async ({ lobbyName }) => {
        try {
            const sanitizedLobbyName = lobbyManager.sanitizeInput(lobbyName);
            const lobby = await lobbyManager.getLobby(sanitizedLobbyName);
            if (!lobby) return socket.emit('error', 'Lobby introuvable');
            if (lobby.mode === 'solo') return socket.emit('error', 'Cette partie est en mode solo');
            socket.lobby = sanitizedLobbyName;
            socket.join(sanitizedLobbyName);
            socket.emit('request-player-info');
        } catch (err) { console.error("Erreur 'join-lobby':", err); socket.emit('error', 'Erreur serveur.'); }
    });

    socket.on('player-info', async (info) => {
        try {
            if (!socket.lobby) return socket.emit('error', 'Lobby invalide');
            const lobby = await lobbyManager.getLobby(socket.lobby);
            if (!lobby) return socket.emit('error', 'Lobby invalide');

            const sanitizedInfo = { prenom: lobbyManager.sanitizeInput(info.prenom), age: parseInt(info.age) || 0, genre: lobbyManager.sanitizeInput(info.genre), ecole: lobbyManager.sanitizeInput(info.ecole) };
            if (!lobbyManager.isValidPlayerName(sanitizedInfo.prenom)) return socket.emit('error', 'Prénom invalide');

            const existingPlayer = await lobbyManager.getPlayer(socket.lobby, sanitizedInfo.prenom);
            if (existingPlayer) return socket.emit('error', 'Ce prénom est déjà pris');

            const token = await lobbyManager.addPlayer(socket.lobby, sanitizedInfo, socket.id);
            socket.playerName = sanitizedInfo.prenom;

            // Send token to the client for reconnection purposes
            socket.emit('player-registered', { token: token, playerName: sanitizedInfo.prenom });

            const players = await lobbyManager.getPlayers(socket.lobby);
            io.to(lobby.gmId).emit('player-joined', { playerName: sanitizedInfo.prenom, playerCount: players.length });

            const scenario = await scenarioLoader.loadScenario(lobby.scenarioFile);
            socket.emit('joined-lobby', { scenarioTitle: scenario.scenario_info.title });

            if (lobby.gameStarted && lobby.currentQuestion) {
                const question = getQuestionFromScenario(scenario, lobby.currentQuestion);
                if (question) socket.emit('question', { ...question, isContinue: lobbyManager.isContinueQuestion(question) });
            }
        } catch (err) { console.error("Erreur 'player-info':", err); socket.emit('error', 'Erreur serveur.'); }
    });

    socket.on('start-game', async () => {
        try {
            if (!socket.lobby) return socket.emit('error', 'Lobby non trouvé');
            const lobby = await lobbyManager.getLobby(socket.lobby);
            if (!lobby || lobby.gmId !== socket.id) return socket.emit('error', 'Non autorisé');

            const players = await lobbyManager.getPlayers(socket.lobby);
            // La vérification du nombre de joueurs ignore à juste titre le mode solo
            if (lobby.mode !== 'solo' && players.length < 1) return socket.emit('error', 'Au moins 1 joueur requis');

            const scenario = await scenarioLoader.loadScenario(lobby.scenarioFile);
            const startQuestionId = scenario.scenario_info.start_question || 'scene1';

            await lobbyManager.updateLobby(socket.lobby, { gameStarted: 1, currentQuestion: startQuestionId, questionPath: JSON.stringify([startQuestionId]) });

            const question = getQuestionFromScenario(scenario, startQuestionId);

            if (question) {
                // Étape 1 : On notifie tout le monde (même si c'est une seule personne) que la partie commence.
                // C'est cette partie qui fonctionne déjà chez vous.
                io.in(socket.lobby).emit('game-start');

                // Étape 2 : On envoie la première question. C'est ici que se trouve la correction.
                // Pour le mode solo, on envoie la question directement au socket qui a fait la demande.
                // C'est plus direct et plus robuste qu'une diffusion générale.
                const questionPayload = { ...question, isContinue: lobbyManager.isContinueQuestion(question) };

                if (lobby.mode === 'solo') {
                    console.log(`Mode solo détecté, envoi de la première question directement à ${socket.id}`);
                    socket.emit('question', questionPayload);
                } else {
                    // Pour le mode groupe, on garde la diffusion à tout le lobby.
                    io.in(socket.lobby).emit('question', questionPayload);
                }

            } else {
                socket.emit('error', 'Question de départ non trouvée');
            }
        } catch (err) {
            console.error("Erreur 'start-game':", err);
            socket.emit('error', 'Erreur serveur.');
        }
    });

    socket.on('choose-next-question', async ({ nextQuestionId }) => {
        try {
            if (!socket.lobby) return;
            let lobby = await lobbyManager.getLobby(socket.lobby);
            if (!lobby || (lobby.gmId !== socket.id && lobby.mode !== 'solo')) return socket.emit('error', 'Non autorisé');

            const scenario = await scenarioLoader.loadScenario(lobby.scenarioFile);
            const question = getQuestionFromScenario(scenario, nextQuestionId);
            if (!question) return socket.emit('error', 'Question invalide');

            const previousQuestion = lobby.currentQuestion;
            const newQuestionPath = [...JSON.parse(lobby.questionPath), nextQuestionId];

            await lobbyManager.updateLobby(socket.lobby, { currentQuestion: nextQuestionId, questionPath: JSON.stringify(newQuestionPath) });

            io.in(socket.lobby).emit('question', { ...question, isContinue: lobbyManager.isContinueQuestion(question), previousQuestionId: previousQuestion });
            socket.emit('question-path-update', { questionPath: newQuestionPath, currentQuestion: nextQuestionId });
        } catch (err) { console.error("Erreur 'choose-next-question':", err); socket.emit('error', 'Erreur serveur.'); }
    });

    socket.on('player-answer', async ({ questionId, answer }) => {
        try {
            if (!socket.lobby) return;
            const lobby = await lobbyManager.getLobby(socket.lobby);
            if (!lobby) return;

            const playerName = lobby.mode === 'solo' ? 'Joueur' : socket.playerName;
            if (!playerName) return;

            await lobbyManager.recordAnswer(socket.lobby, playerName, questionId, answer);
            socket.emit('answer-recorded');

            if (answer === 'continue') {
                if (lobby.mode !== 'solo') io.to(lobby.gmId).emit('player-continued', { playerName, questionId });
                return;
            }

            const votes = await lobbyManager.getVotesForQuestion(socket.lobby, questionId);
            const voteCounts = { A: 0, B: 0, C: 0, D: 0 };
            const voteDetails = { A: [], B: [], C: [], D: [] };
            votes.forEach(vote => {
                voteCounts[vote.answer] = vote.count;
                voteDetails[vote.answer] = vote.players.split(',');
            });

            io.in(socket.lobby).emit('vote-update', { questionId, voteCounts, voteDetails, playerName });
        } catch (err) { console.error("Erreur 'player-answer':", err); }
    });

    socket.on('gm-auto-continue', async ({ currentQuestionId, nextQuestionId }) => {
        try {
            if (!socket.lobby) return;
            const lobby = await lobbyManager.getLobby(socket.lobby);
            if (!lobby || lobby.gmId !== socket.id) return socket.emit('error', 'Non autorisé');

            const scenario = await scenarioLoader.loadScenario(lobby.scenarioFile);
            const question = getQuestionFromScenario(scenario, nextQuestionId);
            if (!question) return socket.emit('error', 'Question invalide');

            const newQuestionPath = [...JSON.parse(lobby.questionPath), nextQuestionId];
            await lobbyManager.updateLobby(socket.lobby, { currentQuestion: nextQuestionId, questionPath: JSON.stringify(newQuestionPath) });

            io.in(socket.lobby).emit('question', { ...question, isContinue: lobbyManager.isContinueQuestion(question), previousQuestionId: currentQuestionId, autoTransition: true });
            socket.emit('question-path-update', { questionPath: newQuestionPath, currentQuestion: nextQuestionId });
        } catch (err) { console.error("Erreur 'gm-auto-continue':", err); socket.emit('error', 'Erreur serveur.'); }
    });

    socket.on('sync-continue-for-all', async ({ nextQuestionId }) => {
        try {
            if (!socket.lobby) return;
            const lobby = await lobbyManager.getLobby(socket.lobby);
            if (!lobby || lobby.gmId !== socket.id) return socket.emit('error', 'Non autorisé');

            const scenario = await scenarioLoader.loadScenario(lobby.scenarioFile);
            const question = getQuestionFromScenario(scenario, nextQuestionId);
            if (!question) return;

            const players = await lobbyManager.getPlayers(socket.lobby);
            for (const player of players) {
                await lobbyManager.recordAnswer(socket.lobby, player.playerName, lobby.currentQuestion, 'continue');
            }

            const newQuestionPath = [...JSON.parse(lobby.questionPath), nextQuestionId];
            await lobbyManager.updateLobby(socket.lobby, { currentQuestion: nextQuestionId, questionPath: JSON.stringify(newQuestionPath) });

            io.in(socket.lobby).emit('question', { ...question, isContinue: lobbyManager.isContinueQuestion(question), syncedContinue: true });
        } catch (err) { console.error("Erreur 'sync-continue-for-all':", err); socket.emit('error', 'Erreur serveur.'); }
    });

    socket.on('player-feedback', async ({ feedback }) => {
        try {
            if (!socket.lobby || !socket.playerName) return;
            await lobbyManager.recordFeedback(socket.lobby, socket.playerName, feedback);
            console.log(`Feedback de ${socket.playerName} enregistré.`);
        } catch (err) { console.error("Erreur 'player-feedback':", err); }
    });

    socket.on('end-game', async () => {
        try {
            if (!socket.lobby) return;
            const lobby = await lobbyManager.getLobby(socket.lobby);
            if (!lobby || (lobby.gmId !== socket.id && lobby.mode !== 'solo')) return;
            io.in(socket.lobby).emit('game-over');
        } catch (err) { console.error("Erreur 'end-game':", err); }
    });

    socket.on('generate-csv', async () => {
        try {
            if (!socket.lobby) return socket.emit('error', 'Non autorisé');
            const lobby = await lobbyManager.getLobby(socket.lobby);
            if (!lobby || (lobby.gmId !== socket.id && lobby.mode !== 'solo')) return socket.emit('error', 'Non autorisé');

            const exportsDir = path.join(__dirname, '..', 'exports');
            await fs.mkdir(exportsDir, { recursive: true });
            const filename = lobbyManager.generateSecureFilename(lobby.id, lobby.scenarioTitle);
            const filepath = path.join(exportsDir, filename);

            const players = await lobbyManager.getPlayers(socket.lobby);
            const questionPath = JSON.parse(lobby.questionPath);
            const headers = ['Nom de la partie', 'Nom du scénario', 'Mode', 'Prénom', 'Âge', 'Genre', 'École', ...questionPath];
            const rows = [headers];

            for (const player of players) {
                const playerResponses = await lobbyManager.getPlayerResponses(socket.lobby, player.playerName);
                const row = [lobby.id, lobby.scenarioTitle, lobby.mode, player.playerName, player.age, player.genre, player.ecole, ...questionPath.map(qId => playerResponses[qId] || '')];
                rows.push(row);
            }

            const csvContent = '\ufeff' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            await fs.writeFile(filepath, csvContent, 'utf-8');
            lobbyManager.fileAccess[filename] = { lobbyName: lobby.id, createdAt: Date.now() };
            socket.emit('csv-ready', filename);
        } catch (err) { console.error('Erreur génération CSV:', err); socket.emit('error', 'Erreur serveur.'); }
    });

    socket.on('disconnect', async () => {
        console.log(`Déconnexion: ${socket.id}`);
        try {
            // Check if the disconnected socket is a GM
            const lobbyAsGm = await lobbyManager.getLobbyByGmId(socket.id);
            if (lobbyAsGm) {
                console.log(`GM déconnecté pour le lobby ${lobbyAsGm.id}. Le lobby sera supprimé.`);
                io.in(lobbyAsGm.id).emit('lobby-closed');
                await lobbyManager.deleteLobby(lobbyAsGm.id);
                return;
            }

            // Check if the disconnected socket is a player
            const player = await lobbyManager.getPlayerBySocketId(socket.id);
            if (player) {
                await lobbyManager.updatePlayerStatusBySocketId(socket.id, 'disconnected');
                console.log(`Joueur '${player.playerName}' dans le lobby '${player.lobbyId}' marqué comme déconnecté.`);

                // Notify GM
                const lobby = await lobbyManager.getLobby(player.lobbyId);
                if (lobby) {
                    const players = await lobbyManager.getPlayers(player.lobbyId);
                    const connectedPlayers = players.filter(p => p.status === 'connected');
                    io.to(lobby.gmId).emit('player-left', { playerName: player.playerName, playerCount: connectedPlayers.length });
                }
            }
        } catch (err) {
            console.error("Erreur lors de la déconnexion:", err);
        }
    });
  });
}

module.exports = { initializeSocketIO };
