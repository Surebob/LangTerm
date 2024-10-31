// TerminalWindow.js
import React, { useContext, useState, useRef, useEffect } from "react";
import { TerminalContext } from "../context/TerminalContext";
import TerminalInstance from "./TerminalInstance";
import "react-resizable/css/styles.css";
import "xterm/css/xterm.css";

const TerminalWindow = () => {
  const {
    terminals,
    gridPosition,
    zoomLevel,
    toggleMinimizeTerminal,
    closeTerminal,
    updateTerminalPosition,
    updateTerminalSize,
    updateTerminalName,
    bringToFront,
  } = useContext(TerminalContext);

  const [editingTerminalId, setEditingTerminalId] = useState(null);
  const [tempName, setTempName] = useState("");
  const dragRefs = useRef({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
    if (!e.target.closest(".handle")) return;

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

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !dragRefs.current.activeId) return;

      const terminal = terminals.find(
        (t) => t.id === dragRefs.current.activeId
      );
      if (!terminal) return;

      const newX = (e.clientX - dragStart.x - gridPosition.x) / zoomLevel;
      const newY = (e.clientY - dragStart.y - gridPosition.y) / zoomLevel;

      updateTerminalPosition(terminal.id, {
        x: newX,
        y: newY,
      });
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragStart,
    gridPosition.x,
    gridPosition.y,
    zoomLevel,
    terminals,
    updateTerminalPosition,
  ]);

  return (
    <>
      {terminals.map((terminal) => (
        <TerminalInstance
          key={terminal.id}
          terminal={terminal}
          gridPosition={gridPosition}
          zoomLevel={zoomLevel}
          isDragging={isDragging}
          dragRefs={dragRefs}
          handleMouseDown={handleMouseDown}
          handleTerminalClick={bringToFront}
          updateTerminalSize={updateTerminalSize}
          toggleMinimizeTerminal={toggleMinimizeTerminal}
          closeTerminal={closeTerminal}
          editingTerminalId={editingTerminalId}
          tempName={tempName}
          handleNameClick={handleNameClick}
          handleNameChange={handleNameChange}
          handleNameBlur={handleNameBlur}
        />
      ))}
    </>
  );
};

export default TerminalWindow;