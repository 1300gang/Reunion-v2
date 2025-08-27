// ============================================================================
// AUDIO-PLAYER.JS - Lecteur audio d'ambiance discret
// ============================================================================

class AmbientAudioPlayer {
  constructor() {
    // Configuration
    this.config = {
      audioFile: '/audio/Untitled (1).mp3',
      defaultVolume: 0.15, // 15% - Volume très bas pour l'ambiance
      fadeTime: 1000, // Durée du fade in/out en ms
      position: 'bottom-left',
      autoplay: true,
      loop: true
    };
    
    // État
    this.state = {
      isPlaying: false,
      isMuted: false,
      volume: this.config.defaultVolume,
      isInitialized: false
    };
    
    // Éléments
    this.audio = null;
    this.container = null;
    this.playBtn = null;
    this.tooltip = null;
    
    // Initialisation
    this.init();
  }
  
  // ============================================================================
  // INITIALISATION
  // ============================================================================
  
  init() {
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    // Créer l'élément audio
    this.createAudioElement();
    
    // Créer l'interface
    this.createUI();
    
    // Ajouter les styles
    this.injectStyles();
    
    // Configurer les événements
    this.setupEventListeners();
    
    // Charger les préférences sauvegardées
    this.loadPreferences();
    
    // Démarrage automatique
    if (this.config.autoplay) {
      this.tryAutoplay();
    }
    
    console.log('🎵 Lecteur audio ambiance initialisé');
  }
  
  // ============================================================================
  // CRÉATION DES ÉLÉMENTS
  // ============================================================================
  
  createAudioElement() {
    this.audio = new Audio(this.config.audioFile);
    this.audio.loop = this.config.loop;
    this.audio.volume = this.config.defaultVolume;
    this.audio.preload = 'auto';
    
    // Gestion des erreurs
    this.audio.addEventListener('error', (e) => {
      console.error('❌ Erreur de chargement audio:', e);
      this.showTooltip('Erreur de chargement de la musique', 'error');
    });
    
    // Audio chargé
    this.audio.addEventListener('canplay', () => {
      console.log('✅ Audio prêt à être joué');
      this.state.isInitialized = true;
    });
  }
  
  createUI() {
    // Conteneur principal
    this.container = document.createElement('div');
    this.container.id = 'ambient-audio-player';
    this.container.className = 'audio-player-container';
    
    // Bouton play/pause
    this.playBtn = document.createElement('button');
    this.playBtn.className = 'audio-play-btn';
    this.playBtn.innerHTML = this.getPlayIcon();
    this.playBtn.setAttribute('aria-label', 'Contrôle de la musique d\'ambiance');
    
    // Tooltip/Info
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'audio-tooltip';
    this.tooltip.innerHTML = `
      <div class="tooltip-content">
        <span class="tooltip-icon">🎵</span>
        <span class="tooltip-text">Musique d'ambiance</span>
        <span class="tooltip-hint">Cliquez pour pause/play</span>
      </div>
    `;
    
    // Assemblage
    this.container.appendChild(this.playBtn);
    this.container.appendChild(this.tooltip);
    
    // Ajouter au body
    document.body.appendChild(this.container);
  }
  
  // ============================================================================
  // STYLES
  // ============================================================================
  
  injectStyles() {
    const style = document.createElement('style');
    style.id = 'audio-player-styles';
    style.textContent = `
      /* Conteneur principal */
      .audio-player-container {
        position: fixed;
        bottom: 30px;
        left: 30px;
        z-index: 999;
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      /* Bouton play/pause avec glassmorphism */
      .audio-play-btn {
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
        font-size: 18px;
        padding: 0;
        outline: none;
      }
      
      .audio-play-btn:hover {
        transform: scale(1.1);
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.3);
      }
      
      .audio-play-btn:active {
        transform: scale(0.95);
      }
      
      .audio-play-btn.playing {
        background: rgba(255, 255, 255, 0.15);
        animation: pulse 2s infinite;
      }
      
      /* Icônes play/pause */
      .play-icon, .pause-icon {
        transition: opacity 0.2s;
      }
      
      /* Tooltip */
      .audio-tooltip {
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
      }
      
      .audio-player-container:hover .audio-tooltip {
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
      
      /* Animation de première apparition */
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-50px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .audio-player-container {
        animation: slideIn 0.5s ease-out;
      }
      
      /* Animation pulse pour lecture */
      @keyframes pulse {
        0% {
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
        }
        50% {
          box-shadow: 0 8px 40px 0 rgba(31, 38, 135, 0.3);
        }
        100% {
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
        }
      }
      
      /* Notification de démarrage */
      .audio-notification {
        position: fixed;
        bottom: 100px;
        left: 30px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 12px;
        padding: 15px 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        font-family: 'Satoshi-Regular', 'Inter', sans-serif;
        font-size: 14px;
        color: var(--couleur-noirVolcan, #322a22);
        max-width: 250px;
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
        transition: all 0.3s ease;
      }
      
      .audio-notification.show {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      
      .audio-notification .title {
        font-weight: 600;
        margin-bottom: 5px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .audio-notification .message {
        opacity: 0.8;
        font-size: 13px;
        line-height: 1.4;
      }
      
      /* Mode responsive */
      @media (max-width: 768px) {
        .audio-player-container {
          bottom: 20px;
          left: 20px;
        }
        
        .audio-play-btn {
          width: 45px;
          height: 45px;
          font-size: 16px;
        }
        
        .audio-tooltip {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // ============================================================================
  // ICÔNES
  // ============================================================================
  
  getPlayIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="play-icon">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
  }
  
  getPauseIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="pause-icon">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
      </svg>
    `;
  }
  
  // ============================================================================
  // CONTRÔLES AUDIO
  // ============================================================================
  
  async play() {
    try {
      await this.audio.play();
      this.state.isPlaying = true;
      this.playBtn.innerHTML = this.getPauseIcon();
      this.playBtn.classList.add('playing');
      this.savePreferences();
      console.log('▶️ Musique démarrée');
    } catch (error) {
      console.error('❌ Erreur de lecture:', error);
      this.showTooltip('Cliquez pour activer la musique', 'info');
    }
  }
  
  pause() {
    this.audio.pause();
    this.state.isPlaying = false;
    this.playBtn.innerHTML = this.getPlayIcon();
    this.playBtn.classList.remove('playing');
    this.savePreferences();
    console.log('⏸️ Musique en pause');
  }
  
toggle() {
  if (this.state.isPlaying) {
    this.fadeOut(() => {
      this.pause();
      // Couper aussi les notifications
      if (window.messageSoundManager) {
        window.messageSoundManager.disable();
      }
    });
  } else {
    this.play();
    this.fadeIn();
    // Activer aussi les notifications
    if (window.messageSoundManager) {
      window.messageSoundManager.enable();
    }
  }
}
  
  // ============================================================================
  // EFFETS DE FONDU
  // ============================================================================
  
  fadeIn() {
    const targetVolume = this.state.volume || this.config.defaultVolume;
    const steps = 20;
    const stepTime = this.config.fadeTime / steps;
    const volumeStep = targetVolume / steps;
    
    this.audio.volume = 0;
    let currentStep = 0;
    
    const fade = setInterval(() => {
      currentStep++;
      this.audio.volume = Math.min(volumeStep * currentStep, targetVolume);
      
      if (currentStep >= steps) {
        clearInterval(fade);
      }
    }, stepTime);
  }
  
  fadeOut(callback) {
    const currentVolume = this.audio.volume;
    const steps = 20;
    const stepTime = this.config.fadeTime / steps;
    const volumeStep = currentVolume / steps;
    
    let currentStep = 0;
    
    const fade = setInterval(() => {
      currentStep++;
      this.audio.volume = Math.max(currentVolume - (volumeStep * currentStep), 0);
      
      if (currentStep >= steps) {
        clearInterval(fade);
        if (callback) callback();
      }
    }, stepTime);
  }
  
  // ============================================================================
  // ÉVÉNEMENTS
  // ============================================================================
  
  setupEventListeners() {
    // Clic sur le bouton
    this.playBtn.addEventListener('click', () => this.toggle());
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      // M pour mute/unmute
      if (e.key.toLowerCase() === 'm' && e.ctrlKey) {
        e.preventDefault();
        this.toggle();
      }
    });
    
    // Gestion de la visibilité de page
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.isPlaying) {
        this.pause();
      }
    });
  }
  
  // ============================================================================
  // AUTOPLAY
  // ============================================================================
  
  async tryAutoplay() {
    // Attendre un peu pour que la page se charge
    setTimeout(async () => {
      try {
        await this.play();
        this.showFirstTimeNotification();
      } catch (error) {
        console.log('⚠️ Autoplay bloqué, en attente d\'interaction utilisateur');
        
        // Essayer au premier clic
        const startOnInteraction = async () => {
          try {
            await this.play();
            this.showFirstTimeNotification();
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('keydown', startOnInteraction);
          } catch (e) {
            console.error('Erreur autoplay:', e);
          }
        };
        
        document.addEventListener('click', startOnInteraction, { once: true });
        document.addEventListener('keydown', startOnInteraction, { once: true });
      }
    }, 1000);
  }
  
  showFirstTimeNotification() {
    // Vérifier si c'est la première fois
    if (localStorage.getItem('audioPlayerNotified')) return;
    
    const notification = document.createElement('div');
    notification.className = 'audio-notification';
    notification.innerHTML = `
      <div class="title">
        <span>🎵</span>
        <span>Musique d'ambiance activée</span>
      </div>
      <div class="message">
        Pour couper ou remettre la musique, cliquez sur le bouton en bas à gauche de l'écran.
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'apparition
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Disparition après 5 secondes
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Marquer comme notifié
    localStorage.setItem('audioPlayerNotified', 'true');
  }
  
  showTooltip(message, type = 'info') {
    this.tooltip.querySelector('.tooltip-text').textContent = message;
    this.tooltip.style.opacity = '1';
    
    setTimeout(() => {
      this.tooltip.style.opacity = '';
    }, 3000);
  }
  
  // ============================================================================
  // PRÉFÉRENCES
  // ============================================================================
  
  savePreferences() {
    const prefs = {
      isPlaying: this.state.isPlaying,
      volume: this.audio.volume,
      muted: this.state.isMuted
    };
    localStorage.setItem('audioPlayerPrefs', JSON.stringify(prefs));
  }
  
  loadPreferences() {
    const saved = localStorage.getItem('audioPlayerPrefs');
    if (!saved) return;
    
    try {
      const prefs = JSON.parse(saved);
      this.state.volume = prefs.volume || this.config.defaultVolume;
      this.audio.volume = this.state.volume;
      
      // Si l'utilisateur avait mis en pause, respecter son choix
      if (prefs.isPlaying === false) {
        this.config.autoplay = false;
      }
    } catch (e) {
      console.error('Erreur chargement préférences:', e);
    }
  }
  
  // ============================================================================
  // API PUBLIQUE
  // ============================================================================
  
  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.state.volume = this.audio.volume;
    this.savePreferences();
  }
  
  mute() {
    this.state.isMuted = true;
    this.audio.muted = true;
  }
  
  unmute() {
    this.state.isMuted = false;
    this.audio.muted = false;
  }
  
  destroy() {
    this.pause();
    this.audio.remove();
    this.container.remove();
    document.getElementById('audio-player-styles')?.remove();
  }
}

// ============================================================================
// INITIALISATION AUTOMATIQUE
// ============================================================================

// Créer l'instance globale
window.ambientPlayer = new AmbientAudioPlayer();

// Log de confirmation
console.log('🎵 Audio Player chargé - Contrôles disponibles via window.ambientPlayer');