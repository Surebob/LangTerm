// src/app/dashboard/page.js

"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TerminalProvider } from '../../context/TerminalContext';
import GridBackground from '../../components/GridBackground';
import Toolbar from '../../components/Toolbar';
import TerminalWindow from '../../components/TerminalWindow';
import { sshService } from '../../services/SSHService';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    // Initialize WebSocket connection when dashboard loads
    sshService.initialize();

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');  // Redirect to login if no session
      }
    };

    checkSession();
  }, [router]);

  return (
    <TerminalProvider>
      <GridBackground />
      <Toolbar />
      <TerminalWindow />
    </TerminalProvider>
  );
}
