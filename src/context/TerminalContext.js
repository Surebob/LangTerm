"use client";

import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // Import Supabase client

export const TerminalContext = createContext();

export const TerminalProvider = ({ children }) => {
  const [terminals, setTerminals] = useState([]);
  const [gridPosition, setGridPosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highestZIndex, setHighestZIndex] = useState(1); // Track highest zIndex

  const [user, setUser] = useState(null); // Store logged-in user
  const [session, setSession] = useState(null); // Store session

  useEffect(() => {
    // Supabase session check
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error) {
        setSession(session);
        setUser(session?.user || null);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const storedTerminals = localStorage.getItem('terminals');
    if (storedTerminals) {
      setTerminals(JSON.parse(storedTerminals));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('terminals', JSON.stringify(terminals));
  }, [terminals]);

  const addTerminal = () => {
    const offset = 30; // Define an offset to prevent overlapping
    const newTerminal = {
      id: Date.now(),
      name: `Terminal ${terminals.length + 1}`,
      isMinimized: false,
      position: { 
        x: 100 + terminals.length * offset, 
        y: 100 + terminals.length * offset 
      }, // Unique position
      size: { width: 500, height: 300 },
      commands: [],
      zIndex: highestZIndex + 1, // New terminal starts on top
      originalPosition: { 
        x: 100 + terminals.length * offset, 
        y: 100 + terminals.length * offset 
      }, // Remember original position
    };
    setTerminals([...terminals, newTerminal]);
    setHighestZIndex((prev) => prev + 1);
  };

  const bringToFront = (id) => {
    setTerminals((prevTerminals) => 
      prevTerminals.map((terminal) =>
        terminal.id === id ? { ...terminal, zIndex: highestZIndex + 1 } : terminal
      )
    );
    setHighestZIndex((prev) => prev + 1);
  };

  const toggleMinimizeTerminal = (id) => {
    setTerminals((prevTerminals) =>
      prevTerminals.map((terminal) =>
        terminal.id === id ? { ...terminal, isMinimized: !terminal.isMinimized } : terminal
      )
    );
  };

  const closeTerminal = (id) => {
    setTerminals((prevTerminals) => prevTerminals.filter((terminal) => terminal.id !== id));
  };

  const updateTerminalPosition = (id, position) => {
    setTerminals((prevTerminals) =>
      prevTerminals.map((terminal) =>
        terminal.id === id ? { ...terminal, position } : terminal
      )
    );
  };

  const updateTerminalSize = (id, size) => {
    setTerminals((prevTerminals) =>
      prevTerminals.map((terminal) =>
        terminal.id === id ? { ...terminal, size } : terminal
      )
    );
  };

  const addCommandToTerminal = (id, command, output) => {
    setTerminals((prevTerminals) =>
      prevTerminals.map((terminal) =>
        terminal.id === id
          ? { ...terminal, commands: [...terminal.commands, { command, output }] }
          : terminal
      )
    );
  };

  const updateTerminalName = (id, newName) => {
    setTerminals((prevTerminals) =>
      prevTerminals.map((terminal) =>
        terminal.id === id ? { ...terminal, name: newName } : terminal
      )
    );
  };

  const maximizeTerminal = (id) => {
    setTerminals((prevTerminals) =>
      prevTerminals.map((terminal) => {
        if (terminal.id === id) {
          // Restore to original position without checking for overlap
          return { ...terminal, isMinimized: false, position: terminal.originalPosition };
        }
        return terminal;
      })
    );
  };

  const updateGridPosition = (newPosition) => {
    setGridPosition(newPosition);
  };

  return (
    <TerminalContext.Provider
      value={{
        terminals,
        gridPosition,
        zoomLevel,
        setZoomLevel,
        addTerminal,
        toggleMinimizeTerminal,
        closeTerminal,
        updateTerminalPosition,
        updateTerminalSize,
        addCommandToTerminal,
        updateTerminalName,
        maximizeTerminal, // Retain maximize function in context
        updateGridPosition,
        bringToFront, // Bring terminal to front function
        user,         // Add user to context
        session,      // Add session to context
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};
