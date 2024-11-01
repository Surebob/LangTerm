// TerminalInstance.js

// Import React and other dependencies
import React, { useEffect, useRef, memo, useState, useContext } from "react";
import { ResizableBox } from "react-resizable";
import "xterm/css/xterm.css";
import { TerminalContext } from "../context/TerminalContext";
import { sshService } from "../services/SSHService"; // Import sshService

// Add these constants at the top of the file, after imports
const BASE_CHAR_WIDTH = 9;  // Base width of a character in pixels
const BASE_CHAR_HEIGHT = 17; // Base height of a character in pixels

// Font metrics for precise calculations (based on Ubuntu Mono at 16px)
const FONT_CONFIG = {
  charWidth: 9,    // Width of a single character
  charHeight: 17,  // Height of a single character including line spacing
  lineHeight: 1.2  // Line height multiplier
};

// TerminalInstance component definition
const TerminalInstance = ({
  terminal,
  gridPosition,
  zoomLevel,
  isDragging,
  dragRefs,
  handleMouseDown,
  handleTerminalClick,
  updateTerminalSize,
  toggleMinimizeTerminal,
  closeTerminal,
  editingTerminalId,
  tempName,
  handleNameClick,
  handleNameChange,
  handleNameBlur,
}) => {
  const { 
    passwordInput, 
    isPasswordMode, 
    connectSSH, 
    setPasswordInput, 
    setIsPasswordMode
  } = useContext(TerminalContext);

  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const terminalDivRef = useRef(null);
  const initializationRef = useRef(false);
  const [password, setPassword] = useState('');

  // Create a ref to store the password
  const passwordRef = useRef('');

  // Create a ref to store isPasswordMode for this terminal
  const isPasswordModeRef = useRef(isPasswordMode[terminal.id]);

  useEffect(() => {
    isPasswordModeRef.current = isPasswordMode[terminal.id];
  }, [isPasswordMode, terminal.id]);

  // Create a ref to store the connectionId
  const connectionIdRef = useRef(null);

  // Move handleSSHLogin outside of useEffect and make it a useCallback
  const handleSSHLogin = React.useCallback(async () => {
    const currentPassword = passwordRef.current;
    const storedCommand = passwordInput[terminal.id];
    
    if (!storedCommand) {
      console.log('No stored command found for terminal:', terminal.id);
      return;
    }

    try {
      const result = await connectSSH(terminal.id, storedCommand, currentPassword);
      
      if (result.success) {
        // Store connectionId
        connectionIdRef.current = result.connectionId;

        // Clear password mode first
        setIsPasswordMode(prev => ({ ...prev, [terminal.id]: false }));
        setPasswordInput(prev => {
          const newState = { ...prev };
          delete newState[terminal.id];
          return newState;
        });

        // Set up handler for incoming data using the stored connectionId
        sshService.onData(connectionIdRef.current, (data) => {
          console.log('Received data from SSH session:', data); // Log incoming data

          if (termRef.current) {
            console.log('termRef.current exists. Writing data to terminal.');
          } else {
            console.error('termRef.current is null or undefined.');
          }

          if (data.type === 'OUTPUT') {
            // Handle the output data
            console.log('Writing output to terminal:', data.output);
            termRef.current.write(data.output); // Use write instead of writeln
            console.log('Write operation completed.');
          } else if (data.type === 'ERROR') {
            // Handle any errors
            console.error('SSH Error:', data.error);
            termRef.current.write(`\r\nError: ${data.error}\r\n`); // Use write for errors as well
          }
        });

        // Just a newline to separate
        termRef.current.write('\r\n');

        // Optionally, write a message indicating successful connection
        termRef.current.write('SSH connection established.\r\n');
        // Write a static test message (can be removed after testing)
        termRef.current.write('Static test message.\r\n');
      } else {
        // Keep password mode and show error
        termRef.current.write(`\r\nConnection failed: ${result.error}\r\n`);
        termRef.current.write('\r\nEnter password: ');
      }
    } catch (error) {
      console.error('SSH Login error:', error);
      termRef.current.write(`\r\nConnection error: ${error.message}\r\n`);
      termRef.current.write('\r\nEnter password: ');
    }

    // Clear password
    passwordRef.current = '';
    setPassword('');
  }, [terminal.id, passwordInput, connectSSH, setIsPasswordMode, setPasswordInput]);

  useEffect(() => {
    if (initializationRef.current || termRef.current) return;
    
    let term;
    let fitAddon;
    const initTerminal = async () => {
      initializationRef.current = true;
      
      console.log("Initializing xterm instance for Terminal ID:", terminal.id);

      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");

      term = new Terminal({
        cursorBlink: true,
        fontSize: 16 * zoomLevel,
        fontFamily: '"Ubuntu Mono", monospace',
        lineHeight: 1.2,
        theme: {
          background: 'transparent',          // Restore original background
          foreground: '#33ff33',             // Restore original green foreground
          cursor: '#33ff33',
          cursorAccent: '#000000',
          selection: 'rgba(255, 255, 255, 0.3)',
          black: '#000000',
          red: '#cc0000',
          green: '#4e9a06',
          yellow: '#c4a000',
          blue: '#3465a4',
          magenta: '#75507b',
          cyan: '#06989a',
          white: '#d3d7cf',
          brightBlack: '#555753',
          brightRed: '#ef2929',
          brightGreen: '#8ae234',
          brightYellow: '#fce94f',
          brightBlue: '#729fcf',
          brightMagenta: '#ad7fa8',
          brightCyan: '#34e2e2',
          brightWhite: '#eeeeec'
        },
        allowTransparency: true,              // Set back to true if originally set
        rendererType: 'canvas',
        scrollback: 1000,
      });
      
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      if (terminalDivRef.current) {
        term.open(terminalDivRef.current);
        fitAddon.fit();
        
        if (isPasswordMode[terminal.id]) {
          term.write('Enter password: ');
        }
        
        term.focus(); // Ensure the terminal is focused
        
        term.onData(data => {
          if (isPasswordModeRef.current) {
            if (data === '\r') {
              term.write('\r\n');
              handleSSHLogin();
            } else if (data === '\u007f') { // Handle backspace
              if (passwordRef.current.length > 0) {
                passwordRef.current = passwordRef.current.slice(0, -1);
                setPassword(passwordRef.current); // Keep state in sync for UI updates
                term.write('\b \b');
              }
            } else {
              passwordRef.current = passwordRef.current + data;
              setPassword(passwordRef.current); // Keep state in sync for UI updates
              term.write('*');
            }
          } else {
            // Send data directly to SSH session
            if (connectionIdRef.current) {
              sshService.sendData(connectionIdRef.current, data);
            }
          }
        });

        term.onBinary(data => {
          if (!isPasswordModeRef.current) {
            // Send binary data to SSH session
            if (connectionIdRef.current) {
              sshService.sendData(connectionIdRef.current, data);
            }
          }
        });
      }

      termRef.current = term;
      fitAddonRef.current = fitAddon;
    };

    initTerminal();

    return () => {
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
        fitAddonRef.current = null;
        initializationRef.current = false;
        passwordRef.current = ''; // Clear password on cleanup
        // Clean up SSH session
        if (connectionIdRef.current) {
          sshService.disconnect(connectionIdRef.current);
          connectionIdRef.current = null;
        }
      }
    };
  }, [terminal.id, isPasswordMode, passwordInput, handleSSHLogin, zoomLevel]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.fontSize = 16 * zoomLevel;
      // Only call fit() once after the font size change
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
      });
    }
  }, [zoomLevel]);

  useEffect(() => {
    fitAddonRef.current?.fit();
  }, [terminal.size]);

  const handleResizeStop = (e, data) => {
    const newSize = {
      width: data.size.width / zoomLevel,
      height: data.size.height / zoomLevel,
    };
    
    updateTerminalSize(terminal.id, newSize);
    fitAddonRef.current?.fit();
  };

  const handleClick = (e) => {
    e.stopPropagation();
    termRef.current?.focus();
    handleTerminalClick(terminal.id);
  };

  return (
    <div
      ref={(el) => (dragRefs.current[terminal.id] = el)}
      data-id={terminal.id}
      style={{
        position: "absolute",
        left: `${terminal.position.x * zoomLevel + gridPosition.x}px`,
        top: `${terminal.position.y * zoomLevel + gridPosition.y}px`,
        zIndex: terminal.zIndex,
        width: `${terminal.size.width * zoomLevel}px`,
        height: `${terminal.size.height * zoomLevel}px`,
        cursor:
          isDragging && dragRefs.current.activeId === terminal.id
            ? "grabbing"
            : "default",
      }}
      onMouseDown={(e) => handleMouseDown(e, terminal)}
    >
      <ResizableBox
        width={terminal.size.width * zoomLevel}
        height={terminal.size.height * zoomLevel}
        minConstraints={[300 * zoomLevel, 200 * zoomLevel]}
        maxConstraints={[800 * zoomLevel, 600 * zoomLevel]}
        onResizeStop={handleResizeStop}
        style={{ zIndex: terminal.zIndex }}
        className={`terminal-window ${
          terminal.isMinimized ? "invisible" : ""
        }`}
      >
        <div
          className="flex flex-col h-full"
          onClick={() => handleTerminalClick(terminal.id)}
          style={{ fontSize: `${16 * zoomLevel}px` }}
        >
          {/* Terminal Header */}
          <div
            className="handle terminal-header p-2 flex justify-between items-center cursor-move relative"
            style={{ padding: `${8 * zoomLevel}px` }}
          >
            {editingTerminalId === terminal.id ? (
              <input
                type="text"
                value={tempName}
                onChange={handleNameChange}
                onBlur={() => handleNameBlur(terminal.id)}
                autoFocus
                className="bg-transparent text-white border-none focus:ring-0 w-32 absolute left-1/2 transform -translate-x-1/2"
                style={{ fontSize: `${16 * zoomLevel}px` }}
              />
            ) : (
              <span
                className="font-mono cursor-pointer absolute left-1/2 transform -translate-x-1/2"
                onClick={() => handleNameClick(terminal.id, terminal.name)}
                style={{ fontSize: `${16 * zoomLevel}px` }}
              >
                {terminal.name || "Terminal"}
              </span>
            )}
            <div
              className="ml-auto flex"
              style={{ gap: `${8 * zoomLevel}px` }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimizeTerminal(terminal.id);
                }}
                className="w-3 h-3 bg-yellow-400 rounded-full focus:outline-none cursor-pointer"
                aria-label="Minimize Terminal"
                style={{
                  width: `${16 * zoomLevel}px`,
                  height: `${16 * zoomLevel}px`,
                  flexShrink: 0,
                }}
              ></button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(terminal.id);
                }}
                className="w-3 h-3 bg-red-500 rounded-full focus:outline-none cursor-pointer"
                aria-label="Close Terminal"
                style={{
                  width: `${16 * zoomLevel}px`,
                  height: `${16 * zoomLevel}px`,
                  flexShrink: 0,
                }}
              ></button>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            ref={terminalDivRef}
            className="flex-1 overflow-hidden rounded-b-lg"
            onClick={handleTerminalClick}
            style={{
              height: `calc(100% - ${40 * zoomLevel}px)`,
              fontSize: `${16 * zoomLevel}px`,
              display: 'flex',
              flexDirection: 'column',
              background: 'transparent',
            }}
          />
        </div>
      </ResizableBox>
    </div>
  );
};

export default memo(TerminalInstance);
