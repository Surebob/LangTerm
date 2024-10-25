// src/app/auth/login/page.js

"use client";

import { supabase } from '../../../lib/supabaseClient';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleToggle = () => {
    setError(null);
    setEmail('');
    setPassword('');
    setUsername('');
    setIsLogin(!isLogin);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      router.push('/dashboard');
    } else {
      setError(error.message);
    }
    setEmail('');
    setPassword('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    if (!error) {
      setShowConfirmation(true); // Show confirmation message
    } else {
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-grid">
          <div className="container form-window">
            {showConfirmation ? (
              <div className="text-center" style={{padding: '1.5em 3em'}}>
                <h1 className="text-2xl font-bold mb-6 text-white">Check Your Inbox</h1>
                <p className="text-white">
                  We’ve sent a confirmation email. Please check your inbox and verify
                  your account to log in.
                </p>
              </div>
            ) : (
              <div className={`slider ${isLogin ? '' : 'shift'}`}>
                {isLogin ? (
                  <form className="form" onSubmit={handleLogin}>
                    <span className="title">Login</span>
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <div className="form_control">
                      <input
                        type="email"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <label className={`label ${email ? 'has-content' : ''}`}>Email</label>
                    </div>
                    <div className="form_control">
                      <input
                        type="password"
                        className="input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <label className={`label ${password ? 'has-content' : ''}`}>Password</label>
                    </div>

                    <div className="w-full">
                      <button type="submit" className="mb-3 hover:bg-white/10 cursor-pointer transition-colors duration-200">
                        Login
                      </button>

                      {/* OAuth Buttons */}
                      <div className="flex justify-between">
                        <button
                          onClick={() => handleOAuthLogin('google')}
                          className="w-[48%] flex items-center justify-center gap-2 hover:bg-white/10 cursor-pointer transition-colors duration-200 p-3 rounded"
                        >
                          <FcGoogle size={20} />
                        </button>
                        <button
                          onClick={() => handleOAuthLogin('github')}
                          className="w-[48%] flex items-center justify-center gap-2 hover:bg-white/10 cursor-pointer transition-colors duration-200 p-3 rounded"
                        >
                          <FaGithub size={20} />
                        </button>
                      </div>
                    </div>

                    <span className="bottom_text">
                      Don’t have an account?{' '}
                      <span className="switch" onClick={handleToggle}>
                        Sign Up
                      </span>
                    </span>
                  </form>
                ) : (
                  <form className="form" onSubmit={handleSignup}>
                    <span className="title">Sign Up</span>
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <div className="form_control">
                      <input
                        type="text"
                        className="input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                      <label className={`label ${username ? 'has-content' : ''}`}>Username</label>
                    </div>
                    <div className="form_control">
                      <input
                        type="email"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <label className={`label ${email ? 'has-content' : ''}`}>Email</label>
                    </div>
                    <div className="form_control">
                      <input
                        type="password"
                        className="input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <label className={`label ${password ? 'has-content' : ''}`}>Password</label>
                    </div>
                    <button type="submit" className="hover:bg-white/10 cursor-pointer transition-colors duration-200 p-3 rounded">
                      Sign Up
                    </button>
                    <span className="bottom_text">
                      Already have an account?{' '}
                      <span className="switch" onClick={handleToggle}>
                        Sign In
                      </span>
                    </span>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

  );
}
