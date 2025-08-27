// ============================================================================
// MESSAGE-SOUND.JS - Système de notification sonore pour les messages
// Version complète avec son de connexion des joueurs
// ============================================================================

class MessageSoundManager {
  constructor() {
    // Configuration
    this.config = {
      soundFile: '/audio/son.wav', // Fichier son de notification
      playerJoinSoundFile: '/audio/notif.wav', // Fichier son de connexion joueur
      defaultVolume: 0.3, // Volume fixe à 30%
      enabledByDefault: true, // Son activé par défaut
      cooldown: 100, // Délai minimum entre deux sons (ms)
      playerJoinCooldown: 500, // Délai pour éviter le spam de connexions
    };
    
    // État
    this.state = {
      enabled: this.config.enabledByDefault,
      volume: this.config.defaultVolume,
      lastPlayTime: 0,
      lastPlayerJoinTime: 0, // Pour éviter le spam de connexions
      linkedToMusic: true // Lié au lecteur de musique
    };
    
    // Sons
    this.notificationSound = null;
    this.playerJoinSound = null;
    
    // Initialisation
    this.init();
  }
  
  // ============================================================================
  // INITIALISATION
  // ============================================================================
  
  init() {
    // Précharger le son
    this.preloadSound();
    
    // Synchroniser avec le lecteur audio si présent
    this.syncWithAudioPlayer();
    
    console.log('🔊 Message Sound Manager initialisé');
  }
  
  preloadSound() {
    // Charger le son de notification
    this.notificationSound = new Audio(this.config.soundFile);
    this.notificationSound.volume = this.config.defaultVolume;
    this.notificationSound.preload = 'auto';
    this.notificationSound.load();
    
    // Charger le son de connexion joueur
    this.playerJoinSound = new Audio(this.config.playerJoinSoundFile);
    this.playerJoinSound.volume = this.config.defaultVolume * 0.8; // Un peu moins fort
    this.playerJoinSound.preload = 'auto';
    this.playerJoinSound.load();
    
    // Gestion des erreurs
    this.notificationSound.addEventListener('error', (e) => {
      console.warn('Erreur chargement notif.wav:', e);
    });
    
    this.playerJoinSound.addEventListener('error', (e) => {
      console.warn('Erreur chargement son.wav:', e);
      // Fallback : utiliser le son de notification
      this.playerJoinSound = this.notificationSound;
    });
  }
  
  syncWithAudioPlayer() {
    // Se synchroniser avec le lecteur de musique s'il existe
    setTimeout(() => {
      if (window.ambientPlayer) {
        console.log('🔗 Synchronisation avec le lecteur de musique');
        
        // État initial
        this.state.enabled = window.ambientPlayer.state.isPlaying;
        
        // Vérifier périodiquement l'état du lecteur audio
        const checkAudioPlayerState = () => {
          if (window.ambientPlayer) {
            this.state.enabled = window.ambientPlayer.state.isPlaying;
          }
        };
        
        setInterval(checkAudioPlayerState, 1000);
      }
    }, 1000);
  }
  
  // ============================================================================
  // LECTURE DES SONS
  // ============================================================================
  
  playSound() {
    // Vérifications
    if (!this.state.enabled) return;
    
    // Cooldown pour éviter le spam
    const now = Date.now();
    if (now - this.state.lastPlayTime < this.config.cooldown) return;
    
    if (!this.notificationSound) return;
    
    try {
      // Cloner l'audio pour permettre plusieurs lectures simultanées
      const audioClone = this.notificationSound.cloneNode();
      audioClone.volume = this.config.defaultVolume;
      
      // Jouer le son
      audioClone.play().catch(err => {
        // Silencieux en cas d'erreur (autoplay policy)
        console.debug('Son non joué:', err.message);
      });
      
      this.state.lastPlayTime = now;
      
      // Nettoyer après lecture
      audioClone.addEventListener('ended', () => {
        audioClone.remove();
      });
      
    } catch (error) {
      console.warn('Erreur lecture son:', error);
    }
  }
  
  // Fonction pour les messages messenger
  playMessageNotification() {
    this.playSound();
  }
  
  // ============================================================================
  // NOUVEAU : SON DE CONNEXION DES JOUEURS
  // ============================================================================
  
  playPlayerJoinSound() {
    // Vérifications
    if (!this.state.enabled) return;
    
    // Cooldown spécifique pour éviter le spam des connexions
    const now = Date.now();
    if (now - this.state.lastPlayerJoinTime < this.config.playerJoinCooldown) return;
    
    if (!this.playerJoinSound) return;
    
    try {
      // Utiliser le son de connexion dédié
      const audioClone = this.playerJoinSound.cloneNode();
      audioClone.volume = this.config.defaultVolume * 0.8;
      
      // Jouer le son
      audioClone.play().catch(err => {
        console.debug('Son connexion non joué:', err.message);
      });
      
      this.state.lastPlayerJoinTime = now;
      
      // Nettoyer après lecture
      audioClone.addEventListener('ended', () => {
        audioClone.remove();
      });
      
    } catch (error) {
      console.warn('Erreur lecture son connexion:', error);
    }
  }
  
  // ============================================================================
  // API PUBLIQUE
  // ============================================================================
  
  enable() {
    this.state.enabled = true;
    console.log('🔊 Sons de notification activés');
  }
  
  disable() {
    this.state.enabled = false;
    console.log('🔇 Sons de notification désactivés');
  }
  
  toggle() {
    if (this.state.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  // Test sonore
  test() {
    console.log('🧪 Test du son notif.wav...');
    this.playSound();
  }
  
  // Test son de connexion
  testPlayerJoin() {
    console.log('🧪 Test du son de connexion...');
    this.playPlayerJoinSound();
  }
}

// ============================================================================
// INTÉGRATION GLOBALE
// ============================================================================

// Créer l'instance globale
window.messageSoundManager = new MessageSoundManager();

// Fonction simple à appeler depuis game.js dans createMessageElement()
window.playMessageSound = function() {
  if (window.messageSoundManager) {
    window.messageSoundManager.playMessageNotification();
  }
};

// NOUVELLE : Fonction simple pour la connexion des joueurs
window.playPlayerJoinSound = function() {
  if (window.messageSoundManager) {
    window.messageSoundManager.playPlayerJoinSound();
  }
};

console.log('🔊 Message Sound Manager chargé - Utilisation:',
  '\n• Ajouter playMessageSound() dans createMessageElement()',
  '\n• Ajouter playPlayerJoinSound() pour les connexions',
  '\n• messageSoundManager.test() pour tester les sons',
  '\n• Le son se coupe/active avec le bouton musique'
);