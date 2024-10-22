"use client";

import { supabase } from '../../../lib/supabaseClient';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null); // Add message state for feedback
  const [error, setError] = useState(null); // Add error state for better error handling

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (!error) {
      console.log('Reset password link sent');
      setMessage('Reset password link sent to your email.');
    } else {
      console.error('Error sending reset password', error.message);
      setError(error.message);
    }
  };

  return (
    <div className="forgot-password-container">
      <h1>Forgot Password</h1>
      {message && <p style={{ color: 'green' }}>{message}</p>} {/* Display success message */}
      {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error message */}
      <form onSubmit={handleForgotPassword}>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Email" 
          required 
        />
        <button type="submit">Reset Password</button>
      </form>
      <a href="/auth/login">Back to Login</a>
    </div>
  );
}
