// src/app/auth/login/page.js

"use client";

import { supabase } from '../../../lib/supabaseClient';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [error, setError] = useState(null); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); 
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      router.push('/dashboard');  // Redirect to /dashboard
    } else {
      setError(error.message); 
    }
  };

  const handleOAuthLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="glass-effect max-w-md w-full p-8 text-center">
        <h1 className="text-2xl font-bold mb-6 text-white">Login</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleLogin}>
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
            Login
          </button>
        </form>

        <hr className="my-4 text-gray-600" />

        {/* OAuth Login */}
        <div className="mt-4">
          <button onClick={() => handleOAuthLogin('google')} className="w-full text-white bg-red-500 hover:bg-red-600 p-3 mb-2 rounded">
            Sign in with Google
          </button>
          <button onClick={() => handleOAuthLogin('github')} className="w-full text-white bg-gray-800 hover:bg-gray-900 p-3 mb-2 rounded">
            Sign in with GitHub
          </button>
        </div>

        {/* Links */}
        <div className="form-link">
          <a href="/auth/signup">Don’t have an account? Sign up here.</a>
        </div>
        <div className="form-link">
          <a href="/auth/forgot-password">Forgot Password?</a>
        </div>
      </div>
    </div>
  );
}
