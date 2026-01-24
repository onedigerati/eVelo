import './style.css';
import { initTheme } from './services/theme-service';

// Initialize theme before components render to prevent FOUC
initTheme().then(() => {
  import('./components/app-root');
});

console.log('eVelo starting...');
