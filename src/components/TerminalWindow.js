"use client";

import React, { useContext, useState, useRef, useEffect } from "react";
import { ResizableBox } from "react-resizable";
import { TerminalContext } from "../context/TerminalContext";
import { XTerm } from 'react-xtermjs';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import "react-resizable/css/styles.css";
import '@xterm/xterm/css/xterm.css';

const TerminalWindow = () => {
  const {
    terminals,
    gridPosition,
    zoomLevel,
    toggleMinimizeTerminal,
    closeTerminal,
    updateTerminalPosition,
    updateTerminalSize,
    bringToFront,
    sshConnections,
    handleSSHCommand,
  } = useContext(TerminalContext);

  const [editingTerminalId, setEditingTerminalId] = useState(null);
  const [tempName, setTempName] = useState("");
  const dragRefs = useRef({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const terminalRefs = useRef({});

  // Terminal initialization
  useEffect(() => {
    terminals.forEach(terminal => {
      if (!terminalRefs.current[terminal.id]) {
        const fitAddon = new FitAddon();
        const searchAddon = new SearchAddon();
        const webLinksAddon = new WebLinksAddon();
        const unicode11Addon = new Unicode11Addon();

        terminalRefs.current[terminal.id] = {
          addons: [fitAddon, searchAddon, webLinksAddon, unicode11Addon],
          fitAddon
        };
      }
    });
  }, [terminals]);

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

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRefs.current.activeId = null;
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
                    {terminal.name || "Terminal"}
                  </span>
                )}
                <div className="ml-auto flex" style={{ gap: `${8 * zoomLevel}px` }}>
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
              <div className="flex-1 bg-transparent">
                <XTerm
                  className="h-full"
                  addons={terminalRefs.current[terminal.id]?.addons || []}
                  options={{
                    theme: {
                      background: 'transparent',
                      foreground: '#00ff00',
                      cursor: '#00ff00',
                      cursorAccent: '#00ff00',
                      selection: 'rgba(255, 255, 255, 0.3)',
                    },
                    fontFamily: 'Ubuntu Mono, monospace',
                    fontSize: 14 * zoomLevel,
                    cursorBlink: true,
                    cursorStyle: 'block',
                    allowTransparency: true,
                    scrollback: 10000,
                  }}
                  onData={(data) => {
                    if (sshConnections[terminal.id]) {
                      handleSSHCommand(terminal.id, data);
                    }
                  }}
                />
              </div>
            </div>
          </ResizableBox>
        </div>
      ))}
    </>
  );
};

export default TerminalWindow;
