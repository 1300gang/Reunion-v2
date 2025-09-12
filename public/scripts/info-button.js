// ============================================================================
// INFO-BUTTON.JS - Bouton Info avec style glassmorphism identique
// ============================================================================

class InfoButton {
  constructor() {
    // Configuration
    this.config = {
      infoUrl: '../info.html', // Changez l'URL ici quand la page sera créée
      position: 'bottom-right',
      tooltipText: 'Informations & Crédits',
      tooltipHint: 'En savoir plus sur le projet'
    };
    
    // Éléments
    this.container = null;
    this.button = null;
    this.tooltip = null;
    
    // Initialisation
    this.init();
  }
  
  // ============================================================================
  // INITIALISATION
  // ============================================================================
  
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    // Créer l'interface
    this.createUI();
    
    // Ajouter les styles
    this.injectStyles();
    
    // Configurer les événements
    this.setupEventListeners();
    
    console.log('ℹ️ Bouton Info initialisé');
  }
  
  // ============================================================================
  // CRÉATION DES ÉLÉMENTS
  // ============================================================================
  
  createUI() {
    // Conteneur principal
    this.container = document.createElement('div');
    this.container.id = 'info-button-container';
    this.container.className = 'info-btn-container';
    
    // Bouton info
    this.button = document.createElement('a');
    this.button.href = this.config.infoUrl;
    this.button.target = '_blank'; // Ouvre dans un nouvel onglet
    this.button.rel = 'noopener noreferrer'; // Sécurité
    this.button.className = 'info-btn';
    this.button.setAttribute('aria-label', 'Informations sur le projet');
    this.button.innerHTML = this.getInfoIcon();
    
    // Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'info-tooltip';
    this.tooltip.innerHTML = `
      <div class="tooltip-content">
        <span class="tooltip-icon">ℹ️</span>
        <span class="tooltip-text">${this.config.tooltipText}</span>
        <span class="tooltip-hint">${this.config.tooltipHint}</span>
      </div>
    `;
    
    // Assemblage
    this.container.appendChild(this.tooltip);
    this.container.appendChild(this.button);
    
    // Ajouter au body
    document.body.appendChild(this.container);
  }
  
  // ============================================================================
  // STYLES
  // ============================================================================
  
  injectStyles() {
    // Vérifier si les styles existent déjà
    if (document.getElementById('info-button-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'info-button-styles';
    style.textContent = `
      /* Conteneur du bouton info */
      .info-btn-container {
        position: fixed;
        bottom: 30px;
        right: 30px; /* En bas à droite */
        z-index: 999;
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideInInfo 0.5s ease-out 0.2s both; /* Délai pour apparaître après l'audio */
      }
      
      /* Bouton info avec glassmorphism identique */
      .info-btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--couleur-noirVolcan, #322a22);
        font-size: 20px;
        text-decoration: none;
        padding: 0;
        outline: none;
      }
      
      .info-btn:hover {
        transform: scale(1.1);
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.3);
      }
      
      .info-btn:active {
        transform: scale(0.95);
      }
      
      /* Animation de pulsation au chargement */
      .info-btn.pulse-once {
        animation: pulseOnce 1s ease-out 1s;
      }
      
      /* Tooltip identique au lecteur audio */
      .info-tooltip {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 12px;
        padding: 10px 15px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        opacity: 0;
        pointer-events: none;
        transform: translateX(-10px);
        transition: all 0.3s ease;
        white-space: nowrap;
      }
      
      .info-btn-container:hover .info-tooltip {
        opacity: 1;
        transform: translateX(0);
      }
      
      .tooltip-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-family: 'Satoshi-Regular', 'Inter', sans-serif;
        font-size: 12px;
        color: var(--couleur-noirVolcan, #322a22);
      }
      
      .tooltip-icon {
        font-size: 16px;
      }
      
      .tooltip-text {
        font-weight: 600;
        font-size: 13px;
      }
      
      .tooltip-hint {
        opacity: 0.7;
        font-size: 11px;
      }
      
      /* Animation d'entrée depuis la gauche (plus logique visuellement) */
      @keyframes slideInInfo {
        from {
          opacity: 0;
          transform: translateX(-50px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      /* Animation de pulsation unique */
      @keyframes pulseOnce {
        0%, 100% {
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
        }
        50% {
          box-shadow: 0 8px 45px 0 rgba(31, 38, 135, 0.4);
          transform: scale(1.05);
        }
      }
      
      /* Groupe de boutons (audio + info) */
      .button-group-indicator {
        position: fixed;
        bottom: 90px;
        left: 30px;
        display: flex;
        gap: 20px;
        opacity: 0;
        animation: fadeInGroup 0.5s ease-out 1s forwards;
      }
      
      @keyframes fadeInGroup {
        to {
          opacity: 1;
        }
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .info-btn-container {
          bottom: 20px;
          right: 20px;
        }
        
        .info-btn {
          width: 45px;
          height: 45px;
          font-size: 18px;
        }
        
        .info-tooltip {
          display: none;
        }
      }
      
      /* Si seulement le bouton info (sans lecteur audio) */
      .info-btn-container.standalone {
        right: 30px;
        animation: slideInInfo 0.5s ease-out;
      }
      
      /* Hover effect coordonné avec le lecteur audio */
      .info-btn-container:hover ~ .audio-player-container .audio-play-btn,
      .audio-player-container:hover ~ .info-btn-container .info-btn {
        opacity: 0.8;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // ============================================================================
  // ICÔNE
  // ============================================================================
  
  getInfoIcon() {
    return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
  }
  
  // ============================================================================
  // ÉVÉNEMENTS
  // ============================================================================
  
  setupEventListeners() {
    // Animation de pulsation au premier chargement
    setTimeout(() => {
      this.button.classList.add('pulse-once');
    }, 500);
    
    // Tracking du clic (optionnel)
    this.button.addEventListener('click', (e) => {
      console.log('ℹ️ Ouverture de la page info');
      
      // Si la page n'existe pas encore, vous pouvez empêcher l'ouverture
      // et afficher un message temporaire
      if (this.config.infoUrl === '/info.html') {
        e.preventDefault();
        this.showTemporaryMessage();
      }
    });
    
    // Raccourci clavier (Ctrl+I pour Info)
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'i' && e.ctrlKey) {
        e.preventDefault();
        this.button.click();
      }
    });
  }
  
  // ============================================================================
  // MESSAGE TEMPORAIRE (si la page n'existe pas encore)
  // ============================================================================
  
  showTemporaryMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 30px;
      left: auto;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 15px 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      font-family: 'Satoshi-Regular', 'Inter', sans-serif;
      font-size: 14px;
      color: var(--couleur-noirVolcan, #322a22);
      width: 250px;
      text-align: left;
      opacity: 0;
      transform: translateY(20px) translateX(0);
      transition: all 0.3s ease;
      z-index: 1000;
    `;
    
    message.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 5px;">
        📝 Page en construction
      </div>
      <div style="opacity: 0.8; font-size: 13px;">
        La page d'informations sera bientôt disponible !
      </div>
    `;
    
    document.body.appendChild(message);
    
    // Animation
    setTimeout(() => {
      message.style.opacity = '1';
      message.style.transform = 'translateY(0)';
    }, 10);
    
    // Disparition
    setTimeout(() => {
      message.style.opacity = '0';
      message.style.transform = 'translateY(20px)';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }
  
  // ============================================================================
  // API PUBLIQUE
  // ============================================================================
  
  setUrl(url) {
    this.config.infoUrl = url;
    if (this.button) {
      this.button.href = url;
    }
  }
  
  show() {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }
  
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
  
  destroy() {
    this.container?.remove();
    document.getElementById('info-button-styles')?.remove();
  }
  
  // Vérifier si le lecteur audio est présent pour ajuster la position
  adjustPosition() {
    const audioPlayer = document.querySelector('.audio-player-container');
    if (!audioPlayer) {
      this.container.classList.add('standalone');
      this.container.style.right = '30px';
    }
  }
}

// ============================================================================
// INITIALISATION AUTOMATIQUE
// ============================================================================

// Créer l'instance globale
window.infoButton = new InfoButton();

// Ajuster la position si nécessaire
setTimeout(() => {
  window.infoButton.adjustPosition();
}, 100);

// Log de confirmation
console.log('ℹ️ Info Button chargé - Contrôles disponibles via window.infoButton');