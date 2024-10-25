"use client";

import React, { useContext, useRef, useState, useEffect } from 'react';
import { TerminalContext } from '../context/TerminalContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import {
  Settings,
  SquareTerminal,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ChevronRight as ArrowRight,
  Code2,
  LogOut,
  User,
  Settings as SettingsIcon,
} from 'lucide-react';

const Toolbar = () => {
  const router = useRouter();
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

  // Dropdown menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);

  // Refs for menus and buttons
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const settingsButtonRef = useRef(null);

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle terminal menu
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
        setOpenSubmenu(null);
      }

      // Handle settings menu
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target) &&
        !settingsButtonRef.current.contains(event.target)
      ) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        behavior: 'smooth',
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

  // Updated buttonBaseStyles with hover effects
  const buttonBaseStyles = `
    flex items-center justify-center
    bg-glassmorphism text-white rounded cursor-pointer
    border border-white/20 backdrop-blur-md transition-all duration-200
    hover:bg-white/10 hover:scale-105
  `;
  const actionButtonStyles = `${buttonBaseStyles} w-9 h-9`;
  const terminalButtonStyles = `${buttonBaseStyles} w-6 h-6 text-sm`;

  return (
    <div className="taskbar fixed bottom-0 left-0 w-full flex items-center h-12">
      {/* Left Section with Add Terminal */}
      <div className="flex items-center pl-2 z-30 relative">
        <button
          ref={buttonRef}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={actionButtonStyles}
          aria-label="Add Terminal Menu"
        >
          <SquareTerminal size={24} />
        </button>
        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="dropdown-menu absolute bottom-full w-56 mb-5"
          >
            <ul className="py-2 relative bg-glassmorphism bg-opacity-70 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg">
              {/* Add Terminal Item */}
              <li
                onClick={() => {
                  addTerminal();
                  setIsMenuOpen(false);
                }}
                className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
              >
                <Code2 size={16} className="mr-2" />
                Add Terminal
              </li>
              {/* Separator */}
              <hr className="my-1 border-white/20" />
              {/* Submenu Item */}
              <li className="relative">
                <div
                  onClick={() =>
                    setOpenSubmenu((prev) => (prev === 'submenu1' ? null : 'submenu1'))
                  }
                  className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                >
                  <Code2 size={16} className="mr-2" />
                  SSH Connections
                  <ArrowRight size={16} className="ml-auto" />
                </div>
                {/* Submenu */}
                {openSubmenu === 'submenu1' && (
                  <ul className="dropdown-menu absolute bottom-0 left-full w-56 transform translate-x-2" style={{ transform: 'translate(4px, 9px)' }}>
                  <li
                      onClick={() => {
                        /* Placeholder action */
                        setIsMenuOpen(false);
                        setOpenSubmenu(null);
                      }}
                      className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                    >
                      <Code2 size={16} className="mr-2" />
                      104.53.45.133:20
                    </li>
                    {/* Sub-submenu Item */}
                    <li className="relative">
                      <div
                        onClick={() =>
                          setOpenSubmenu((prev) =>
                            prev === 'submenu1-1' ? null : 'submenu1-1'
                          )
                        }
                        className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                      >
                        <Code2 size={16} className="mr-2" />
                        192.168.0.32:20
                      </div>
                    </li>
                    {/* Sub-submenu Item */}
                    <li className="relative">
                      <div
                        onClick={() =>
                          setOpenSubmenu((prev) =>
                            prev === 'submenu1-1' ? null : 'submenu1-1'
                          )
                        }
                        className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                      >
                        <Code2 size={16} className="mr-2" />
                        138.110.18.144:20
                      </div>
                    </li>
                    {/* Sub-submenu Item */}
                    <li className="relative">
                      <div
                        onClick={() =>
                          setOpenSubmenu((prev) =>
                            prev === 'submenu1-1' ? null : 'submenu1-1'
                          )
                        }
                        className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                      >
                        <Code2 size={16} className="mr-2" />
                        166.87.70.131:20
                      </div>
                    </li>
                    {/* Sub-submenu Item */}
                    <li className="relative">
                      <div
                        onClick={() =>
                          setOpenSubmenu((prev) =>
                            prev === 'submenu1-1' ? null : 'submenu1-1'
                          )
                        }
                        className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                      >
                        <Code2 size={16} className="mr-2" />
                        221.212.15.83:20
                      </div>
                    </li>
                    {/* Sub-submenu Item */}
                    <li className="relative">
                      <div
                        onClick={() =>
                          setOpenSubmenu((prev) =>
                            prev === 'submenu1-1' ? null : 'submenu1-1'
                          )
                        }
                        className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                      >
                        <Code2 size={16} className="mr-2" />
                        163.171.16.177:20
                      </div>
                    </li>
                    {/* Sub-submenu Item */}
                    <li className="relative">
                      <div
                        onClick={() =>
                          setOpenSubmenu((prev) =>
                            prev === 'submenu1-1' ? null : 'submenu1-1'
                          )
                        }
                        className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                      >
                        <Code2 size={16} className="mr-2" />
                        247.25.44.24:20
                      </div>
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          </div>
        )}
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
            className={`${buttonBaseStyles} w-9 h-9 hover:bg-white/10`}
            aria-label="Scroll Left"
          >
            <ChevronLeft
              size={20}
              className="text-white/70 transition-colors duration-200"
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
              terminal.isMinimized
                ? 'opacity-50 cursor-default'
                : 'opacity-100 cursor-pointer'
            }`}
          >
            <span className="text-white whitespace-nowrap overflow-hidden text-ellipsis flex-1 mr-3">
              {terminal.name || 'Terminal'}
            </span>
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimizeTerminal(terminal.id);
                }}
                className={terminalButtonStyles}
                aria-label={
                  terminal.isMinimized ? 'Show Terminal' : 'Hide Terminal'
                }
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
            className={`${buttonBaseStyles} w-9 h-9 hover:bg-white/10`}
            aria-label="Scroll Right"
          >
            <ChevronRight
              size={20}
              className="text-white/70 transition-colors duration-200"
            />
          </button>
        </div>
      )}

      {/* Right Section with Settings */}
      <div className="flex items-center pr-2 z-30 relative">
        <div className="h-6 w-px bg-white/20 mx-2"></div>
        <button
          ref={settingsButtonRef}
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={actionButtonStyles}
          aria-label="Settings"
        >
          <Settings size={24} />
        </button>

        {/* Settings Dropdown Menu */}
        {isSettingsOpen && (
          <div
            ref={settingsMenuRef}
            className="dropdown-menu absolute bottom-full right-2 w-56 mb-5"
          >
            <ul className="py-2 relative bg-glassmorphism bg-opacity-70 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg">
              <li className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200">
                <User size={16} className="mr-2" />
                Profile
              </li>
              <li className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200">
                <SettingsIcon size={16} className="mr-2" />
                Preferences
              </li>
              <hr className="my-1 border-white/20" />
              <li
                onClick={handleLogout}
                className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200 text-red-400"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
