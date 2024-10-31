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
  ChevronUp,
  Eye,
  EyeOff,
  ChevronRight as ArrowRight,
  Code2,
  LogOut,
  User,
  Settings as SettingsIcon,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"; // Ensure correct import path
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import Image from 'next/image';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"; // Ensure correct import path

const Toolbar = () => {
  const router = useRouter();
  const {
    terminals,
    toggleMinimizeTerminal,
    closeTerminal,
    centerOnTerminal,
    connectSSH,
    addCommandToTerminal,
    addTerminal,
    setPasswordInput,
    setIsPasswordMode,
    user,
  } = useContext(TerminalContext);

  const scrollContainerRef = useRef(null);
  const scrollIntervalRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Dropdown menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Update the form state initialization to include email
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    avatar_url: '',
    email: '',  // Add email field
    user_metadata: {}
  });

  // Update useEffect to properly initialize email
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.user_metadata?.username || '',
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        email: user.email || '',  // Initialize email from user data
        user_metadata: user.user_metadata || {}
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Add these state variables at the top of the component
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Add state for managing alerts
  const [alerts, setAlerts] = useState([]);

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

        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="drawer">
            <div className="flex flex-row justify-between">
              <div className="flex flex-col">
                <DrawerHeader className="flex justify-between px-8">
                  <div>
                    <DrawerTitle className="text-white">Add SSH Connection</DrawerTitle>
                    <DrawerDescription className="text-gray-400">
                      Add a new SSH connection to your list.
                    </DrawerDescription>
                  </div>
                </DrawerHeader>
                
                <div className="terminal-window flex flex-row items-start gap-4 py-4 p-8 ml-8">
                  <div className="flex flex-col items-start gap-4 py-4">
                    <div className="flex flex-col items-start gap-2">
                      <label className="text-right text-white" htmlFor="username">
                        Username
                      </label>
                      <input
                        id="username"
                        name="username"
                        className="col-span-3 bg-transparent border border-white/20 rounded p-2 text-white"
                        placeholder="Enter username"
                        required
                      />
                    </div>

                    <div className="flex flex-col items-start gap-2">
                      <label className="text-right text-white" htmlFor="hostname">
                        Hostname
                      </label>
                      <input
                        id="hostname"
                        name="hostname"
                        className="col-span-3 bg-transparent border border-white/20 rounded p-2 text-white"
                        placeholder="Enter hostname"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-4 py-4 p-4">
                    <div className="flex flex-col items-start gap-2">
                      <label className="text-right text-white" htmlFor="port">
                        Port (optional)
                      </label>
                      <input
                        id="port"
                        name="port"
                        type="number"
                        className="col-span-3 bg-transparent border border-white/20 rounded p-2 text-white"
                        placeholder="22"
                      />
                    </div>

                    <div className="flex flex-col items-start gap-2">
                      <label className="text-right text-white" htmlFor="password">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        className="col-span-3 bg-transparent border border-white/20 rounded p-2 text-white"
                        placeholder="Enter password"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <DrawerHeader className="flex justify-between px-8" style={{ marginLeft: 'auto' }}>
                  <div className="text-white">
                    <DrawerTitle className="text-white">Saved Connections</DrawerTitle>
                  </div>
                </DrawerHeader>
                
                <div className="bg-glassmorphism flex flex-row items-start gap-4 py-4 p-8">

                </div>
              </div>
            </div>
            <DrawerFooter className="flex justify-end mt-6">
            </DrawerFooter>
          </DrawerContent>
        </Drawer>


        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="dropdown-menu absolute bottom-full w-56 mb-5"
          >
            <ul className="py-2 relative bg-glassmorphism bg-opacity-70 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg">
              {/* SSH Connections */}
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
                {/* SSH Connections Submenu */}
                {openSubmenu === 'submenu1' && (
                  <ul className="dropdown-menu absolute bottom-0 left-full w-56 transform translate-x-2" 
                      style={{ transform: 'translate(4px, 9px)' }}>
                    <li
                      onClick={async () => {
                        const terminalId = addTerminal();
                        // Don't show the command in the terminal yet
                        addCommandToTerminal(
                          terminalId,
                          "",  // Empty command
                          "Enter password:",
                          false
                        );
                        // Store the SSH command and set password mode
                        setPasswordInput(prev => ({
                          ...prev,
                          [terminalId]: "ssh root@loadguard.ai"
                        }));
                        setIsPasswordMode(prev => ({
                          ...prev,
                          [terminalId]: true
                        }));
                        setIsMenuOpen(false);
                        setOpenSubmenu(null);
                      }}
                      className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                    >
                      <Code2 size={16} className="mr-2" />
                      root@loadguard.ai
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
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="actionButtonStyles ml-2 
            flex items-center justify-center
            bg-glassmorphism text-white rounded cursor-pointer
            border border-white/20 backdrop-blur-md transition-all duration-200
            hover:bg-white/10 hover:scale-105
            w-9 h-9" // Style and position as needed
          aria-label="Open Drawer"
        >
          <ChevronUp size={24} /> {/* ^ Icon or any other icon */}
        </button>
        {/* Settings Dropdown Menu */}
        {isSettingsOpen && (
          <div
            ref={settingsMenuRef}
            className="dropdown-menu absolute bottom-full right-2 w-56 mb-5"
          >
            <ul className="py-2 relative bg-glassmorphism bg-opacity-70 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg">
              {/* Profile Sheet */}
              <li
                className="flex items-center px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors duration-200"
                onClick={() => {
                  setIsProfileOpen(true);
                  setIsSettingsOpen(false);
                }}
              >
                <User size={16} className="mr-2" />
                Profile
              </li>

              {/* Other Menu Items */}
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

      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent className="setting-right">
          <SheetHeader>
            <SheetTitle className="text-white">Profile Settings</SheetTitle>
            <SheetDescription className="text-gray-400">
              Make changes to your profile here. Click save when you are done.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            {/* Avatar Display */}
            {formData.avatar_url && (
              <div className="flex justify-center mb-4">
                <Image 
                  src={formData.avatar_url} 
                  alt="Profile" 
                  width={32} 
                  height={32} 
                  className="rounded-full" 
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-white" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                className="col-span-3 bg-transparent border border-white/20 rounded p-2 text-white"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter username"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-white" htmlFor="full_name">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                className="col-span-3 bg-transparent border border-white/20 rounded p-2 text-white"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Enter full name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-white" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="col-span-3 bg-transparent border border-white/20 rounded p-2 text-white"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email"
              />
            </div>
          </div>
          <SheetFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="hover:bg-green-600 text-white py-2 relative bg-glassmorphism bg-opacity-70 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg">
                  Save changes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save Profile Changes</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to save these changes to your profile?
                    {user && formData.email !== user.email && 
                      " This includes changing your email address, which will require confirmation."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        // First update email if it's changed
                        if (user && formData.email !== user.email) {
                          const { error: emailError } = await supabase.auth.updateUser({
                            email: formData.email
                          });
                          if (emailError) throw emailError;

                          setAlerts(prev => [...prev, {
                            id: Date.now(),
                            type: 'success',
                            title: 'Email Update',
                            message: 'Check your new email for a confirmation link'
                          }]);
                        }

                        // Update other metadata
                        const { error: metadataError } = await supabase.auth.updateUser({
                          data: {
                            username: formData.username,
                            full_name: formData.full_name,
                          }
                        });
                        if (metadataError) throw metadataError;
                        
                        setAlerts(prev => [...prev, {
                          id: Date.now(),
                          type: 'success',
                          title: 'Success',
                          message: 'Profile updated successfully'
                        }]);
                        setIsProfileOpen(false);
                      } catch (error) {
                        setAlerts(prev => [...prev, {
                          id: Date.now(),
                          type: 'destructive',
                          title: 'Error',
                          message: error.message
                        }]);
                      }
                    }}
                  >
                    Save Changes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add this at the bottom of your JSX, replacing the existing alerts */}
      <div className="fixed bottom-16 right-4 z-50 w-80 flex flex-col gap-2">
        {alerts.map(alert => (
          <Alert 
            key={alert.id}
            variant={alert.type}
            onClose={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertTitle className={alert.type === 'success' ? 'text-green-500' : 'text-red-500'}>
              {alert.title}
            </AlertTitle>
            <AlertDescription className="text-gray-300">
              {alert.message}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
};

export default Toolbar;
