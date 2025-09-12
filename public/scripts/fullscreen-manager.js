// ============================================================================
// FULLSCREEN-MANAGER.JS - Gestionnaire de mode plein écran
// Compatible avec tous les navigateurs modernes et mobiles
// ============================================================================

class FullscreenManager {
  constructor() {
    // Configuration
    this.config = {
      autoRequest: true, // Demander automatiquement le plein écran
      showPrompt: true, // Afficher une invitation avant
      mobileOnly: false, // false = tous les appareils
      persistPreference: true, // Se souvenir du choix de l'utilisateur
      showExitHint: true, // Afficher comment sortir du plein écran
      exitKey: 'Escape' // Touche pour sortir (ESC par défaut)
    };
    
    // État
    this.state = {
      isFullscreen: false,
      isSupported: false,
      userDeclined: false,
      hasPrompted: false
    };
    
    // Éléments
    this.prompt = null;
    this.exitHint = null;
    
    // Initialisation
    this.init();
  }
  
  // ============================================================================
  // INITIALISATION
  // ============================================================================
  
  init() {
    // Vérifier le support du plein écran
    this.checkSupport();
    
    if (!this.state.isSupported) {
      console.warn('⚠️ Mode plein écran non supporté sur cet appareil');
      return;
    }
    
    // Charger les préférences
    this.loadPreferences();
    
    // Créer les éléments UI
    this.createPrompt();
    this.createExitHint();
    
    // Injecter les styles
    this.injectStyles();
    
    // Configurer les événements
    this.setupEventListeners();
    
    console.log('🖥️ Fullscreen Manager initialisé');
  }
  
  checkSupport() {
    this.state.isSupported = !!(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    );
    
    // Détection mobile
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  // ============================================================================
  // CRÉATION DES ÉLÉMENTS UI
  // ============================================================================
  
  createPrompt() {
    this.prompt = document.createElement('div');
    this.prompt.id = 'fullscreen-prompt';
    this.prompt.className = 'fullscreen-prompt hidden';
    this.prompt.innerHTML = `
      <div class="prompt-overlay"></div>
      <div class="prompt-container">
        <div class="prompt-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </div>
        
        <h3 class="prompt-title">Mode plein écran</h3>
        
        <p class="prompt-message">
          Pour une meilleure expérience, nous recommandons le mode plein écran.
          <span class="mobile-text">Profitez du jeu sans distractions !</span>
        </p>
        
        <div class="prompt-actions">
          <button class="btn-accept" id="fullscreen-accept-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Activer le plein écran</span>
          </button>
          
          <button class="btn-decline" id="fullscreen-decline-btn">
            <span>Continuer en fenêtre</span>
          </button>
        </div>
        
        <div class="prompt-remember">
          <label>
            <input type="checkbox" id="rememberChoice">
            <span>Se souvenir de mon choix</span>
          </label>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.prompt);
    
    // IMPORTANT : Attacher les événements APRÈS l'ajout au DOM
    setTimeout(() => {
      const acceptBtn = document.getElementById('fullscreen-accept-btn');
      const declineBtn = document.getElementById('fullscreen-decline-btn');
      
      if (acceptBtn) {
        acceptBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Sauvegarder la préférence
          const remember = document.getElementById('rememberChoice').checked;
          if (remember && this.config.persistPreference) {
            localStorage.setItem('fullscreenPreference', 'accepted');
          }
          
          // Masquer le prompt
          this.hidePrompt();
          
          // IMPORTANT : Demander le plein écran IMMÉDIATEMENT dans le gestionnaire de clic
          try {
            if (document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
              await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
              await document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.msRequestFullscreen) {
              await document.documentElement.msRequestFullscreen();
            }
            
            this.state.isFullscreen = true;
            console.log('✅ Mode plein écran activé');
            
            if (this.config.showExitHint) {
              this.showExitHint();
            }
          } catch (error) {
            console.error('❌ Erreur plein écran:', error);
            this.showError('Impossible d\'activer le plein écran. Vérifiez les permissions.');
          }
        });
      }
      
      if (declineBtn) {
        declineBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.declineFullscreen();
        });
      }
    }, 100);
  }
  
  createExitHint() {
    this.exitHint = document.createElement('div');
    this.exitHint.id = 'fullscreen-exit-hint';
    this.exitHint.className = 'exit-hint hidden';
    this.exitHint.innerHTML = `
      <div class="hint-content">
        <span class="hint-icon">⎋</span>
        <span class="hint-text">Appuyez sur <strong>ESC</strong> pour quitter le plein écran</span>
      </div>
    `;
    
    document.body.appendChild(this.exitHint);
  }
  
  // ============================================================================
  // STYLES
  // ============================================================================
  
  injectStyles() {
    const style = document.createElement('style');
    style.id = 'fullscreen-manager-styles';
    style.textContent = `
      /* Prompt de plein écran */
      .fullscreen-prompt {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      
      .fullscreen-prompt:not(.hidden) {
        opacity: 1;
        pointer-events: auto;
      }
      
      .prompt-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      }
      
      .prompt-container {
        position: relative;
        background: white;
        border-radius: 20px;
        padding: 30px;
        max-width: 450px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        transform: scale(0.9);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      
      .fullscreen-prompt:not(.hidden) .prompt-container {
        transform: scale(1);
      }
      
      .prompt-icon {
        color: #2196F3;
        margin-bottom: 20px;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .prompt-title {
        font-family: 'Satoshi-Bold', 'Inter', sans-serif;
        font-size: 24px;
        color: #333;
        margin: 0 0 15px 0;
      }
      
      .prompt-message {
        font-family: 'Satoshi-Regular', 'Inter', sans-serif;
        font-size: 16px;
        color: #666;
        line-height: 1.5;
        margin: 0 0 25px 0;
      }
      
      .mobile-text {
        display: block;
        margin-top: 8px;
        font-size: 14px;
        color: #999;
      }
      
      .prompt-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .prompt-actions button {
        flex: 1;
        padding: 14px 20px;
        border: none;
        border-radius: 12px;
        font-family: 'Satoshi-Medium', sans-serif;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .btn-accept {
        background: #2196F3;
        color: white;
      }
      
      .btn-accept:hover {
        background: #1976D2;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.3);
      }
      
      .btn-decline {
        background: #f0f0f0;
        color: #666;
      }
      
      .btn-decline:hover {
        background: #e0e0e0;
      }
      
      .prompt-remember {
        font-family: 'Satoshi-Regular', sans-serif;
        font-size: 14px;
        color: #999;
      }
      
      .prompt-remember label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
      }
      
      .prompt-remember input[type="checkbox"] {
        cursor: pointer;
      }
      
      /* Indice de sortie */
      .exit-hint {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        font-family: 'Satoshi-Medium', sans-serif;
        font-size: 14px;
        z-index: 99998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      
      .exit-hint:not(.hidden) {
        opacity: 1;
      }
      
      .hint-content {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .hint-icon {
        font-size: 18px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }
      
      .hint-text strong {
        color: #4CAF50;
      }
      
      /* Bouton flottant de plein écran */
      .fullscreen-toggle {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #333;
        font-size: 20px;
        transition: all 0.3s ease;
        z-index: 999;
        opacity: 0.6;
      }
      
      .fullscreen-toggle:hover {
        opacity: 1;
        transform: scale(1.1);
      }
      
      .fullscreen-toggle.active {
        background: rgba(76, 175, 80, 0.2);
        border-color: #4CAF50;
      }
      
      /* Mobile adaptations */
      @media (max-width: 768px) {
        .prompt-container {
          padding: 25px 20px;
        }
        
        .prompt-title {
          font-size: 20px;
        }
        
        .prompt-message {
          font-size: 14px;
        }
        
        .prompt-actions {
          flex-direction: column;
        }
        
        .fullscreen-toggle {
          bottom: 80px;
          right: 20px;
          width: 45px;
          height: 45px;
        }
        
        .mobile-text {
          display: block;
        }
      }
      
      /* Mode sombre */
      @media (prefers-color-scheme: dark) {
        .prompt-container {
          background: #2a2a2a;
          color: white;
        }
        
        .prompt-title {
          color: white;
        }
        
        .prompt-message {
          color: #ccc;
        }
        
        .btn-decline {
          background: #3a3a3a;
          color: white;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // ============================================================================
  // GESTION DU PLEIN ÉCRAN
  // ============================================================================
  
  async requestFullscreen(element = document.documentElement) {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      
      this.state.isFullscreen = true;
      console.log('✅ Mode plein écran activé');
      
      // Afficher l'indice de sortie
      if (this.config.showExitHint) {
        this.showExitHint();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Impossible d\'activer le plein écran:', error);
      this.showError('Impossible d\'activer le plein écran');
      return false;
    }
  }
  
  exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      
      this.state.isFullscreen = false;
      console.log('📤 Mode plein écran désactivé');
    } catch (error) {
      console.error('Erreur sortie plein écran:', error);
    }
  }
  
  toggleFullscreen() {
    if (this.state.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.requestFullscreen();
    }
  }
  
  // ============================================================================
  // PROMPT ET INTERACTIONS
  // ============================================================================
  
  showPrompt() {
    if (!this.state.isSupported) return;
    if (this.state.userDeclined && this.config.persistPreference) return;
    if (this.state.hasPrompted) return;
    
    this.state.hasPrompted = true;
    this.prompt.classList.remove('hidden');
  }
  
  hidePrompt() {
    this.prompt.classList.add('hidden');
  }
  
  async acceptFullscreen() {
    const remember = document.getElementById('rememberChoice').checked;
    
    if (remember && this.config.persistPreference) {
      localStorage.setItem('fullscreenPreference', 'accepted');
    }
    
    this.hidePrompt();
    
    // Le plein écran DOIT être demandé directement dans le gestionnaire de clic
    // Attendre un tout petit peu pour que l'animation se termine
    setTimeout(async () => {
      const success = await this.requestFullscreen();
      if (!success) {
        console.warn('⚠️ Plein écran refusé - Vérifiez les permissions du navigateur');
      }
    }, 100);
  }
  
  declineFullscreen() {
    const remember = document.getElementById('rememberChoice').checked;
    
    if (remember && this.config.persistPreference) {
      localStorage.setItem('fullscreenPreference', 'declined');
      this.state.userDeclined = true;
    }
    
    this.hidePrompt();
    console.log('👤 Utilisateur a refusé le plein écran');
  }
  
  showExitHint() {
    this.exitHint.classList.remove('hidden');
    
    // Masquer après 5 secondes
    setTimeout(() => {
      this.exitHint.classList.add('hidden');
    }, 5000);
  }
  
  showError(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f44336;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: 'Satoshi-Medium', sans-serif;
      font-size: 14px;
      z-index: 100000;
      animation: slideDown 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  // ============================================================================
  // ÉVÉNEMENTS
  // ============================================================================
  
  setupEventListeners() {
    // Événements de changement d'état plein écran
    document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
    
    // Raccourci clavier F11 (optionnel)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        this.toggleFullscreen();
      }
    });
  }
  
  handleFullscreenChange() {
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    
    this.state.isFullscreen = isFullscreen;
    
    // Mettre à jour le bouton toggle si présent
    const toggleBtn = document.querySelector('.fullscreen-toggle');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', isFullscreen);
    }
  }
  
  // ============================================================================
  // PRÉFÉRENCES
  // ============================================================================
  
  loadPreferences() {
    if (!this.config.persistPreference) return;
    
    const preference = localStorage.getItem('fullscreenPreference');
    
    if (preference === 'accepted') {
      // Auto-activer si accepté précédemment
      // Note: nécessite une interaction utilisateur
    } else if (preference === 'declined') {
      this.state.userDeclined = true;
    }
  }
  
  // ============================================================================
  // INTÉGRATION AVEC LE JEU
  // ============================================================================
  
  onGameStart() {
    // Appelé quand le jeu commence
    if (!this.state.isFullscreen && !this.state.userDeclined) {
      if (this.config.showPrompt) {
        this.showPrompt();
      } else if (this.config.autoRequest) {
        this.requestFullscreen();
      }
    }
  }
  
  createToggleButton() {
    // Créer un bouton flottant pour toggle le plein écran
    const button = document.createElement('button');
    button.className = 'fullscreen-toggle';
    button.onclick = () => this.toggleFullscreen();
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    `;
    
    document.body.appendChild(button);
  }
  
  // ============================================================================
  // API PUBLIQUE
  // ============================================================================
  
  isFullscreen() {
    return this.state.isFullscreen;
  }
  
  isSupported() {
    return this.state.isSupported;
  }
  
  reset() {
    localStorage.removeItem('fullscreenPreference');
    this.state.userDeclined = false;
    this.state.hasPrompted = false;
  }
  
  destroy() {
    this.exitFullscreen();
    this.prompt?.remove();
    this.exitHint?.remove();
    document.getElementById('fullscreen-manager-styles')?.remove();
  }
}

// ============================================================================
// INITIALISATION GLOBALE
// ============================================================================

window.fullscreenManager = new FullscreenManager();

console.log('🖥️ Fullscreen Manager chargé - Commandes disponibles:',
  '\n• fullscreenManager.onGameStart() - Proposer le plein écran',
  '\n• fullscreenManager.toggleFullscreen() - Basculer le mode',
  '\n• fullscreenManager.createToggleButton() - Ajouter un bouton',
  '\n• fullscreenManager.reset() - Réinitialiser les préférences'
);