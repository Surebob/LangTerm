"use client";

import React, { useContext, useState, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { TerminalContext } from '../context/TerminalContext';
import 'react-resizable/css/styles.css';

const TerminalWindow = () => {
  const {
    terminals,
    gridPosition,
    zoomLevel,
    toggleMinimizeTerminal,
    closeTerminal,
    updateTerminalPosition,
    updateTerminalSize,
    addCommandToTerminal,
    updateTerminalName,
    bringToFront,
    maximizeTerminal, // Although not used, retained for potential future use
  } = useContext(TerminalContext);

  const [editingTerminalId, setEditingTerminalId] = useState(null);
  const [tempName, setTempName] = useState('');
  const [terminalInputs, setTerminalInputs] = useState({});
  const [caretPositions, setCaretPositions] = useState({});
  const inputRefs = useRef({});

  const promptText = 'terminal@quantum:~$ ';

  const getCurrentInput = (id) => terminalInputs[id] || '';

  const setCurrentInput = (id, value) => {
    setTerminalInputs((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const getCaretPosition = (id) => caretPositions[id] || 0;

  const setCaretPosition = (id, value) => {
    setCaretPositions((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleCommandSubmit = (id) => {
    const currentInput = getCurrentInput(id);
    const output = executeCommand(currentInput);
    addCommandToTerminal(id, currentInput, output);
    setCurrentInput(id, '');
    setCaretPosition(id, 0);
  };

  const executeCommand = (command) => {
    const [cmd] = command.split(' ');
    switch (cmd.toLowerCase()) {
      case 'echo':
        return 'Hello, Quantum Terminal!';
      default:
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
    bringToFront(id); // Bring terminal to the front when clicked
    if (inputRefs.current[id]) {
      inputRefs.current[id].focus();
    }
  };

  const handleToolbarMouseDown = (id) => {
    bringToFront(id); // Bring to front on mouse down
  };

  const handleKeyDown = (e, id) => {
    const { key } = e;
    let pos = getCaretPosition(id);
    let currentInput = getCurrentInput(id);

    if (key === 'ArrowLeft') {
      if (pos > 0) {
        setCaretPosition(id, pos - 1);
      }
    } else if (key === 'ArrowRight') {
      if (pos < currentInput.length) {
        setCaretPosition(id, pos + 1);
      }
    } else if (key === 'Delete') {
      e.preventDefault();
      if (pos < currentInput.length) {
        const updatedInput =
          currentInput.slice(0, pos) + currentInput.slice(pos + 1);
        setCurrentInput(id, updatedInput);
        setCaretPosition(id, pos);
      }
    } else if (key === 'Backspace') {
      e.preventDefault();
      if (pos > 0) {
        const updatedInput =
          currentInput.slice(0, pos - 1) + currentInput.slice(pos);
        setCurrentInput(id, updatedInput);
        setCaretPosition(id, pos - 1);
      }
    }
  };

  const handleInputChange = (e, id) => {
    setCurrentInput(id, e.target.value);
    setCaretPosition(id, e.target.selectionStart);
  };

  const handleMinimizeClick = (e, id) => {
    e.stopPropagation();
    toggleMinimizeTerminal(id);
  };

  const handleCloseClick = (e, id) => {
    e.stopPropagation();
    closeTerminal(id);
  };

  return (
    <>
      {terminals.map((terminal) => (
        <Draggable
          key={terminal.id}
          handle=".handle"
          position={{
            x: terminal.position.x * zoomLevel + gridPosition.x,
            y: terminal.position.y * zoomLevel + gridPosition.y,
          }}
          onMouseDown={() => handleToolbarMouseDown(terminal.id)}
          onStop={(e, data) => {
            updateTerminalPosition(terminal.id, {
              x: (data.x - gridPosition.x) / zoomLevel,
              y: (data.y - gridPosition.y) / zoomLevel,
            });
          }}
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
            }}
            style={{ zIndex: terminal.zIndex }}
            // Removed 'absolute' class to prevent conflicts with Draggable
            className={`terminal-window ${terminal.isMinimized ? 'invisible' : ''}`}
          >
            <div
              className="flex flex-col h-full"
              onClick={() => handleTerminalClick(terminal.id)}
              style={{ fontSize: `${16 * zoomLevel}px` }}
            >
              {/* Terminal Header */}
              <div
                className="handle terminal-header p-2 flex justify-between items-center cursor-move relative"
                onMouseDown={() => handleToolbarMouseDown(terminal.id)}
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
                    {terminal.name || 'Quantum Terminal'}
                  </span>
                )}
                <div className="ml-auto flex space-x-2">
                  <button
                    onClick={(e) => handleMinimizeClick(e, terminal.id)}
                    className="w-3 h-3 bg-yellow-400 rounded-full focus:outline-none cursor-pointer"
                    aria-label="Minimize Terminal"
                    style={{
                      width: `${16 * zoomLevel}px`,
                      height: `${16 * zoomLevel}px`,
                    }}
                  ></button>
                  <button
                    onClick={(e) => handleCloseClick(e, terminal.id)}
                    className="w-3 h-3 bg-red-500 rounded-full focus:outline-none cursor-pointer"
                    aria-label="Close Terminal"
                    style={{
                      width: `${16 * zoomLevel}px`,
                      height: `${16 * zoomLevel}px`,
                    }}
                  ></button>
                </div>
              </div>

              {/* Terminal Body */}
              <div
                className="flex-1 bg-transparent p-2 text-green-400 overflow-auto"
                onClick={() => handleTerminalClick(terminal.id)}
                style={{ fontSize: `${14 * zoomLevel}px` }}
              >
                {terminal.commands.map((cmd, index) => (
                  <div key={index}>
                    <div>{`${promptText}${cmd.command}`}</div>
                    <div className="pl-4 text-yellow-300">{cmd.output}</div>
                  </div>
                ))}

                {/* Command Input with Blinking Green Cursor */}
                <div className="flex relative">
                  <span className="text-green-400">{promptText}</span>
                  <form
                    className="flex-grow ml-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCommandSubmit(terminal.id);
                    }}
                  >
                    <input
                      type="text"
                      name="command"
                      value={getCurrentInput(terminal.id)}
                      onChange={(e) => handleInputChange(e, terminal.id)}
                      onKeyDown={(e) => handleKeyDown(e, terminal.id)}
                      className="w-full bg-transparent text-green-400 outline-none"
                      autoFocus
                      autoComplete="off"
                      ref={(el) => (inputRefs.current[terminal.id] = el)}
                      spellCheck={false}
                      autoCorrect="off"
                      style={{
                        fontSize: `${14 * zoomLevel}px`,
                        caretColor: 'transparent',
                      }}
                    />
                    <span
                      className="blinking-cursor absolute"
                      style={{
                        left: `calc(${getCaretPosition(terminal.id)}ch + ${promptText.length}ch)`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    >
                      _
                    </span>
                  </form>
                </div>
              </div>
            </div>
          </ResizableBox>
        </Draggable>
      ))}
    </>
  );
};

export default TerminalWindow;
