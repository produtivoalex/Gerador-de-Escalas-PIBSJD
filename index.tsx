import React from 'react';
import ReactDOM from 'react-dom/client';
import SessionGate from './components/SessionGate';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SessionGate />
  </React.StrictMode>
);
import './styles.css';
