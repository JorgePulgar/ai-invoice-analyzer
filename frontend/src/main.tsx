import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Chart } from 'chart.js';
import App from './App';
import './index.css';
import { applyTheme, getInitialTheme } from './utils/theme';

// Chart.js collapses to 0×0 when the browser switches to print layout.
// Resizing before and after print restores correct dimensions.
const resizeAllCharts = () => Object.values(Chart.instances).forEach((c) => c.resize());
window.addEventListener('beforeprint', resizeAllCharts);
window.addEventListener('afterprint', resizeAllCharts);

// Apply before first paint to avoid flash of wrong theme
applyTheme(getInitialTheme());

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
