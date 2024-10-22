"use client";

import { supabase } from '../../../lib/supabaseClient';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [error, setError] = useState(null); // Add error state for better error handling

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); // Reset error state
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      router.push('/dashboard');  // Redirect to a protected route
    } else {
      console.error('Login failed', error.message);
      setError(error.message); // Set error state to display error message
    }
  };

  return (
    <div className="login-container">
      <h1>Login</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error message */}
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Email" 
          required 
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Password" 
          required 
        />
        <button type="submit">Login</button>
      </form>
      <a href="/auth/signup">Don’t have an account? Sign up here.</a>
      <a href="/auth/forgot-password">Forgot Password?</a>
    </div>
  );
}
