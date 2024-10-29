// TerminalWindow.js
"use client";

import React, { useContext, useState, useRef, useEffect } from "react";
import { ResizableBox } from "react-resizable";
import { TerminalContext } from "../context/TerminalContext";
import "react-resizable/css/styles.css";
import dynamic from 'next/dynamic';

// Dynamically import xterm and its addons
const Terminal = dynamic(() => import('xterm').then(mod => mod.Terminal), {
  ssr: false
});
const FitAddon = dynamic(() => import('@xterm/addon-fit').then(mod => mod.FitAddon), {
  ssr: false
});
const WebLinksAddon = dynamic(() => import('@xterm/addon-web-links').then(mod => mod.WebLinksAddon), {
  ssr: false
});
const SearchAddon = dynamic(() => import('@xterm/addon-search').then(mod => mod.SearchAddon), {
  ssr: false
});
const Unicode11Addon = dynamic(() => import('@xterm/addon-unicode11').then(mod => mod.Unicode11Addon), {
  ssr: false
});

// Import xterm CSS only on client side
if (typeof window !== 'undefined') {
  require('xterm/css/xterm.css');
}

const TerminalWindow = () => {
  const {
    terminals,
    setTerminals,  // Add this
    gridPosition,
    zoomLevel,
    toggleMinimizeTerminal,
    closeTerminal,
    updateTerminalPosition,
    updateTerminalSize,
    addCommandToTerminal,
    updateTerminalName,
    bringToFront,
    user,
    connectSSH,
    disconnectSSH,
    handleSSHCommand,
    sshConnections,
    isPasswordMode,
    passwordInput,         // Add this
    setPasswordInput,      // Add this
    setIsPasswordMode,     // Add this
  } = useContext(TerminalContext);

  // ASCII Art to be displayed
  const asciiArt = 
  `
    ██╗      █████╗ ███╗   ██╗ ██████╗████████╗███████╗██████╗ ███╗   ███╗
    ██║     ██╔══██╗████╗  ██║██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
    ██║     ███████║██╔██╗ ██║██║  ███╗  ██║   █████╗  ██████╔╝██╔████╔██║
    ██║     ██╔══██║██║██╗ ██║██║   ██║  ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║
    ███████╗██║  ██║██║ ╚████║╚██████╔╝  ██║   ███████╗██║  ██║██║ ╚═╝ ██║
    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
 `;

  const [editingTerminalId, setEditingTerminalId] = useState(null);
  const [tempName, setTempName] = useState("");
  const [terminalInputs, setTerminalInputs] = useState({});
  const inputRefs = useRef({});
  const dragRefs = useRef({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const terminalBodyRefs = useRef({});
  const terminalRefs = useRef({});

  // Format username function
  const formatUsername = (user) => {
    if (!user) return 'guest';
    
    // If user has a preferred name set
    if (user.user_metadata?.preferred_name) {
      return user.user_metadata.preferred_name;
    }
    
    // Otherwise use email without domain
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    // Fallback
    return 'guest';
  };

  const promptText = `${formatUsername(user)}@langterm:~$ `;

  const getCurrentInput = (id) => terminalInputs[id] || "";

  const setCurrentInput = (id, value) => {
    setTerminalInputs((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const executeCommand = async (command, terminal) => {
    const [cmd, ...args] = command.trim().split(/\s+/);
    
    switch (cmd.toLowerCase()) {
      case "ssh":
        const sshResult = await connectSSH(terminal.id, command);
        return sshResult.message || sshResult.error;
        
      case "exit":
        if (sshConnections[terminal.id]) {
          await disconnectSSH(terminal.id);
          return "SSH connection closed.";
        }
        return "No active SSH connection to close.";
        
      case "echo":
        return args.join(" ") || "Hello, LangTerm!";
        
      default:
        // If we have an SSH connection, send command to remote server
        if (sshConnections[terminal.id]) {
          const result = await handleSSHCommand(terminal.id, command);
          return result.success ? result.output : result.error;
        }
        return `Command "${cmd}" not found.`;
    }
  };

  const handleNameClick = (id, currentName) => {
    setEditingTerminalId(id);
    setTempName(currentName);
  };

  const handleNameChange = (e) => {
    setTempName(e.target.value);
  };

  const handleNameBlur = (id) => {
    updateTerminalName(id, tempName);
    setEditingTerminalId(null);
  };

  const handleTerminalClick = (id) => {
    bringToFront(id);
    if (inputRefs.current[id]) {
      inputRefs.current[id].focus();
    }
  };

  const handleMouseDown = (e, terminal) => {
    if (!e.target.closest('.handle')) return;

    setIsDragging(true);
    dragRefs.current.activeId = terminal.id;
    
    setDragStart({
      x: e.clientX - (terminal.position.x * zoomLevel + gridPosition.x),
      y: e.clientY - (terminal.position.y * zoomLevel + gridPosition.y),
    });
    
    bringToFront(terminal.id);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragRefs.current.activeId) return;

    const terminal = terminals.find(t => t.id === dragRefs.current.activeId);
    if (!terminal) return;

    const newX = (e.clientX - dragStart.x - gridPosition.x) / zoomLevel;
    const newY = (e.clientY - dragStart.y - gridPosition.y) / zoomLevel;

    updateTerminalPosition(terminal.id, {
      x: newX,
      y: newY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRefs.current.activeId = null;
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommandSubmit(id);
    }
  };

  const handleInputChange = (e, id) => {
    setCurrentInput(id, e.target.value);
    adjustTextareaHeight(id);
  };

  const adjustTextareaHeight = (id) => {
    const textarea = inputRefs.current[id];
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  const handleMinimizeClick = (e, id) => {
    e.stopPropagation();
    toggleMinimizeTerminal(id);
  };

  const handleCloseClick = (e, id) => {
    e.stopPropagation();
    closeTerminal(id);
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !dragRefs.current.activeId) return;
  
      const terminal = terminals.find((t) => t.id === dragRefs.current.activeId);
      if (!terminal) return;
  
      const newX = (e.clientX - dragStart.x - gridPosition.x) / zoomLevel;
      const newY = (e.clientY - dragStart.y - gridPosition.y) / zoomLevel;
  
      updateTerminalPosition(terminal.id, {
        x: newX,
        y: newY,
      });
    };
  
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, gridPosition, zoomLevel, terminals, updateTerminalPosition]);

  React.useEffect(() => {
    terminals.forEach(terminal => {
      if (!terminalRefs.current[terminal.id]) {
        const term = new Terminal({
          fontFamily: 'Ubuntu Mono, monospace',
          fontSize: 14,
          theme: {
            background: 'transparent',
            foreground: '#00ff00',
            cursor: '#00ff00',
            cursorAccent: '#00ff00',
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
          cursorBlink: true,
          cursorStyle: 'block',
          allowTransparency: true,
          scrollback: 10000,
          cols: 100,
          rows: 24,
          convertEol: true,
          windowsMode: false, // Disable Windows line ending mode
          wordSeparator: ' ()[]{}\'"', // Characters that separate words
          allowProposedApi: true, // Enable proposed API features
          macOptionIsMeta: true, // Make Option key behave as Meta on macOS
          altClickMovesCursor: true, // Alt + Click moves cursor
          screenReaderMode: false, // Disable screen reader mode
          rightClickSelectsWord: true // Right click selects word under cursor
        });

        // Load addons
        const fitAddon = new FitAddon();
        const searchAddon = new SearchAddon();
        const unicode11Addon = new Unicode11Addon();
        
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());
        term.loadAddon(searchAddon);
        term.loadAddon(unicode11Addon);

        // Enable Unicode 11 features
        term.unicode.activeVersion = '11';

        const terminalElement = document.getElementById(`terminal-${terminal.id}`);
        if (terminalElement) {
          terminalElement.innerHTML = '';
          terminalElement.style.padding = '12px';
          terminalElement.style.height = '100%';
          terminalElement.style.width = '100%';
          terminalElement.style.overflow = 'hidden';
          
          term.open(terminalElement);
          fitAddon.fit();

          // Write ASCII art
          term.writeln('');
          asciiArt.split('\n').forEach(line => {
            term.writeln(line);
          });
          term.writeln('');

          let currentLine = '';
          let currentPrompt = '';

          // Handle special keys
          term.onKey(({ key, domEvent }) => {
            const ev = domEvent;
            const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

            if (ev.keyCode === 13) { // Enter
              term.write('\r\n');
              handleCommandSubmit(terminal.id);
              currentLine = '';
            } else if (ev.keyCode === 8) { // Backspace
              if (currentLine.length > 0) {
                currentLine = currentLine.slice(0, -1);
                term.write('\b \b');
              }
            } else if (printable) {
              currentLine += key;
              term.write(key);
            }
          });

          // Handle paste events
          term.onData(data => {
            if (sshConnections[terminal.id]) {
              // If SSH connected, send data directly
              handleSSHCommand(terminal.id, data);
            } else {
              // Handle pasted data
              const lines = data.split(/\r?\n/);
              lines.forEach((line, i) => {
                if (i > 0) term.write('\r\n');
                term.write(line);
                currentLine += line;
              });
            }
          });

          // Store terminal reference with all addons
          terminalRefs.current[terminal.id] = {
            terminal: term,
            fitAddon,
            searchAddon,
            unicode11Addon,
            currentLine,
            currentPrompt
          };
        }
      }
    });

    // Handle window resize
    const handleResize = () => {
      terminals.forEach(terminal => {
        const ref = terminalRefs.current[terminal.id];
        if (ref?.fitAddon) {
          ref.fitAddon.fit();
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [terminals]);

  const handleCommandSubmit = async (id) => {
    const termRef = terminalRefs.current[id];
    if (!termRef) return;

    const term = termRef.terminal;
    const currentInput = getCurrentInput(id);
    
    try {
      if (isPasswordMode[id]) {
        const command = passwordInput[id];
        setIsPasswordMode(prev => ({ ...prev, [id]: false }));
        
        term.write('\r\nConnecting...\r\n');
        
        const result = await connectSSH(id, command, currentInput);
        
        if (result.success) {
          // Clear terminal
          term.clear();
          // Write welcome message
          if (result.initialOutput) {
            term.write(result.initialOutput);
          }
        } else {
          term.writeln(result.error || "Failed to connect");
        }
      } else if (sshConnections[id]) {
        const result = await handleSSHCommand(id, currentInput);
        if (result.success) {
          term.write(result.output);
        } else {
          term.writeln(result.error);
        }
      }
    } catch (error) {
      console.error('Command execution error:', error);
      term.writeln(error.message || 'Command execution failed');
    }
    
    setCurrentInput(id, "");
  };

  // Add this effect to handle scrolling
  useEffect(() => {
    terminals.forEach(terminal => {
      const bodyElement = terminalBodyRefs.current[terminal.id];
      if (bodyElement) {
        bodyElement.scrollTop = bodyElement.scrollHeight;
      }
    });
  }, [terminals]); // This will run whenever terminals state changes

  return (
    <>
      {terminals.map((terminal) => (
        <div
          key={terminal.id}
          ref={el => dragRefs.current[terminal.id] = el}
          data-id={terminal.id}
          style={{
            position: "absolute",
            left: `${terminal.position.x * zoomLevel + gridPosition.x}px`,
            top: `${terminal.position.y * zoomLevel + gridPosition.y}px`,
            zIndex: terminal.zIndex,
            width: `${terminal.size.width * zoomLevel}px`,
            height: `${terminal.size.height * zoomLevel}px`,
            cursor: isDragging && dragRefs.current.activeId === terminal.id ? 'grabbing' : 'default',
          }}
          onMouseDown={(e) => handleMouseDown(e, terminal)}
        >
          <ResizableBox
            width={terminal.size.width * zoomLevel}
            height={terminal.size.height * zoomLevel}
            minConstraints={[300 * zoomLevel, 200 * zoomLevel]}
            maxConstraints={[800 * zoomLevel, 600 * zoomLevel]}
            onResizeStop={(e, data) => {
              updateTerminalSize(terminal.id, {
                width: data.size.width / zoomLevel,
                height: data.size.height / zoomLevel,
              });
              // Fit terminal to new size
              const ref = terminalRefs.current[terminal.id];
              if (ref?.fitAddon) {
                ref.fitAddon.fit();
              }
            }}
            style={{ zIndex: terminal.zIndex }}
            className={`terminal-window ${terminal.isMinimized ? "invisible" : ""}`}
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
                    {terminal.name || "LangTerm"}
                  </span>
                )}
                <div className="ml-auto flex" style={{ gap: `${8 * zoomLevel}px` }}>
                  <button
                    onClick={(e) => handleMinimizeClick(e, terminal.id)}
                    className="w-3 h-3 bg-yellow-400 rounded-full focus:outline-none cursor-pointer"
                    aria-label="Minimize Terminal"
                    style={{
                      width: `${16 * zoomLevel}px`,
                      height: `${16 * zoomLevel}px`,
                      flexShrink: 0, // Prevent button from shrinking
                    }}
                  ></button>
                  <button
                    onClick={(e) => handleCloseClick(e, terminal.id)}
                    className="w-3 h-3 bg-red-500 rounded-full focus:outline-none cursor-pointer"
                    aria-label="Close Terminal"
                    style={{
                      width: `${16 * zoomLevel}px`,
                      height: `${16 * zoomLevel}px`,
                      flexShrink: 0, // Prevent button from shrinking
                    }}
                  ></button>
                </div>
              </div>

              {/* Terminal Body */}
              <div
                ref={el => terminalBodyRefs.current[terminal.id] = el}
                className="flex-1 bg-transparent p-2 text-green-400 overflow-auto whitespace-pre-wrap font-mono"
                style={{ 
                  fontSize: `${16 * zoomLevel}px`,
                  maxHeight: `calc(100% - ${40 * zoomLevel}px)`
                }}
              >
                {/* Show ASCII art */}
                <pre
                  className="text-green-400"
                  style={{
                    fontSize: `${16 * zoomLevel}px`,
                    fontFamily: "monospace",
                    whiteSpace: "pre",
                    lineHeight: "normal",
                    letterSpacing: "normal",
                    display: "block",
                    flex: "none",
                  }}
                >
                  {asciiArt}
                </pre>

                {/* Command outputs */}
                {terminal.commands.map((cmd, index) => (
                  <div key={index}>
                    <div 
                      className="text-yellow-300"
                      dangerouslySetInnerHTML={{ 
                        __html: cmd.isHtml ? cmd.output : `<span>${cmd.output}</span>`
                      }}
                    />
                  </div>
                ))}

                {/* Command Input Section */}
                {(isPasswordMode[terminal.id] || sshConnections[terminal.id]) && (
                  <div className="flex relative">
                    {isPasswordMode[terminal.id] && (
                      <span className="text-green-400">Password: </span>
                    )}
                    <form
                      className="flex-grow"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCommandSubmit(terminal.id);
                      }}
                    >
                      <textarea
                        name="command"
                        value={getCurrentInput(terminal.id)}
                        onChange={(e) => handleInputChange(e, terminal.id)}
                        onKeyDown={(e) => handleKeyDown(e, terminal.id)}
                        className="w-full bg-transparent outline-none resize-none font-mono"
                        autoFocus
                        autoComplete="off"
                        ref={(el) => (inputRefs.current[terminal.id] = el)}
                        spellCheck={false}
                        autoCorrect="off"
                        rows={1}
                        style={{
                          fontSize: `${16 * zoomLevel}px`,
                          lineHeight: '1.5',
                          caretColor: "green",
                          overflow: 'hidden',
                          whiteSpace: 'pre-wrap',
                          marginLeft: '8px',
                          color: isPasswordMode[terminal.id] ? 'transparent' : '#68D391',
                          textShadow: isPasswordMode[terminal.id] ? '0 0 8px rgba(0,255,0,0.5)' : 'none',
                        }}
                      />
                    </form>
                  </div>
                )}
              </div>
            </div>
          </ResizableBox>
        </div>
      ))}
    </>
  );
};

export default TerminalWindow;
