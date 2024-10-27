"use client";

import React, { useContext, useRef } from 'react';
import { TerminalContext } from '../context/TerminalContext';

const GridBackground = () => {
  const { gridPosition, updateGridPosition, zoomLevel, setZoomLevel } = useContext(TerminalContext);
  const isPanning = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    const draggingTerminal = e.target.closest('.react-draggable-dragging');
    if (draggingTerminal) return;

    isPanning.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isPanning.current) return;

    const deltaX = e.clientX - lastMousePosition.current.x;
    const deltaY = e.clientY - lastMousePosition.current.y;

    updateGridPosition({
      x: gridPosition.x + deltaX,
      y: gridPosition.y + deltaY,
    });

    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning.current = false;
    document.body.style.cursor = 'grab';
  };

  const handleWheel = (e) => {

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoomLevel = Math.min(3, Math.max(0.5, zoomLevel * zoomFactor));

    // Get the mouse position relative to the grid
    const mouseX = e.clientX - gridPosition.x;
    const mouseY = e.clientY - gridPosition.y;

    // Adjust grid position to zoom around the mouse cursor
    const newGridX = mouseX - (mouseX / zoomLevel) * newZoomLevel;
    const newGridY = mouseY - (mouseY / zoomLevel) * newZoomLevel;

    updateGridPosition({ x: gridPosition.x + newGridX, y: gridPosition.y + newGridY });
    setZoomLevel(newZoomLevel);
  };

  return (
    <div
      className="fixed top-0 left-0 w-full h-full"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: `${20 * zoomLevel}px ${20 * zoomLevel}px`,
        backgroundPosition: `${gridPosition.x}px ${gridPosition.y}px`,
        cursor: 'grab',
        zIndex: 0,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    ></div>
  );
};

export default GridBackground;
