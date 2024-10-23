"use client";

import React, { useContext, useRef, useState, useEffect } from 'react';
import { TerminalContext } from '../context/TerminalContext';
import { Settings, SquareTerminal, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

const Toolbar = () => {
  const { 
    addTerminal, 
    terminals, 
    toggleMinimizeTerminal, 
    closeTerminal,
    centerOnTerminal,
  } = useContext(TerminalContext);
  
  const scrollContainerRef = useRef(null);
  const scrollIntervalRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check for scrollability and adjust arrows visibility
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const hasOverflow = scrollWidth > clientWidth;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(hasOverflow && scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScroll);
      checkScroll();
      
      const resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(scrollContainer);

      return () => {
        scrollContainer.removeEventListener('scroll', checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, [terminals]);

  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 170; // The width of one terminal item
      scrollContainerRef.current.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const startAutoScroll = (direction) => {
    if (scrollIntervalRef.current) return;
    scroll(direction === 'left' ? -1 : 1);
    
    scrollIntervalRef.current = setInterval(() => {
      if (direction === 'left' && !canScrollLeft) {
        stopAutoScroll();
        return;
      }
      if (direction === 'right' && !canScrollRight) {
        stopAutoScroll();
        return;
      }
      scroll(direction === 'left' ? -1 : 1);
    }, 200);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  // Function to determine the maskImage based on canScrollLeft and canScrollRight
  const getMaskImage = () => {
    if (canScrollLeft && canScrollRight) {
      // Fade on both sides
      return 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)';
    } else if (canScrollLeft) {
      // Fade on the left only
      return 'linear-gradient(to right, transparent, black 5%, black 100%)';
    } else if (canScrollRight) {
      // Fade on the right only
      return 'linear-gradient(to right, black 0%, black 95%, transparent)';
    } else {
      // No fade needed
      return 'none';
    }
  };

  const buttonBaseStyles = "flex items-center justify-center bg-glassmorphism hover:bg-glassmorphism-hover text-white rounded cursor-pointer border border-white/20 backdrop-blur-md transition-colors duration-200";
  const actionButtonStyles = `${buttonBaseStyles} w-9 h-9 group`;
  const terminalButtonStyles = `${buttonBaseStyles} w-6 h-6 text-sm`;
  
  return (
    <div className="taskbar fixed bottom-0 left-0 w-full flex items-center h-12">
      {/* Left Section with Add Terminal */}
      <div className="flex items-center pl-2 z-30">
        <button
          onClick={addTerminal}
          className={actionButtonStyles}
          aria-label="Add New Terminal"
        >
          <SquareTerminal size={24} />
        </button>
        <div className="h-6 w-px bg-white/20 mx-2"></div>
      </div>

      {/* Left Arrow (Outside Flexbox) */}
      {canScrollLeft && (
        <div className="z-20">
          <button
            onClick={() => scroll(-1)}
            onMouseDown={() => startAutoScroll('left')}
            onMouseUp={stopAutoScroll}
            onMouseLeave={stopAutoScroll}
            className={`${buttonBaseStyles} w-9 h-9 group hover:bg-white/10`}
            aria-label="Scroll Left"
          >
            <ChevronLeft 
              size={20}
              className="text-white/70 group-hover:text-white transition-colors duration-200"
            />
          </button>
        </div>
      )}

      {/* Terminals Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex overflow-x-hidden items-center gap-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollBehavior: 'smooth',
          maskImage: getMaskImage(),
        }}
      >
        {terminals.map((terminal) => (
          <div
            key={terminal.id}
            onClick={() => !terminal.isMinimized && centerOnTerminal(terminal.id)}
            className={`h-9 flex items-center bg-glassmorphism bg-opacity-70 px-3 rounded backdrop-blur-lg border border-white/20 transition-all duration-200 hover:bg-white/10 max-w-[170px] flex-shrink-0 ${
              terminal.isMinimized ? 'opacity-50 cursor-default' : 'opacity-100 cursor-pointer'
            }`}
          >
            <span className="text-white whitespace-nowrap overflow-hidden text-ellipsis flex-1 mr-3">
              {terminal.name || "Terminal"}
            </span>
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimizeTerminal(terminal.id);
                }}
                className={terminalButtonStyles}
                aria-label={terminal.isMinimized ? "Show Terminal" : "Hide Terminal"}
              >
                {terminal.isMinimized ? (
                  <Eye size={14} />
                ) : (
                  <EyeOff size={14} />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(terminal.id);
                }}
                className={`${terminalButtonStyles} bg-red-400/30 hover:bg-red-500/50`}
                aria-label="Close Terminal"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Right Arrow (Outside Flexbox) */}
      {canScrollRight && (
        <div className="z-20">
          <button
            onClick={() => scroll(1)}
            onMouseDown={() => startAutoScroll('right')}
            onMouseUp={stopAutoScroll}
            onMouseLeave={stopAutoScroll}
            className={`${buttonBaseStyles} w-9 h-9 group hover:bg-white/10`}
            aria-label="Scroll Right"
          >
            <ChevronRight 
              size={20}
              className="text-white/70 group-hover:text-white transition-colors duration-200"
            />
          </button>
        </div>
      )}

      {/* Right Section with Settings */}
      <div className="flex items-center pr-2 z-30">
        <div className="h-6 w-px bg-white/20 mx-2"></div>
        <button
          onClick={() => {/* Add settings handler */}}
          className={actionButtonStyles}
          aria-label="Settings"
        >
          <Settings size={24} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
