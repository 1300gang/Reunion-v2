document.addEventListener('DOMContentLoaded', () => {
    const scenarioSelect = document.getElementById('scenario-select');
    const loadBtn = document.getElementById('load-scenario-btn');
    const saveBtn = document.getElementById('save-scenario-btn');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const questionsContainer = document.getElementById('questions-container');

    const titleInput = document.getElementById('scenario-title');
    const fileInput = document.getElementById('scenario-file');
    const startQuestionInput = document.getElementById('start-question');

    // --- LOGIQUE DE L'ÉDITEUR ---

    async function loadScenarioList() {
        try {
            const response = await fetch('/api/scenarios');
            if (!response.ok) throw new Error('Impossible de charger la liste des scénarios.');
            const scenarios = await response.json();
            scenarioSelect.innerHTML = '<option value="">-- Nouveau Scénario --</option>';
            scenarios.forEach(scenario => {
                if (scenario.file) {
                    const option = document.createElement('option');
                    option.value = scenario.file;
                    option.textContent = `${scenario.title || scenario.file.replace('.json','')} (${scenario.file})`;
                    scenarioSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    async function loadScenarioData() {
        const selectedFile = scenarioSelect.value;
        if (!selectedFile) {
            populateEditor({ scenario_info: {}, questions: {} }, "");
            return;
        }
        try {
            const response = await fetch(`/api/scenario/${selectedFile}`);
            if (!response.ok) throw new Error(`Impossible de charger le scénario : ${selectedFile}`);
            const data = await response.json();
            populateEditor(data, selectedFile);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    function populateEditor(data, filename) {
        titleInput.value = data.scenario_info.title || '';
        fileInput.value = filename || data.scenario_info.file || '';
        startQuestionInput.value = data.scenario_info.start_question || '';
        questionsContainer.innerHTML = '';
        if (data.questions) {
            for (const [id, question] of Object.entries(data.questions)) {
                questionsContainer.appendChild(createQuestionElement(id, question));
            }
        }
    }

    function createQuestionElement(id, questionData) {
        const questionWrapper = document.createElement('div');
        questionWrapper.className = 'question';

        const choicesHtml = (questionData.choices || []).map(choice => `
            <div class="choice">
                <input type="text" class="choice-text" value="${choice.text || ''}" placeholder="Texte du choix">
                <input type="text" class="choice-next" value="${choice.next_question || ''}" placeholder="ID question suivante">
                <button type="button" class="delete-btn choice-delete-btn">×</button>
            </div>
        `).join('');

        questionWrapper.innerHTML = `
            <div class="form-group">
                <label>ID de la Question (unique)</label>
                <input type="text" class="question-id-input" value="${id}">
            </div>
            <div class="form-group">
                <label>Texte de la question</label>
                <textarea class="question-text">${questionData.question || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Image de fond (chemin depuis /public)</label>
                <input type="text" class="question-image" value="${questionData.background_image || ''}">
            </div>
            <div class="form-group">
                <label>Choix</label>
                <div class="choices-container">${choicesHtml}</div>
                <button type="button" class="menu-button add-choice-btn" style="margin-top: 0.5rem;">Ajouter un choix</button>
            </div>
            <button type="button" class="menu-button delete-question-btn" style="background-color: #c0392b;">Supprimer la question</button>
        `;
        return questionWrapper;
    }

    function rebuildScenarioFromDOM() {
        const data = {
            scenario_info: {
                title: titleInput.value.trim(),
                file: fileInput.value.trim(),
                start_question: startQuestionInput.value.trim(),
                creators: ["Éditeur Web"], // Placeholder
            },
            questions: {}
        };
        questionsContainer.querySelectorAll('.question').forEach(qEl => {
            const id = qEl.querySelector('.question-id-input').value.trim();
            if (!id) return;
            const choices = Array.from(qEl.querySelectorAll('.choice')).map(cEl => ({
                text: cEl.querySelector('.choice-text').value,
                next_question: cEl.querySelector('.choice-next').value
            }));
            data.questions[id] = {
                question: qEl.querySelector('.question-text').value,
                background_image: qEl.querySelector('.question-image').value,
                choices: choices,
                nextQuestions: choices.reduce((acc, choice, index) => {
                    acc[String.fromCharCode(65 + index)] = choice.next_question;
                    return acc;
                }, {})
            };
        });
        return data;
    }

    async function saveScenario() {
        const scenarioData = rebuildScenarioFromDOM();
        if (!scenarioData.scenario_info.file) {
            alert("Le nom du fichier est obligatoire pour la sauvegarde.");
            return;
        }
        try {
            const response = await fetch('/api/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioData),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(result.message);
            loadScenarioList();
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
            alert(`Erreur: ${error.message}`);
        }
    }

    // --- ÉVÉNEMENTS ---
    loadBtn.addEventListener('click', loadScenarioData);
    saveBtn.addEventListener('click', saveScenario);

    addQuestionBtn.addEventListener('click', () => {
        const newId = `question_${Date.now()}`;
        questionsContainer.appendChild(createQuestionElement(newId, {}));
    });

    questionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-question-btn')) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
                e.target.closest('.question').remove();
            }
        }
        if (e.target.classList.contains('add-choice-btn')) {
            const choicesContainer = e.target.previousElementSibling;
            const choiceEl = document.createElement('div');
            choiceEl.className = 'choice';
            choiceEl.innerHTML = `
                <input type="text" class="choice-text" placeholder="Texte du choix">
                <input type="text" class="choice-next" placeholder="ID question suivante">
                <button type="button" class="delete-btn choice-delete-btn">×</button>
            `;
            choicesContainer.appendChild(choiceEl);
        }
        if (e.target.classList.contains('choice-delete-btn')) {
            e.target.closest('.choice').remove();
        }
    });

    // Initialiser
    loadScenarioList();
});
