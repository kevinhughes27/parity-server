import { registerSW } from 'virtual:pwa-register';

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      // When a new version is available, automatically update
      console.log('New version available, updating...');
    },
    onOfflineReady() {
      console.log('App is ready to work offline');
    },
    onRegistered(registration) {
      console.log('Service Worker registered', registration);
    },
    onRegisterError(error) {
      console.error('Service Worker registration failed', error);
    },
  });
}
