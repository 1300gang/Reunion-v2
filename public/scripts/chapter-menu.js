// === CHAPTERS MENU CLASS - VERSION FINALE ===

class ChaptersMenu {
  constructor(container, options = {}) {
    // Configuration
    this.container = container;
    this.scenario = options.scenario || null;
    this.currentQuestion = options.currentQuestion || null;
    this.responses = options.responses || {};
    this.questionPath = options.questionPath || [];
    
    // État
    this.isOpen = false;
    this.currentView = 'list'; // 'list' ou 'details'
    this.currentChapter = null;
    this.elements = {};
    
    // Données des joueurs (mises à jour via update())
    this.playersData = options.playersData || {
      allPlayers: [],
      votedPlayers: {},
      waitingPlayers: []
    };
    
    // Callbacks optionnels
    this.onChapterSelect = options.onChapterSelect || null;
    this.onMenuToggle = options.onMenuToggle || null;
    
    // Initialisation
    this.init();
  }
  
  // ============================================
  // INITIALISATION
  // ============================================
  
  init() {
    // Remplacer complètement le container
    this.createWrapper();
    this.createTogglePill();
    this.createOverlay();
    this.createModal();
    this.attachEvents();
    
    // Charger les chapitres si scenario disponible
    if (this.scenario) {
      this.loadChapters();
    }
  }
  
  createWrapper() {
    // Créer un wrapper qui remplace le container original
    const wrapper = document.createElement('div');
    wrapper.className = 'chapters-menu-wrapper';
    
    // Remplacer le container
    this.container.parentNode.replaceChild(wrapper, this.container);
    this.container = wrapper;
  }
  
  // ============================================
  // CRÉATION DES ÉLÉMENTS
  // ============================================
  
  createTogglePill() {
    const pill = document.createElement('button');
    pill.className = 'chapters-toggle-pill';
    pill.innerHTML = `
      <span class="pill-icon">📚</span>
      <span>Chapitres</span>
    `;
    
    document.body.appendChild(pill);
    this.elements.togglePill = pill;
  }
  
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'chapters-overlay';
    
    document.body.appendChild(overlay);
    this.elements.overlay = overlay;
  }
  
  createModal() {
    const modal = document.createElement('div');
    modal.className = 'chapters-modal-card';
    modal.innerHTML = `
      <!-- Header -->
      <div class="chapters-card-header">
        <h2 class="chapters-header-title">
          <span>📖</span>
          <span>Chapitres du scénario</span>
        </h2>
        <button class="chapters-close-btn">
          <span>✕</span>
        </button>
      </div>
      
      <!-- Contenu -->
      <div class="chapters-modal-content">
        <!-- Vue Liste -->
        <div class="chapters-list-view">
          <!-- Légende -->
          <div class="chapters-legend">
            <div class="chapters-legend-item">
              <span class="chapters-legend-dot current"></span>
              <span>En cours</span>
            </div>
            <div class="chapters-legend-item">
              <span class="chapters-legend-dot completed"></span>
              <span>Complété</span>
            </div>
            <div class="chapters-legend-item">
              <span class="chapters-legend-dot pending"></span>
              <span>À venir</span>
            </div>
          </div>
          
          <!-- Liste des chapitres -->
          <div class="chapters-list"></div>
        </div>
        
        <!-- Vue Détails -->
        <div class="chapter-details-view">
          <div class="chapter-details-header">
            <button class="chapter-back-button">
              <span>←</span>
            </button>
            <div class="chapter-details-title-container">
              <h3 class="chapter-details-title">Titre du chapitre</h3>
              <div class="chapter-details-status-badge">En cours</div>
            </div>
          </div>
          
          <div class="chapter-details-content">
            <!-- Section Contexte -->
            <div class="chapter-detail-section">
              <div class="chapter-detail-section-title">
                <span>📍</span>
                <span>Contexte</span>
              </div>
              <div class="chapter-detail-section-content" id="chapter-detail-context">
                <!-- Contexte -->
              </div>
            </div>
            
            <!-- Section Question -->
            <div class="chapter-detail-section">
              <div class="chapter-detail-section-title">
                <span>❓</span>
                <span>Question posée</span>
              </div>
              <div class="chapter-detail-section-content" id="chapter-detail-question">
                <!-- Question -->
              </div>
            </div>
            
            <!-- Section Votes -->
            <div class="chapter-detail-section">
              <div class="chapter-detail-section-title">
                <span>📊</span>
                <span>Réponses et votes</span>
              </div>
              <div class="chapter-votes-container">
                <!-- VoteComponents seront insérés ici -->
              </div>
              
              <!-- Section joueurs en attente -->
              <div class="chapter-waiting-players-section" style="display: none;">
                <div class="chapter-waiting-players-title">⏳ En attente de vote :</div>
                <div class="chapter-waiting-players-list">
                  <!-- Pills des joueurs en attente -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.elements.modal = modal;
    
    // Stocker les références aux éléments importants
    this.elements.closeBtn = modal.querySelector('.chapters-close-btn');
    this.elements.listView = modal.querySelector('.chapters-list-view');
    this.elements.detailsView = modal.querySelector('.chapter-details-view');
    this.elements.chaptersList = modal.querySelector('.chapters-list');
    this.elements.backButton = modal.querySelector('.chapter-back-button');
    this.elements.detailsTitle = modal.querySelector('.chapter-details-title');
    this.elements.detailsStatusBadge = modal.querySelector('.chapter-details-status-badge');
    this.elements.votesContainer = modal.querySelector('.chapter-votes-container');
    this.elements.waitingSection = modal.querySelector('.chapter-waiting-players-section');
    this.elements.waitingList = modal.querySelector('.chapter-waiting-players-list');
  }
  
  // ============================================
  // GESTION DES ÉVÉNEMENTS
  // ============================================
  
  attachEvents() {
    // Toggle menu
    this.elements.togglePill.addEventListener('click', () => this.toggleMenu());
    
    // Fermer via overlay
    this.elements.overlay.addEventListener('click', () => this.closeMenu());
    
    // Fermer via bouton close
    this.elements.closeBtn.addEventListener('click', () => this.closeMenu());
    
    // Retour à la liste
    this.elements.backButton.addEventListener('click', () => this.backToList());
    
    // Échap pour fermer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
      }
    });
  }
  
  // ============================================
  // MÉTHODES DE NAVIGATION
  // ============================================
  
  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }
  
  openMenu() {
    this.isOpen = true;
    this.elements.togglePill.classList.add('active');
    this.elements.overlay.classList.add('active');
    this.elements.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Callback
    if (this.onMenuToggle) {
      this.onMenuToggle(true);
    }
    
    // Rafraîchir les données
    this.refreshChaptersData();
  }
  
  closeMenu() {
    this.isOpen = false;
    this.elements.togglePill.classList.remove('active');
    this.elements.overlay.classList.remove('active');
    this.elements.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Revenir à la liste si on était dans les détails
    if (this.currentView === 'details') {
      this.backToList();
    }
    
    // Callback
    if (this.onMenuToggle) {
      this.onMenuToggle(false);
    }
  }
  
  showChapterDetails(chapterId) {
    this.currentChapter = chapterId;
    this.currentView = 'details';
    
    // Masquer liste, afficher détails
    this.elements.listView.classList.add('hidden');
    this.elements.detailsView.classList.add('active');
    
    // Charger les détails du chapitre
    this.loadChapterDetails(chapterId);
    
    // Callback
    if (this.onChapterSelect) {
      this.onChapterSelect(chapterId);
    }
  }
  
  backToList() {
    this.currentView = 'list';
    this.currentChapter = null;
    
    this.elements.detailsView.classList.remove('active');
    this.elements.listView.classList.remove('hidden');
  }
  
  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================
  
  loadChapters() {
    if (!this.scenario || !this.scenario.questions) return;
    
    const chaptersList = this.elements.chaptersList;
    chaptersList.innerHTML = '';
    
    // Parcourir les questions et créer les chapitres
    let chapterIndex = 1;
    
    for (const [questionId, questionData] of Object.entries(this.scenario.questions)) {
      // Déterminer le statut
      let status = 'pending';
      if (this.responses[questionId]) {
        status = 'completed';
      } else if (questionId === this.currentQuestion) {
        status = 'current';
      }
      
      // Calculer le nombre de votes
      const voteCount = this.calculateVotes(questionId);
      
      // Créer l'élément chapitre
      const chapterEl = this.createChapterElement({
        id: questionId,
        index: chapterIndex,
        title: questionData.question || `Chapitre ${chapterIndex}`,
        context: questionData.context || '',
        status: status,
        voteCount: voteCount
      });
      
      chaptersList.appendChild(chapterEl);
      chapterIndex++;
    }
  }
  
  createChapterElement(chapterData) {
    const div = document.createElement('div');
    div.className = `chapter-option ${chapterData.status}`;
    div.onclick = () => this.showChapterDetails(chapterData.id);
    
    // Badge de statut
    let statusText = '';
    if (chapterData.status === 'current') statusText = 'En cours';
    else if (chapterData.status === 'completed') statusText = 'Complété';
    else statusText = 'À venir';
    
    div.innerHTML = `
      <div class="chapter-option-header">
        <div class="chapter-number">${chapterData.index}</div>
        <div class="chapter-name">${this.truncateText(chapterData.title, 50)}</div>
        <div class="chapter-status-badge ${chapterData.status}">${statusText}</div>
      </div>
      <div class="chapter-context">
        ${this.truncateText(chapterData.context, 100)}
      </div>
      <div class="chapter-votes-info">
        <span>📊</span>
        <span class="chapter-vote-badge">${chapterData.voteCount} votes</span>
      </div>
    `;
    
    return div;
  }
  
  loadChapterDetails(chapterId) {
    if (!this.scenario || !this.scenario.questions[chapterId]) return;
    
    const questionData = this.scenario.questions[chapterId];
    
    // Déterminer le statut
    let status = 'pending';
    let statusText = 'À venir';
    if (this.responses[chapterId]) {
      status = 'completed';
      statusText = 'Complété';
    } else if (chapterId === this.currentQuestion) {
      status = 'current';
      statusText = 'En cours';
    }
    
    // Mettre à jour le titre et le badge
    this.elements.detailsTitle.textContent = questionData.question || 'Question';
    this.elements.detailsStatusBadge.textContent = statusText;
    this.elements.detailsStatusBadge.className = `chapter-details-status-badge ${status}`;
    
    // Mettre à jour le contexte et la question
    document.getElementById('chapter-detail-context').textContent = questionData.context || 'Aucun contexte disponible';
    document.getElementById('chapter-detail-question').textContent = questionData.question || 'Aucune question';
    
    // Créer les vote components
    this.createVoteComponents(questionData);
    
    // Mettre à jour les joueurs en attente
    this.updateWaitingPlayers();
  }
  
  createVoteComponents(questionData) {
    const container = this.elements.votesContainer;
    container.innerHTML = '';
    
    if (!questionData.choices) return;
    
    // Calculer les votes totaux
    const voteData = this.getVoteData(questionData.id);
    const totalVotes = Object.values(voteData.counts).reduce((sum, count) => sum + count, 0);
    
    // Créer un VoteComponent pour chaque choix
    questionData.choices.forEach((choice, index) => {
      const letter = String.fromCharCode(65 + index);
      const voteDiv = document.createElement('div');
      container.appendChild(voteDiv);
      
      // Créer le VoteComponent (utilise la classe existante)
      if (typeof VoteComponent !== 'undefined') {
        new VoteComponent(voteDiv, {
          letter: letter,
          text: choice,
          count: voteData.counts[letter] || 0,
          totalVotes: totalVotes,
          voters: voteData.voters[letter] || [],
          showVoters: true,
          isClickable: false
        });
        
        // Ajouter les pills des joueurs
        if (voteData.voters[letter] && voteData.voters[letter].length > 0) {
          const votersDiv = document.createElement('div');
          votersDiv.className = 'chapter-voters-pills';
          votersDiv.innerHTML = voteData.voters[letter].map(voter => 
            `<span class="chapter-voter-pill">${voter}</span>`
          ).join('');
          voteDiv.appendChild(votersDiv);
        }
      }
    });
  }
  
  updateWaitingPlayers() {
    const waitingPlayers = this.playersData.waitingPlayers || [];
    
    if (waitingPlayers.length > 0) {
      this.elements.waitingSection.style.display = 'block';
      this.elements.waitingList.innerHTML = waitingPlayers.map(player => 
        `<span class="chapter-waiting-pill">${player}</span>`
      ).join('');
    } else {
      this.elements.waitingSection.style.display = 'none';
    }
  }
  
  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================
  
  calculateVotes(questionId) {
    // Compter les votes pour cette question
    if (!this.responses[questionId]) return 0;
    
    const response = this.responses[questionId];
    let total = 0;
    
    if (response.voteCounts) {
      total = Object.values(response.voteCounts).reduce((sum, count) => sum + count, 0);
    }
    
    return total;
  }
  
  getVoteData(questionId) {
    const response = this.responses[questionId] || {};
    const voteData = {
      counts: {},
      voters: {}
    };
    
    if (response.voteCounts) {
      voteData.counts = response.voteCounts;
    }
    
    if (response.voteDetails) {
      voteData.voters = response.voteDetails;
    }
    
    // Si pas de données, utiliser les données des joueurs actuels
    if (questionId === this.currentQuestion && this.playersData.votedPlayers) {
      for (const [choice, players] of Object.entries(this.playersData.votedPlayers)) {
        voteData.voters[choice] = players;
        voteData.counts[choice] = players.length;
      }
    }
    
    return voteData;
  }
  
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  refreshChaptersData() {
    // Recharger les chapitres avec les données actuelles
    if (this.scenario) {
      this.loadChapters();
    }
  }
  
  // ============================================
  // MÉTHODE DE MISE À JOUR (appelée lors des changements de question)
  // ============================================
  
  update(options = {}) {
    // Mettre à jour les propriétés
    if (options.currentQuestion !== undefined) {
      this.currentQuestion = options.currentQuestion;
    }
    
    if (options.responses !== undefined) {
      this.responses = options.responses;
    }
    
    if (options.questionPath !== undefined) {
      this.questionPath = options.questionPath;
    }
    
    if (options.playersData !== undefined) {
      this.playersData = options.playersData;
    }
    
    // Rafraîchir l'affichage si le menu est ouvert
    if (this.isOpen) {
      if (this.currentView === 'list') {
        this.refreshChaptersData();
      } else if (this.currentView === 'details' && this.currentChapter) {
        this.loadChapterDetails(this.currentChapter);
      }
    }
  }
  
  // ============================================
  // DESTRUCTION
  // ============================================
  
  destroy() {
    // Supprimer tous les éléments créés
    if (this.elements.togglePill) {
      this.elements.togglePill.remove();
    }
    
    if (this.elements.overlay) {
      this.elements.overlay.remove();
    }
    
    if (this.elements.modal) {
      this.elements.modal.remove();
    }
    
    // Restaurer le body overflow
    document.body.style.overflow = '';
    
    // Nettoyer les références
    this.elements = {};
  }
}

// Export pour utilisation globale
window.ChaptersMenu = ChaptersMenu;