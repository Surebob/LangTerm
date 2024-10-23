// src/app/auth/forgot-password/page.js

"use client";

import { supabase } from '../../../lib/supabaseClient';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (!error) {
      setMessage('Reset password link sent to your email.');
    } else {
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="glass-effect max-w-md w-full p-8 text-center">
        <h1 className="text-2xl font-bold mb-6 text-white">Forgot Password</h1>
        {message && <p className="text-green-500 mb-4">{message}</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleForgotPassword}>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email" 
            className="w-full p-3 mb-4 rounded"
            required 
          />
          <button type="submit" className="w-full text-white bg-blue-500 hover:bg-blue-600 p-3 rounded">
            Reset Password
          </button>
        </form>
        <div className="form-link">
          <a href="/auth/login">Back to Login</a>
        </div>
      </div>
    </div>
  );
}
