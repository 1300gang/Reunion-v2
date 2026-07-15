// ============================================================================
// CONNECTION-MONITOR.JS - Système simple d'alerte de déconnexion
// Version minimaliste avec console et notifications
// ============================================================================

class ConnectionMonitor {
  constructor() {
    // Configuration
    this.config = {
      checkInterval: 5000, // Vérification toutes les 5 secondes
      notificationDuration: 10000, // Notification visible 10 secondes
      enableConsoleAlerts: true,
      enableBrowserNotification: true,
      enableToast: true
    };
    
    // État
    this.state = {
      isConnected: true,
      lastDisconnectTime: null,
      disconnectCount: 0
    };
    
    // Socket référence
    this.socket = null;
    
    // Initialisation
    this.init();
  }
  
  // ============================================================================
  // INITIALISATION
  // ============================================================================
  
  init() {
    // Demander la permission pour les notifications (si pas déjà fait)
    if (this.config.enableBrowserNotification && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    
    // Attendre que le socket soit disponible
    this.waitForSocket();
    
    // Configurer les événements réseau
    this.setupNetworkEvents();
    
    console.log('%c📡 Connection Monitor activé', 'color: #4CAF50; font-weight: bold');
  }
  
  // ============================================================================
  // DÉTECTION DU SOCKET
  // ============================================================================
  
  waitForSocket() {
    const checkSocket = setInterval(() => {
      if (typeof io !== 'undefined' && window.socket) {
        this.socket = window.socket;
        this.setupSocketEvents();
        clearInterval(checkSocket);
        console.log('%c✅ Socket détecté et surveillé', 'color: #4CAF50');
      }
    }, 100);
  }
  
  setupSocketEvents() {
    if (!this.socket) return;
    
    // Déconnexion
    this.socket.on('disconnect', (reason) => {
      this.handleDisconnection(reason);
    });
    
    // Reconnexion
    this.socket.on('connect', () => {
      this.handleReconnection();
    });
    
    // Erreur de connexion
    this.socket.on('connect_error', (error) => {
      this.handleConnectionError(error);
    });
    
    // Timeout de connexion
    this.socket.on('connect_timeout', () => {
      console.warn('%c⏱️ Timeout de connexion', 'color: #ff9800; font-weight: bold');
    });
  }
  
  setupNetworkEvents() {
    // Événements réseau du navigateur
    window.addEventListener('online', () => {
      console.log('%c🌐 Internet: EN LIGNE', 'color: #4CAF50; font-weight: bold');
      this.showToast('Connexion Internet rétablie', 'success');
    });
    
    window.addEventListener('offline', () => {
      console.error('%c📵 Internet: HORS LIGNE', 'color: #f44336; font-weight: bold; font-size: 14px');
      this.showToast('⚠️ Connexion Internet perdue', 'error');
      this.sendBrowserNotification('Connexion perdue', 'Vérifiez votre connexion Internet');
    });
    
    // Vérification périodique
    setInterval(() => {
      this.checkConnection();
    }, this.config.checkInterval);
  }
  
  checkConnection() {
    const online = navigator.onLine;
    const socketConnected = this.socket && this.socket.connected;
    
    if (!online) {
      console.warn('%c⚠️ Pas de connexion Internet', 'color: #ff9800');
    }
    
    if (online && !socketConnected && this.socket) {
      console.warn('%c⚠️ Socket déconnecté - Tentative de reconnexion...', 'color: #ff9800');
      // Note: Socket.IO gère automatiquement la reconnexion
    }
  }
  
  // ============================================================================
  // GESTION DES ÉVÉNEMENTS
  // ============================================================================
  
  handleDisconnection(reason) {
    this.state.isConnected = false;
    this.state.lastDisconnectTime = new Date().toLocaleTimeString();
    this.state.disconnectCount++;
    
    // Message console stylé
    console.error(
      '%c🔌 DÉCONNEXION DÉTECTÉE',
      'background: #f44336; color: white; padding: 5px 10px; font-size: 14px; font-weight: bold; border-radius: 3px'
    );
    console.error(`📍 Raison: ${reason}`);
    console.error(`⏰ Heure: ${this.state.lastDisconnectTime}`);
    console.error(`📊 Déconnexions totales: ${this.state.disconnectCount}`);
    
    // Toast notification
    this.showToast(`⚠️ Déconnexion: ${reason}`, 'error', 10000);
    
    // Notification navigateur
    this.sendBrowserNotification(
      'Connexion perdue',
      `Raison: ${reason}\nActualisez la page si le problème persiste`
    );
    
    // Instructions dans la console
    console.warn(
      '%c💡 Actions possibles:',
      'color: #ff9800; font-weight: bold',
      '\n1. Vérifiez votre connexion Internet',
      '\n2. Attendez quelques secondes (reconnexion auto)',
      '\n3. Actualisez la page avec F5 ou Ctrl+R',
      '\n4. Sur mobile: désactivez/réactivez le Wi-Fi'
    );
  }
  
  handleReconnection() {
    if (this.state.isConnected) return;
    
    this.state.isConnected = true;
    const reconnectTime = new Date().toLocaleTimeString();
    
    // Message console stylé
    console.log(
      '%c✅ RECONNEXION RÉUSSIE',
      'background: #4CAF50; color: white; padding: 5px 10px; font-size: 14px; font-weight: bold; border-radius: 3px'
    );
    console.log(`⏰ Heure: ${reconnectTime}`);
    console.log(`⏱️ Durée de déconnexion: ${this.calculateDowntime()} secondes`);
    
    // Toast notification
    this.showToast('✅ Connexion rétablie !', 'success');
    
    // Notification navigateur
    this.sendBrowserNotification('Connexion rétablie', 'Vous êtes de nouveau en ligne');
  }
  
  handleConnectionError(error) {
    console.error(
      '%c❌ ERREUR DE CONNEXION',
      'background: #ff5722; color: white; padding: 5px 10px; font-size: 12px; font-weight: bold'
    );
    console.error('Détails:', error.message);
    console.error('Type:', error.type);
    
    // Toast discret
    this.showToast(`Erreur: ${error.message}`, 'warning');
  }
  
  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  
  showToast(message, type = 'info', duration = 5000) {
    if (!this.config.enableToast) return;
    
    // Retirer l'ancien toast s'il existe
    const oldToast = document.getElementById('connection-toast');
    if (oldToast) oldToast.remove();
    
    // Créer le nouveau toast
    const toast = document.createElement('div');
    toast.id = 'connection-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 15px 25px;
      border-radius: 8px;
      font-family: 'Satoshi-Medium', Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 100000;
      animation: slideDown 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 90%;
      text-align: center;
    `;
    
    // Couleurs selon le type
    const colors = {
      success: { bg: '#4CAF50', text: 'white' },
      error: { bg: '#f44336', text: 'white' },
      warning: { bg: '#ff9800', text: 'white' },
      info: { bg: '#2196F3', text: 'white' }
    };
    
    const color = colors[type] || colors.info;
    toast.style.background = color.bg;
    toast.style.color = color.text;
    toast.textContent = message;
    
    // Ajouter l'animation CSS si elle n'existe pas
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
          to {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Retirer après la durée spécifiée
    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  sendBrowserNotification(title, body) {
    if (!this.config.enableBrowserNotification) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    try {
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico', // Changez selon votre icône
        badge: '/favicon.ico',
        tag: 'connection-monitor',
        requireInteraction: false,
        silent: false
      });
      
      // Fermer après 10 secondes
      setTimeout(() => notification.close(), this.config.notificationDuration);
      
      // Clic sur la notification
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.warn('Notification non supportée:', error);
    }
  }
  
  // ============================================================================
  // UTILITAIRES
  // ============================================================================
  
  calculateDowntime() {
    if (!this.state.lastDisconnectTime) return 0;
    
    const disconnect = new Date(`01/01/2000 ${this.state.lastDisconnectTime}`);
    const reconnect = new Date(`01/01/2000 ${new Date().toLocaleTimeString()}`);
    const diff = (reconnect - disconnect) / 1000;
    
    return Math.abs(Math.round(diff));
  }
  
  // ============================================================================
  // API PUBLIQUE
  // ============================================================================
  
  getStatus() {
    return {
      connected: this.state.isConnected,
      online: navigator.onLine,
      socketConnected: this.socket ? this.socket.connected : false,
      disconnectCount: this.state.disconnectCount,
      lastDisconnect: this.state.lastDisconnectTime
    };
  }
  
  // Commandes console utiles
  logStatus() {
    const status = this.getStatus();
    console.table(status);
  }
  
  testDisconnection() {
    console.log('🧪 Test de déconnexion...');
    this.handleDisconnection('Test manuel');
    setTimeout(() => {
      this.handleReconnection();
    }, 3000);
  }
  
  toggleNotifications() {
    this.config.enableBrowserNotification = !this.config.enableBrowserNotification;
    console.log(`Notifications navigateur: ${this.config.enableBrowserNotification ? 'ON' : 'OFF'}`);
  }
  
  toggleToasts() {
    this.config.enableToast = !this.config.enableToast;
    console.log(`Toasts: ${this.config.enableToast ? 'ON' : 'OFF'}`);
  }
}

// ============================================================================
// INITIALISATION ET COMMANDES CONSOLE
// ============================================================================

// Créer l'instance globale
window.connectionMonitor = new ConnectionMonitor();

// Commandes console disponibles
console.log(
  '%c📡 Connection Monitor - Commandes disponibles:',
  'color: #2196F3; font-weight: bold',
  '\n• connectionMonitor.logStatus() - Afficher le statut',
  '\n• connectionMonitor.testDisconnection() - Tester une déconnexion',
  '\n• connectionMonitor.toggleNotifications() - Activer/désactiver les notifications',
  '\n• connectionMonitor.toggleToasts() - Activer/désactiver les toasts'
);