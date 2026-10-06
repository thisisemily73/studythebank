import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/Global.css';

// PAGES CSS
import './styles/pages/Home.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);