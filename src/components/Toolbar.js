/* src/components/Toolbar.js */
"use client";

import React, { useContext } from 'react';
import { TerminalContext } from '../context/TerminalContext';

const Toolbar = () => {
  const { addTerminal, terminals, toggleMinimizeTerminal, closeTerminal } = useContext(TerminalContext);

  const minimizedTerminals = terminals.filter((terminal) => terminal.isMinimized);

    return (
      <div className="taskbar fixed top-0 left-0 w-full p-4 flex items-center justify-between z-50">
      {/* Add New Terminal Button */}
      <button
        onClick={addTerminal}
        className="bg-glassmorphism hover:bg-glassmorphism-hover text-white font-bold py-2 px-4 rounded cursor-pointer border border-white/20 backdrop-blur-md"
        aria-label="Add New Terminal"
      >
        ╋
      </button>
      {/* Minimized Terminals */}
      <div className="flex space-x-4">
        {minimizedTerminals.map((terminal) => (
          <div
            key={terminal.id}
            className="flex items-center space-x-2 bg-glassmorphism bg-opacity-70 px-3 py-1 rounded backdrop-blur-lg border border-white/20"
          >
            <span className="text-white">{terminal.name || "Terminal"}</span>
            <button
              onClick={() => toggleMinimizeTerminal(terminal.id)}
              className="text-white px-2 py-1 bg-glassmorphism hover:bg-glassmorphism-hover rounded cursor-pointer border border-white/20 backdrop-blur-md"
              aria-label="Restore Terminal"
            >
              ❒
            </button>
            <button
              onClick={() => closeTerminal(terminal.id)}
              className="text-white px-2 py-1 bg-red-400/30 hover:bg-red-500/50 rounded cursor-pointer border border-white/20 backdrop-blur-md"
              aria-label="Close Terminal"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );

};

export default Toolbar;
