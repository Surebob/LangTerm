"use client";

import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sshService } from '../services/SSHService';

export const TerminalContext = createContext();

export const TerminalProvider = ({ children }) => {
  const [terminals, setTerminals] = useState([]);
  const [gridPosition, setGridPosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highestZIndex, setHighestZIndex] = useState(1);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [sshConnections, setSSHConnections] = useState({});
  const [passwordInput, setPasswordInput] = useState({});
  const [isPasswordMode, setIsPasswordMode] = useState({});

  const centerOnTerminal = (terminalId) => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (terminal) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Calculate terminal's center point by adding half its dimensions
      const terminalCenterX = terminal.position.x + (terminal.size.width / 2);
      const terminalCenterY = terminal.position.y + (terminal.size.height / 2);
      
      // Calculate grid position that would center the terminal
      const centerX = (windowWidth / 2) - (terminalCenterX * zoomLevel);
      const centerY = (windowHeight / 2) - (terminalCenterY * zoomLevel);
      
      setGridPosition({ x: centerX, y: centerY });
    }
  };

  // Session management
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session) {
        // Check if this is a login after email change
        const currentEmail = session.user.email;
        const metadataEmail = session.user.user_metadata.email;

        // If emails don't match, update the metadata
        if (metadataEmail && currentEmail !== metadataEmail) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              ...session.user.user_metadata,
              email: currentEmail,
              user_metadata: {
                ...session.user.user_metadata.user_metadata,
                email: currentEmail
              }
            }
          });
          if (updateError) {
            console.error('Error updating user metadata:', updateError);
          }
        }

        setSession(session);
        setUser(session?.user || null);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user || null);

      // Handle email change confirmation specifically
      if (event === 'user_updated' && session?.user?.email !== user?.email) {
        const user = session?.user;
        if (user) {
          // Update metadata email only after email is actually changed
          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              ...user.user_metadata,
              email: user.email,
              user_metadata: {
                ...user.user_metadata.user_metadata,
                email: user.email
              }
            }
          });
          if (metadataError) {
            console.error('Error updating user metadata:', metadataError);
          }
        }
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [user?.email]); // Add user?.email to dependencies

  // Load terminals from localStorage
  useEffect(() => {
    const storedTerminals = localStorage.getItem('terminals');
    if (storedTerminals) {
      setTerminals(JSON.parse(storedTerminals));
    }
  }, []);

  // Save terminals to localStorage
  useEffect(() => {
    localStorage.setItem('terminals', JSON.stringify(terminals));
  }, [terminals]);

  const addTerminal = () => {
    const offset = 30;
    const id = Date.now();
    const newTerminal = {
      id,
      name: `Terminal ${terminals.length + 1}`,
      isMinimized: false,
      position: { 
        x: 100 + terminals.length * offset, 
        y: 100 + terminals.length * offset 
      },
      lastPosition: null,
      originalPosition: { 
        x: 100 + terminals.length * offset, 
        y: 100 + terminals.length * offset 
      },
      size: { width: 645, height: 225 },
      commands: [],
      zIndex: highestZIndex + 1,
    };
    setTerminals([...terminals, newTerminal]);
    setHighestZIndex((prev) => prev + 1);
    return id; // Return the new terminal's ID
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
      prevTerminals.map((terminal) => {
        if (terminal.id === id) {
          if (!terminal.isMinimized) {
            // Minimizing: store current position and move off-screen
            return {
              ...terminal,
              isMinimized: true,
              lastPosition: terminal.position,
              position: { x: -9999, y: -9999 }
            };
          } else {
            // Restoring: return to last position or original position
            return {
              ...terminal,
              isMinimized: false,
              position: terminal.lastPosition || terminal.originalPosition,
              zIndex: highestZIndex + 1
            };
          }
        }
        return terminal;
      })
    );
    // Ensure restored windows come to front
    if (!terminals.find(t => t.id === id)?.isMinimized) {
      setHighestZIndex((prev) => prev + 1);
    }
  };

  const closeTerminal = (id) => {
    setTerminals((prevTerminals) => prevTerminals.filter((terminal) => terminal.id !== id));
  };

  const updateTerminalPosition = (id, position) => {
    setTerminals((prevTerminals) => {
      return prevTerminals.map((terminal) =>
        terminal.id === id
          ? {
              ...terminal,
              position,
            }
          : terminal
      );
    });
  };

  const updateTerminalSize = (id, size) => {
    setTerminals((prevTerminals) =>
      prevTerminals.map((terminal) =>
        terminal.id === id ? { ...terminal, size } : terminal
      )
    );
  };

  const addCommandToTerminal = (id, command, output, isHtml = false) => {
    setTerminals((prevTerminals) =>
      prevTerminals.map((terminal) =>
        terminal.id === id
          ? { ...terminal, commands: [...terminal.commands, { command, output, isHtml }] }
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
          return {
            ...terminal,
            isMinimized: false,
            position: terminal.lastPosition || terminal.originalPosition,
            zIndex: highestZIndex + 1
          };
        }
        return terminal;
      })
    );
    setHighestZIndex((prev) => prev + 1);
  };

  const updateGridPosition = (newPosition) => {
    setGridPosition(newPosition);
  };

  const handleSSHCommand = async (terminalId, command) => {
    const connection = sshConnections[terminalId];
    
    if (!connection) {
      return {
        success: false,
        output: 'No active SSH connection. Use "ssh user@host" to connect.'
      };
    }

    const result = await sshService.executeCommand(connection.connectionId, command);
    return result;
  };

  const connectSSH = async (terminalId, storedCommand, password) => {
    try {
      // Parse the SSH command
      const match = storedCommand.match(/ssh\s+(\w+)@([\w.-]+)(?:\s+-p\s+(\d+))?/);
      if (!match) {
        return {
          success: false,
          error: 'Invalid SSH command. Use format: ssh user@host [-p port]'
        };
      }

      const [, username, host, port] = match;
      console.log('Attempting SSH connection:', { username, host, port, hasPassword: !!password }); // Log for debugging

      // Connect using SSHService with the password
      const result = await sshService.connectSSH(host, username, password, port || 22);
      
      if (result.connectionId) {
        // Store the successful connection
        setSSHConnections(prev => ({
          ...prev,
          [terminalId]: {
            connectionId: result.connectionId,
            host,
            username
          }
        }));

        return {
          success: true,
          message: result.message,
          initialOutput: result.output
        };
      }

      return {
        success: false,
        error: 'Failed to establish SSH connection'
      };

    } catch (error) {
      console.error('SSH Connection error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed. Please check your credentials.'
      };
    }
  };

  const disconnectSSH = async (terminalId) => {
    const connection = sshConnections[terminalId];
    if (!connection) return;

    await sshService.disconnect(connection.connectionId);
    
    setSSHConnections(prev => {
      const newConnections = { ...prev };
      delete newConnections[terminalId];
      return newConnections;
    });
  };

  return (
    <TerminalContext.Provider
      value={{
        terminals,
        setTerminals,
        gridPosition,
        zoomLevel,
        centerOnTerminal,
        setZoomLevel,
        addTerminal,
        toggleMinimizeTerminal,
        closeTerminal,
        updateTerminalPosition,
        updateTerminalSize,
        addCommandToTerminal,
        updateTerminalName,
        maximizeTerminal,
        updateGridPosition,
        bringToFront,
        user,
        session,
        sshConnections,
        handleSSHCommand,
        connectSSH,
        disconnectSSH,
        passwordInput,
        setPasswordInput,
        isPasswordMode,
        setIsPasswordMode,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};
