// === CHAPTERS MENU CLASS ===
class ChaptersMenu {
  constructor(container, options = {}) {
    this.container = container;
    this.scenario = options.scenario || null;
    this.currentQuestion = options.currentQuestion || null;
    this.responses = options.responses || {};
    this.questionPath = options.questionPath || [];
    this.onQuestionSelect = options.onQuestionSelect || null;
    
    this.currentView = 'list'; // 'list' ou 'details'
    this.selectedChapter = null;
    
    this.init();
  }
  
  init() {
    this.render();
    this.attachEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="chapters-menu-container">
        <div class="chapters-list-view" id="chaptersListView">
          ${this.renderListView()}
        </div>
        <div class="chapter-details-view" id="chapterDetailsView">
          <!-- Contenu dynamique -->
        </div>
      </div>
    `;
  }
  
  renderListView() {
    const chapters = this.getChapters();
    
    return `
      <div class="chapters-header">
        <div class="chapters-title">
          <span class="chapters-title-icon">📚</span>
          <span>Chapitres & Scènes</span>
        </div>
        <div class="chapters-legend">
          <div class="legend-item">
            <div class="legend-dot current"></div>
            <span>En cours</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot completed"></div>
            <span>Complété</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot pending"></div>
            <span>À venir</span>
          </div>
        </div>
      </div>
      <div class="chapters-list">
        ${chapters.map(chapter => this.renderChapterItem(chapter)).join('')}
      </div>
    `;
  }
  
  renderChapterItem(chapter) {
    const status = this.getChapterStatus(chapter.id);
    const voteInfo = this.getVoteInfo(chapter.id);
    
    return `
      <div class="chapter-item ${status}" data-chapter-id="${chapter.id}">
        <div class="chapter-number">${chapter.number}</div>
        <div class="chapter-info">
          <div class="chapter-name">${chapter.title}</div>
          <div class="chapter-description">${chapter.context || ''}</div>
        </div>
        <div class="chapter-status">
          ${status === 'current' ? '<span class="status-icon">📍</span>' : ''}
          ${status === 'completed' ? '<span class="status-icon">✅</span>' : ''}
          ${status === 'pending' ? '<span class="status-icon">⏳</span>' : ''}
          ${voteInfo.total > 0 ? `<span class="vote-count">${voteInfo.total} votes</span>` : ''}
        </div>
      </div>
    `;
  }
  
  renderDetailsView(chapterId) {
    const chapter = this.getChapterById(chapterId);
    if (!chapter) return '';
    
    const status = this.getChapterStatus(chapterId);
    const voteInfo = this.getVoteInfo(chapterId);
    
    return `
      <div class="details-header">
        <button class="back-button" id="backToListBtn">
          <span>←</span>
        </button>
        <div class="details-title">${chapter.title}</div>
        <div class="details-status ${status}">
          ${status === 'current' ? 'En cours' : ''}
          ${status === 'completed' ? 'Complété' : ''}
          ${status === 'pending' ? 'À venir' : ''}
        </div>
      </div>
      <div class="details-content">
        ${this.renderDetailsContent(chapter, status, voteInfo)}
      </div>
    `;
  }
  
  renderDetailsContent(chapter, status, voteInfo) {
    let content = '';
    
    // Contexte
    if (chapter.context) {
      content += `
        <div class="detail-section">
          <div class="detail-section-title">
            <span>📍</span>
            <span>Contexte</span>
          </div>
          <div class="detail-section-content">
            ${chapter.context}
          </div>
        </div>
      `;
    }
    
    // Question
    if (chapter.question) {
      content += `
        <div class="detail-section">
          <div class="detail-section-title">
            <span>❓</span>
            <span>Question</span>
          </div>
          <div class="detail-section-content">
            ${chapter.question}
          </div>
        </div>
      `;
    }
    
    // Choix et résultats
    if (chapter.choices && chapter.choices.length > 0) {
      content += `
        <div class="detail-section">
          <div class="detail-section-title">
            <span>📊</span>
            <span>${status === 'pending' ? 'Choix possibles' : 'Résultats'}</span>
          </div>
          <div class="detail-section-content">
            ${this.renderVoteResults(chapter, voteInfo, status)}
          </div>
        </div>
      `;
    }
    
    // Message si pas encore joué
    if (status === 'pending' && !chapter.question) {
      content = `
        <div class="not-played-message">
          Cette scène n'a pas encore été jouée.
          Elle sera disponible prochainement dans la progression du jeu.
        </div>
      `;
    }
    
    return content;
  }
  
  renderVoteResults(chapter, voteInfo, status) {
    if (!chapter.choices) return '';
    
    return `
      <div class="vote-results">
        ${chapter.choices.map((choice, index) => {
          const letter = String.fromCharCode(65 + index);
          const votes = voteInfo.details[letter] || 0;
          const voters = voteInfo.voters[letter] || [];
          const percentage = voteInfo.total > 0 ? (votes / voteInfo.total * 100) : 0;
          
          return `
            <div class="vote-option">
              <div class="vote-option-header">
                <div class="vote-letter">${letter}</div>
                <div class="vote-text">${choice}</div>
                ${status !== 'pending' ? `<div class="vote-count-badge">${votes}</div>` : ''}
              </div>
              ${status !== 'pending' && voteInfo.total > 0 ? `
                <div class="vote-progress">
                  <div class="vote-progress-bar" style="width: ${percentage}%"></div>
                </div>
                ${voters.length > 0 ? `
                  <div class="vote-voters">
                    ${voters.map(voter => `<span class="voter-pill">${voter}</span>`).join('')}
                  </div>
                ` : ''}
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  getChapters() {
    if (!this.scenario || !this.scenario.questions) return [];
    
    const chapters = [];
    let chapterNumber = 1;
    
    // Parcourir les questions dans l'ordre du scénario
    for (const [questionId, questionData] of Object.entries(this.scenario.questions)) {
      // Ignorer les questions "Continuer"
      if (questionData.choices && 
          questionData.choices.length === 1 && 
          (questionData.choices[0].toLowerCase() === 'continuer' || !questionData.question)) {
        continue;
      }
      
      chapters.push({
        id: questionId,
        number: chapterNumber++,
        title: this.getChapterTitle(questionData),
        context: questionData.context || '',
        question: questionData.question || '',
        choices: questionData.choices || [],
        metadata: questionData.metadata || {}
      });
    }
    
    return chapters;
  }
  
  getChapterById(chapterId) {
    const chapters = this.getChapters();
    return chapters.find(c => c.id === chapterId);
  }
  
  getChapterTitle(questionData) {
    // Essayer d'extraire un titre du contexte ou utiliser l'ID
    if (questionData.metadata && questionData.metadata.scene_title) {
      return questionData.metadata.scene_title;
    }
    
    // Utiliser les premiers mots du contexte
    if (questionData.context) {
      const words = questionData.context.split(' ').slice(0, 5);
      return words.join(' ') + (questionData.context.split(' ').length > 5 ? '...' : '');
    }
    
    // Utiliser l'ID formaté
    if (questionData.id) {
      return questionData.id.replace(/_/g, ' ').replace(/scene/gi, 'Scène');
    }
    
    return 'Scène';
  }
  
  getChapterStatus(chapterId) {
    if (this.currentQuestion === chapterId) {
      return 'current';
    }
    if (this.questionPath.includes(chapterId)) {
      return 'completed';
    }
    return 'pending';
  }
  
  getVoteInfo(chapterId) {
    const voteInfo = {
      total: 0,
      details: {},
      voters: {}
    };
    
    if (!this.responses || !this.responses[chapterId]) {
      return voteInfo;
    }
    
    // Compter les votes par option
    const votes = { A: 0, B: 0, C: 0, D: 0 };
    const voters = { A: [], B: [], C: [], D: [] };
    
    for (const [playerName, answer] of Object.entries(this.responses[chapterId])) {
      if (votes[answer] !== undefined) {
        votes[answer]++;
        voters[answer].push(playerName);
        voteInfo.total++;
      }
    }
    
    voteInfo.details = votes;
    voteInfo.voters = voters;
    
    return voteInfo;
  }
  
  // === GESTION DES ÉVÉNEMENTS ===
  
  attachEvents() {
    // Délégation d'événements pour les éléments dynamiques
    this.container.addEventListener('click', (e) => {
      // Clic sur un chapitre
      const chapterItem = e.target.closest('.chapter-item');
      if (chapterItem) {
        const chapterId = chapterItem.dataset.chapterId;
        this.showDetails(chapterId);
        return;
      }
      
      // Clic sur le bouton retour
      if (e.target.closest('#backToListBtn')) {
        this.showList();
        return;
      }
    });
  }
  
  showDetails(chapterId) {
    this.selectedChapter = chapterId;
    
    const listView = document.getElementById('chaptersListView');
    const detailsView = document.getElementById('chapterDetailsView');
    const header = listView.querySelector('.chapters-header');
    
    // Animation de sortie de la liste
    header.classList.add('slide-up');
    listView.classList.add('hiding');
    
    // Préparer le contenu des détails
    detailsView.innerHTML = this.renderDetailsView(chapterId);
    
    // Animation d'entrée des détails
    setTimeout(() => {
      listView.style.display = 'none';
      detailsView.classList.add('active');
      this.currentView = 'details';
    }, 300);
  }
  
  showList() {
    const listView = document.getElementById('chaptersListView');
    const detailsView = document.getElementById('chapterDetailsView');
    const header = listView.querySelector('.chapters-header');
    
    // Animation de sortie des détails
    detailsView.classList.remove('active');
    
    setTimeout(() => {
      listView.style.display = 'block';
      
      // Petite pause pour que le display soit appliqué
      setTimeout(() => {
        listView.classList.remove('hiding');
        header.classList.remove('slide-up');
        this.currentView = 'list';
      }, 50);
    }, 300);
  }
  
  // === MÉTHODES PUBLIQUES ===
  
  update(data) {
    if (data.currentQuestion !== undefined) {
      this.currentQuestion = data.currentQuestion;
    }
    if (data.responses !== undefined) {
      this.responses = data.responses;
    }
    if (data.questionPath !== undefined) {
      this.questionPath = data.questionPath;
    }
    
    // Re-render si on est en vue liste
    if (this.currentView === 'list') {
      const listView = document.getElementById('chaptersListView');
      if (listView) {
        listView.innerHTML = this.renderListView();
      }
    }
  }
  
  destroy() {
    this.container.innerHTML = '';
  }
}

// Export pour utilisation globale
window.ChaptersMenu = ChaptersMenu;