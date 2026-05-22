// ============================================================================
// MENU-BUTTON.JS - Bouton retour au menu en haut à gauche
// ============================================================================

class MenuButton {
  constructor() {
    // Configuration
    this.config = {
      menuUrl: 'menu.html',
      position: 'top-left',
      tooltipText: 'Retour au menu',
      tooltipHint: 'Quitter la partie en cours',
      confirmMessage: 'Êtes-vous sûr de vouloir retourner au menu ?\n\nToutes les données de la partie en cours seront perdues.'
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
    
    console.log('🏠 Bouton Menu initialisé');
  }
  
  // ============================================================================
  // CRÉATION DES ÉLÉMENTS
  // ============================================================================
  
  createUI() {
    // Conteneur principal
    this.container = document.createElement('div');
    this.container.id = 'menu-button-container';
    this.container.className = 'menu-btn-container';
    
    // Bouton menu
    this.button = document.createElement('button');
    this.button.className = 'menu-btn';
    this.button.setAttribute('aria-label', 'Retourner au menu principal');
    this.button.innerHTML = this.getMenuIcon();
    
    // Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'menu-tooltip';
    this.tooltip.innerHTML = `
      <div class="tooltip-content">
        <span class="tooltip-icon">🏠</span>
        <span class="tooltip-text">${this.config.tooltipText}</span>
        <span class="tooltip-hint">${this.config.tooltipHint}</span>
      </div>
    `;
    
    // Assemblage
    this.container.appendChild(this.button);
    this.container.appendChild(this.tooltip);
    
    // Ajouter au body
    document.body.appendChild(this.container);
  }
  
  // ============================================================================
  // STYLES
  // ============================================================================
  
  injectStyles() {
    // Vérifier si les styles existent déjà 
    if (document.getElementById('menu-button-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'menu-button-styles';
    style.textContent = `
      /* Conteneur du bouton menu */
      .menu-btn-container {
        position: fixed;
        top: -3px !important;
        left: 30px; /* En haut à gauche */
        z-index: 999;
        
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideInMenu 0.5s ease-out 0.1s both;
      }
      
      /* Bouton menu avec glassmorphism identique */
      .menu-btn {
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
        outline: none;
        padding: 0;
      }
      
      .menu-btn:hover {
        transform: scale(1.1);
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.3);
      }
      
      .menu-btn:active {
        transform: scale(0.95);
      }
      
      /* Animation de pulsation au chargement */
      .menu-btn.pulse-once {
        animation: pulseOnceMenu 1s ease-out 1.5s;
      }
      
      /* Tooltip identique mais à droite du bouton */
      .menu-tooltip {
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
      
      .menu-btn-container:hover .menu-tooltip {
        opacity: 1;
        transform: translateX(10px);
      }
      
      .menu-tooltip .tooltip-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-family: 'Satoshi-Regular', 'Inter', sans-serif;
        font-size: 12px;
        color: var(--couleur-noirVolcan, #322a22);
      }
      
      .menu-tooltip .tooltip-icon {
        font-size: 16px;
      }
      
      .menu-tooltip .tooltip-text {
        font-weight: 600;
        font-size: 13px;
      }
      
      .menu-tooltip .tooltip-hint {
        opacity: 0.7;
        font-size: 11px;
      }
      
      /* Animation d'entrée depuis la droite */
      @keyframes slideInMenu {
        from {
          opacity: 0;
          transform: translateX(50px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      /* Animation de pulsation unique */
      @keyframes pulseOnceMenu {
        0%, 100% {
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
        }
        50% {
          box-shadow: 0 8px 45px 0 rgba(31, 38, 135, 0.4);
          transform: scale(1.05);
        }
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .menu-btn-container {
          top: 20px;
          left: 20px;
        }
        
        .menu-btn {
          width: 45px;
          height: 45px;
          font-size: 18px;
        }
        
        .menu-tooltip {
          display: none;
        }
      }
      
      /* Ne pas interférer avec les pills existants */
      .pill {
        z-index: 1000 !important;
      }
      
      .menu-btn-container {
        z-index: 999;
      }
      
      /* Style pour l'état de confirmation */
      .menu-btn.confirming {
        background: rgba(231, 76, 60, 0.2);
        border-color: rgba(231, 76, 60, 0.4);
        color: #e74c3c;
      }
      
      .menu-btn.confirming:hover {
        background: rgba(231, 76, 60, 0.3);
        transform: scale(1.1);
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // ============================================================================
  // ICÔNE
  // ============================================================================
  
  getMenuIcon() {
    return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    `;
  }
  
  // ============================================================================
  // ÉVÉNEMENTS
  // ============================================================================
  
  setupEventListeners() {

    // Gestion du clic avec confirmation
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleMenuClick();
    });
    

  }
  
  // ============================================================================
  // GESTION DU CLIC
  // ============================================================================
  
  handleMenuClick() {
    console.log('🏠 Demande de retour au menu');

      this.showConfirmDialog();

  }
  

  
  showConfirmDialog() {
    // Ajouter une classe visuelle pour indiquer l'état de confirmation
    this.button.classList.add('confirming');
    
    // Utiliser confirm() natif pour la confirmation
    const confirmed = confirm(this.config.confirmMessage);
    
    // Retirer la classe visuelle
    setTimeout(() => {
      this.button.classList.remove('confirming');
    }, 200);
    
    if (confirmed) {
      console.log('✅ Confirmation retour menu - nettoyage des données');
      this.cleanupGameData();
      this.navigateToMenu();
    } else {
      console.log('❌ Retour menu annulé');
    }
  }
  
  cleanupGameData() {
    // Nettoyer les données de session
    try {
      sessionStorage.removeItem('gameConfig');
      sessionStorage.removeItem('currentScenarioFile');
      sessionStorage.removeItem('playerInfo');
      
      // Déconnecter le socket si disponible
      if (window.socket && typeof window.socket.disconnect === 'function') {
        window.socket.disconnect();
      }
      
      console.log('🧹 Données de partie nettoyées');
    } catch (error) {
      console.warn('Erreur lors du nettoyage:', error);
    }
  }
  
  navigateToMenu() {
    // Utiliser la fonction existante si disponible
    if (window.gameManager && typeof window.gameManager.backToMenu === 'function') {
      window.gameManager.backToMenu();
    } else {
      // Fallback direct
      window.location.href = this.config.menuUrl;
    }
  }
  
  // ============================================================================
  // API PUBLIQUE
  // ============================================================================
  
  setUrl(url) {
    this.config.menuUrl = url;
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
    document.getElementById('menu-button-styles')?.remove();
  }
  
  // Forcer la confirmation même si pas de partie active
  forceConfirmation(enabled = true) {
    this.config.forceConfirm = enabled;
  }
  
  // Changer le message de confirmation
  setConfirmMessage(message) {
    this.config.confirmMessage = message;
  }
}

// ============================================================================
// INITIALISATION AUTOMATIQUE
// ============================================================================

// Créer l'instance globale
window.menuButton = new MenuButton();

// Log de confirmation
console.log('🏠 Menu Button chargé - Contrôles disponibles via window.menuButton');