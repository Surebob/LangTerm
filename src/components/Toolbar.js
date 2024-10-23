"use client";

import React, { useContext, useRef, useState, useEffect } from 'react';
import { TerminalContext } from '../context/TerminalContext';
import { Settings } from 'lucide-react';
import { SquareTerminal } from 'lucide-react';


const Toolbar = () => {
  const { addTerminal, terminals, toggleMinimizeTerminal, closeTerminal } = useContext(TerminalContext);
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const minimizedTerminals = terminals.filter((terminal) => terminal.isMinimized);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => scrollContainer.removeEventListener('scroll', checkScroll);
    }
  }, [minimizedTerminals]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction * 200,
        behavior: 'smooth'
      });
    }
  };

  // Common button styles
  const buttonBaseStyles = "flex items-center justify-center bg-glassmorphism hover:bg-glassmorphism-hover text-white rounded cursor-pointer border border-white/20 backdrop-blur-md transition-colors duration-200";

  // Action button styles (+ and settings)
  const actionButtonStyles = `${buttonBaseStyles} w-9 h-9`;

  // Terminal control button styles (minimize and close)
  const terminalButtonStyles = `${buttonBaseStyles} w-6 h-6 text-sm`;

  return (
    <div className="taskbar fixed bottom-0 left-0 w-full flex items-center h-12">
      {/* Left Section */}
      <div className="flex items-center flex-shrink-0 pl-2">
        <button
          onClick={addTerminal}
          className={actionButtonStyles}
          aria-label="Add New Terminal"
        >
          <SquareTerminal />
        </button>
        <div className="h-6 w-px bg-white/20 mx-2"></div>
      </div>

      {/* Middle Section */}
      <div className="flex-1 flex items-center relative px-8">
        {/* Left Arrow */}
        <button
          onClick={() => scroll(-1)}
          className={`absolute left-0 z-10 text-white px-2 h-full transition-opacity duration-200 ${
            canScrollLeft 
              ? 'opacity-100 hover:bg-white/10' 
              : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll Left"
        >
          ◄
        </button>

        {/* Terminals Container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto flex gap-2 scroll-smooth px-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {minimizedTerminals.map((terminal) => (
            <div
              key={terminal.id}
              className="h-9 flex items-center bg-glassmorphism bg-opacity-70 px-3 rounded backdrop-blur-lg border border-white/20 transition-all duration-200 hover:bg-white/10 max-w-[170px]"
            >
              <span className="text-white whitespace-nowrap overflow-hidden text-ellipsis flex-1 mr-3">
                {terminal.name || "Terminal"}
              </span>
              <div className="flex-shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => toggleMinimizeTerminal(terminal.id)}
                  className={terminalButtonStyles}
                  aria-label="Restore Terminal"
                >
                  ❒
                </button>
                <button
                  onClick={() => closeTerminal(terminal.id)}
                  className={`${terminalButtonStyles} bg-red-400/30 hover:bg-red-500/50`}
                  aria-label="Close Terminal"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll(1)}
          className={`absolute right-0 z-10 text-white px-2 h-full transition-opacity duration-200 ${
            canScrollRight 
              ? 'opacity-100 hover:bg-white/10' 
              : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll Right"
        >
          ►
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center flex-shrink-0 pr-2">
        <div className="h-6 w-px bg-white/20 mx-2"></div>
        <button
          onClick={() => {/* Add settings handler */}}
          className={actionButtonStyles}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;