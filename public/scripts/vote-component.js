// === VOTE COMPONENT CLASS ===
class VoteComponent {
  constructor(container, options) {
    this.container = container;
    this.letter = options.letter;
    this.text = options.text;
    this.count = options.count || 0;
    this.totalVotes = options.totalVotes || 0;
    this.voters = options.voters || [];
    this.isClickable = options.isClickable || false;
    this.isDisabled = options.isDisabled || false;
    this.showVoters = options.showVoters || false;
    this.onVote = options.onVote || null;
    this.nextQuestionId = options.nextQuestionId || null;
    
    this.element = null;
    this.progressBar = null;
    this.stars = [];
    
    this.render();
    this.attachEvents();
    this.updateProgress();
  }
  
  render() {
    // Créer l'élément principal
    this.element = document.createElement('div');
    this.element.className = 'vote-component';
    if (this.isDisabled) {
      this.element.classList.add('disabled');
    }
    
    // Structure HTML - Afficher le compteur seulement pour le MJ
    this.element.innerHTML = `
      <div class="component-inner">
        <div class="vote-background"></div>
        <div class="vote-progress"></div>
        <div class="text-container">
          <div class="vote-text">${this.text}</div>
          ${this.showVoters ? `<div class="vote-count">(${this.count})</div>` : ''}
        </div>
        <div class="star-container">
          <div class="star star-1"></div>
          <div class="star star-2"></div>
          <div class="star star-3"></div>
        </div>
      </div>
      <div class="icon-container">
        <div class="icon-letter">${this.letter}</div>
      </div>
      ${this.showVoters ? '<div class="voters-section"></div>' : ''}
    `;
    
    // Références aux éléments importants
    this.progressBar = this.element.querySelector('.vote-progress');
    this.countElement = this.element.querySelector('.vote-count');
    this.stars = Array.from(this.element.querySelectorAll('.star'));
    
    if (this.showVoters) {
      this.votersSection = this.element.querySelector('.voters-section');
      this.updateVoters();
    }
    
    // Ajouter au conteneur
    this.container.innerHTML = '';
    this.container.appendChild(this.element);
    
    // Ajuster la position initiale de la barre de progression
    const iconContainer = this.element.querySelector('.icon-container');
    const iconRect = iconContainer.getBoundingClientRect();
    const elementRect = this.element.getBoundingClientRect();
    const relativeLeft = iconRect.left - elementRect.left;
    const relativeTop = iconRect.top - elementRect.top;
    
    this.progressBar.style.left = `${relativeLeft}px`;
    this.progressBar.style.top = `${relativeTop}px`;
    this.progressBar.style.height = `${iconContainer.offsetHeight}px`;
  }
  
  attachEvents() {
    if (!this.isClickable || this.isDisabled) return;
    
    this.element.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.isDisabled) return;
      
      // Pour le MJ, gérer le clic sur toute la zone
      if (this.showVoters && this.nextQuestionId && this.onVote) {
        this.onVote(this.nextQuestionId);
        return;
      }
      
      // Pour le joueur, animer et voter
      if (!this.showVoters && this.onVote) {
        this.select();
        this.animateStars();
        this.onVote(this.letter);
      }
    });
  }
  
  updateProgress() {
    const percentage = this.totalVotes > 0 ? (this.count / this.totalVotes) * 100 : 0;
    
    // Important: utiliser les dimensions après que l'élément soit rendu
    setTimeout(() => {
      const iconContainer = this.element.querySelector('.icon-container');
      const componentInner = this.element.querySelector('.component-inner');
      
      if (!iconContainer || !componentInner) return;
      
      const iconWidth = iconContainer.offsetWidth;
      const iconLeft = iconContainer.offsetLeft;
      const maxWidth = componentInner.offsetWidth - iconLeft;
      
      const minWidth = iconWidth;
      const targetWidth = minWidth + ((maxWidth - minWidth) * (percentage / 100));
      
      this.progressBar.style.width = `${targetWidth}px`;
      
      // Ajuster le border-radius
      if (targetWidth > iconWidth + 5) {
        this.progressBar.style.borderTopRightRadius = '0px';
        this.progressBar.style.borderBottomRightRadius = '0px';
      } else {
        this.progressBar.style.borderTopRightRadius = '100px';
        this.progressBar.style.borderBottomRightRadius = '100px';
      }
    }, 50); // Petit délai pour s'assurer que le DOM est prêt
  }
  
  updateVoters() {
    if (!this.votersSection) return;
    
    this.votersSection.innerHTML = '';
    this.voters.forEach(voter => {
      const pill = document.createElement('span');
      pill.className = 'player-pill small';
      pill.textContent = voter;
      this.votersSection.appendChild(pill);
    });
    
    // Ajuster la classe du conteneur parent si nécessaire
    if (this.voters.length > 0) {
      this.container.classList.add('has-voters');
    } else {
      this.container.classList.remove('has-voters');
    }
  }
  
  animateStars() {
    this.stars.forEach((star, index) => {
      star.classList.remove('animate');
      void star.offsetWidth; // Force reflow
      setTimeout(() => {
        star.classList.add('animate');
      }, index * 100); // Décalage pour chaque étoile
    });
  }
  
  select() {
    // Retirer la sélection des autres composants
    document.querySelectorAll('.vote-component').forEach(el => {
      el.classList.remove('selected');
    });
    this.element.classList.add('selected');
  }
  
  disable() {
    this.isDisabled = true;
    this.element.classList.add('disabled');
  }
  
  update(data) {
    if (data.count !== undefined) {
      this.count = data.count;
      if (this.countElement) {
        this.countElement.textContent = `(${this.count})`;
      }
    }
    
    if (data.totalVotes !== undefined) {
      this.totalVotes = data.totalVotes;
    }
    
    if (data.voters !== undefined) {
      this.voters = data.voters;
      if (this.showVoters) {
        this.updateVoters();
      }
    }
    
    this.updateProgress();
  }
  
  showVoteAnimation() {
    this.animateStars();
    this.select();
  }
}

// Export pour utilisation globale
window.VoteComponent = VoteComponent;