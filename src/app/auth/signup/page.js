"use client";

import { supabase } from '../../../lib/supabaseClient';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [error, setError] = useState(null); // Add error state for better error handling

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null); // Reset error state
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (!error) {
      router.push('/dashboard');  // Redirect on success
    } else {
      console.error('Signup failed', error.message);
      setError(error.message); // Set error state to display error message
    }
  };

  return (
    <div className="signup-container">
      <h1>Signup</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error message */}
      <form onSubmit={handleSignup}>
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
        <button type="submit">Signup</button>
      </form>
      <a href="/auth/login">Already have an account? Login here.</a>
    </div>
  );
}
