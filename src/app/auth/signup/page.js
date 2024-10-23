// src/app/auth/signup/page.js

"use client";

import { supabase } from '../../../lib/supabaseClient';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [error, setError] = useState(null); 

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null); 
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (!error) {
      router.push('/dashboard');  
    } else {
      setError(error.message); 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="glass-effect max-w-md w-full p-8 text-center">
        <h1 className="text-2xl font-bold mb-6 text-white">Sign Up</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSignup}>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email" 
            className="w-full p-3 mb-4 rounded"
            required 
          />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password" 
            className="w-full p-3 mb-4 rounded"
            required 
          />
          <button type="submit" className="w-full text-white bg-blue-500 hover:bg-blue-600 p-3 rounded">
            Sign Up
          </button>
        </form>
        <div className="form-link">
          <a href="/auth/login">Already have an account? Login here.</a>
        </div>
      </div>
    </div>
  );
}
