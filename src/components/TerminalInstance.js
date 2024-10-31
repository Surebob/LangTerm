// Import React and other dependencies
import React, { useEffect, useRef, memo, useState, useContext } from "react";
import { ResizableBox } from "react-resizable";
import "xterm/css/xterm.css";
import { TerminalContext } from "../context/TerminalContext";

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
    setIsPasswordMode,
    handleSSHCommand 
  } = useContext(TerminalContext);

  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const terminalDivRef = useRef(null);
  const initializationRef = useRef(false);
  const [password, setPassword] = useState('');

  // Create a ref to store the password
  const passwordRef = useRef('');

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
        // Clear password mode first
        setIsPasswordMode(prev => ({ ...prev, [terminal.id]: false }));
        setPasswordInput(prev => {
          const newState = { ...prev };
          delete newState[terminal.id];
          return newState;
        });

        // Write connection success message
        termRef.current.writeln('\r\nConnected successfully!');
        
        // Write the initial output (Ubuntu welcome message)
        if (result.initialOutput) {
          termRef.current.writeln('\r\n' + result.initialOutput);
        }
        
        // Add prompt after welcome message
        termRef.current.write('\r\n$ ');
      } else {
        // Keep password mode and show error
        termRef.current.writeln(`\r\nConnection failed: ${result.error}`);
        termRef.current.write('\r\nEnter password: ');
      }
    } catch (error) {
      console.error('SSH Login error:', error);
      termRef.current.writeln(`\r\nConnection error: ${error.message}`);
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
          background: 'transparent',
          foreground: '#33ff33',
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
        allowTransparency: true,
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
        } else {
          term.writeln('Welcome to xTerm.js');
          term.write('\r\n$ ');
        }
        
        term.onData(data => {
          if (isPasswordMode[terminal.id]) {
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
            handleSSHCommand(terminal.id, data).then(result => {
              if (result.success) {
                term.write(result.output);
              } else {
                term.write(`\r\nError: ${result.error}\r\n`);
              }
            });
          }
        });

        term.onBinary(data => {
          if (!isPasswordMode[terminal.id]) {
            term.write(data);
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
      }
    };
  }, [terminal.id, isPasswordMode, handleSSHCommand, passwordInput, handleSSHLogin]);

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
