document.addEventListener('DOMContentLoaded', () => {
    const scenarioSelect = document.getElementById('scenario-select');
    const loadBtn = document.getElementById('load-scenario-btn');
    const saveBtn = document.getElementById('save-scenario-btn');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const questionsContainer = document.getElementById('questions-container');

    const titleInput = document.getElementById('scenario-title');
    const fileInput = document.getElementById('scenario-file');
    const startQuestionInput = document.getElementById('start-question');

    const notificationArea = document.getElementById('notification-area');
    const modal = document.getElementById('confirmation-modal');
    const modalText = document.getElementById('modal-text');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    let confirmCallback = null;

    // --- LOGIQUE DE NOTIFICATION ET MODALE ---

    function showNotification(message, isError = false) {
        notificationArea.textContent = message;
        notificationArea.className = isError ? 'error' : 'success';
        notificationArea.classList.add('show');
        setTimeout(() => {
            notificationArea.classList.remove('show');
        }, 3000);
    }

    function showConfirmationModal(message, onConfirm) {
        modalText.textContent = message;
        confirmCallback = onConfirm;
        modal.classList.remove('hidden');
    }

    function hideConfirmationModal() {
        modal.classList.add('hidden');
        confirmCallback = null;
    }

    modalConfirmBtn.addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
        }
        hideConfirmationModal();
    });

    modalCancelBtn.addEventListener('click', hideConfirmationModal);


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
        updateNextQuestionDropdowns();
    }

    function createChoiceHtml(choice = {}) {
        const nextQuestion = choice.next_question || '';
        return `
            <div class="choice">
                <input type="text" class="choice-text" value="${choice.text || ''}" placeholder="Texte du choix">
                <select class="choice-next" data-selected="${nextQuestion}">
                    <option value="">-- Choisir la suite --</option>
                </select>
                <button type="button" class="delete-btn choice-delete-btn">×</button>
            </div>
        `;
    }

    function updateNextQuestionDropdowns() {
        const questionIds = Array.from(questionsContainer.querySelectorAll('.question-id-input')).map(input => input.value.trim()).filter(id => id);
        const selects = questionsContainer.querySelectorAll('.choice-next');

        selects.forEach(select => {
            const previouslySelected = select.dataset.selected;
            let currentVal = select.value;

            // Preserve selection if it's still valid
            const selectedValue = previouslySelected || currentVal;

            select.innerHTML = '<option value="">-- Choisir la suite --</option>';
            questionIds.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = id;
                select.appendChild(option);
            });

            // Restore the selection
            if (questionIds.includes(selectedValue)) {
                select.value = selectedValue;
            }
        });
    }

    function createQuestionElement(id, questionData) {
        const questionWrapper = document.createElement('div');
        questionWrapper.className = 'question';
        questionWrapper.dataset.questionId = id;

        const choicesHtml = (questionData.choices || []).map(choice => createChoiceHtml(choice)).join('');

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
            showNotification("Le nom du fichier est obligatoire pour la sauvegarde.", true);
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
            showNotification(result.message);
            loadScenarioList();
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
            showNotification(`Erreur: ${error.message}`, true);
        }
    }

    // --- ÉVÉNEMENTS ---
    loadBtn.addEventListener('click', loadScenarioData);
    saveBtn.addEventListener('click', saveScenario);

    addQuestionBtn.addEventListener('click', () => {
        const newId = `question_${Date.now()}`;
        questionsContainer.appendChild(createQuestionElement(newId, {}));
        updateNextQuestionDropdowns();
    });

    questionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-question-btn')) {
            const questionElement = e.target.closest('.question');
            showConfirmationModal('Êtes-vous sûr de vouloir supprimer cette question ?', () => {
                questionElement.remove();
                updateNextQuestionDropdowns();
            });
        }
        if (e.target.classList.contains('add-choice-btn')) {
            const choicesContainer = e.target.previousElementSibling;
            const choiceEl = document.createElement('div');
            choiceEl.className = 'choice-wrapper'; // Use a wrapper to easily append
            choiceEl.innerHTML = createChoiceHtml();
            choicesContainer.appendChild(choiceEl.firstElementChild); // Append the actual .choice div
            updateNextQuestionDropdowns();
        }
        if (e.target.classList.contains('choice-delete-btn')) {
            e.target.closest('.choice').remove();
        }
    });

    questionsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('question-id-input')) {
            // Debounce input to avoid performance issues
            clearTimeout(window.idUpdateTimeout);
            window.idUpdateTimeout = setTimeout(() => {
                updateNextQuestionDropdowns();
            }, 300);
        }
    });

    // Initialiser
    loadScenarioList();
});
