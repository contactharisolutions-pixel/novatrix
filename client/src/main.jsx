import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Enforce IST Timezone and DD/MM/YYYY format globally
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(locale, options) {
  const mergedOptions = { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', ...options };
  return originalToLocaleDateString.call(this, 'en-IN', mergedOptions);
};

const originalToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function(locale, options) {
  const mergedOptions = { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', ...options };
  return originalToLocaleString.call(this, 'en-IN', mergedOptions);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
