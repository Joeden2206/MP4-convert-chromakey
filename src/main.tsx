import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out benign WebAssembly / TensorFlow Lite C++ informational diagnostic logs
const origConsoleError = console.error;
const origConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
  if (
    msg.includes('Created TensorFlow Lite XNNPACK delegate for CPU') ||
    msg.includes('OpenGL error checking is disabled') ||
    msg.includes('Disabling support for feedback tensors') ||
    msg.includes('Graph successfully started running')
  ) {
    // Route to debug/log instead of error
    return;
  }
  origConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
  if (
    msg.includes('OpenGL error checking is disabled') ||
    msg.includes('Disabling support for feedback tensors')
  ) {
    return;
  }
  origConsoleWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

