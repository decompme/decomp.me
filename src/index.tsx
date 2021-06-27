import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { monaco } from 'react-monaco-editor';

// Use asm syntax highlighting from Compiler Explorer
import './asm-mode.js';

// Set up custom monaco background color  
monaco.editor.defineTheme('customTheme', {
  base: 'vs-dark',
  inherit: true,
  rules: [
  ],
  colors: {
    "editor.background": '#282932'
  }
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
