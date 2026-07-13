import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await authService.getConfig();
        if (config.google_client_id) {
          setGoogleClientId(config.google_client_id);
          
          // Load Google Identity Services library
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          document.body.appendChild(script);
          
          script.onload = () => {
            initializeGoogleSignIn(config.google_client_id!);
          };
        }
      } catch (err) {
        console.error("Failed to load auth config:", err);
      }
    };
    
    fetchConfig();
  }, []);

  const initializeGoogleSignIn = (clientId: string) => {
    const google = (window as any).google;
    if (google && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
      });
      google.accounts.id.renderButton(
        document.getElementById('google-signin-button-container'),
        { 
          theme: 'filled_black', 
          size: 'large', 
          width: 320, 
          shape: 'rectangular', 
          text: 'continue_with', 
          logo_alignment: 'left' 
        }
      );
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-6 text-zinc-100 font-sans">
      <div className="absolute top-10 left-10 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(37,99,235,0.4)]">
          Ω
        </div>
        <span className="font-display font-bold tracking-wider text-sm text-white">ORACLE</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-2xl glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 border border-zinc-800/80"
      >
        <div className="text-center space-y-2">
          <h2 className="font-display text-3xl font-bold text-white tracking-tight">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-zinc-400">
            {isSignUp ? 'Start simulating decision pathways' : 'Access your decision intelligence dashboard'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2.5 text-xs text-danger">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-zinc-500" size={16} />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-zinc-500" size={16} />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-400">Password</label>
              {!isSignUp && (
                <span className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer">Forgot password?</span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-zinc-500" size={16} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-blue-600 text-white font-medium shadow-[0_4px_15px_rgba(37,99,235,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="relative flex py-2 items-center text-xs text-zinc-600">
          <div className="flex-grow border-t border-zinc-900"></div>
          <span className="flex-shrink mx-4">OR</span>
          <div className="flex-grow border-t border-zinc-900"></div>
        </div>

        {/* Google Authentication Container */}
        {googleClientId ? (
          <div className="flex justify-center w-full py-1">
            <div id="google-signin-button-container" className="w-full flex justify-center"></div>
          </div>
        ) : (
          <div className="p-3 text-[11px] text-zinc-500 border border-zinc-900 bg-zinc-950/20 rounded-xl flex items-start gap-2 leading-relaxed">
            <AlertCircle size={14} className="text-zinc-400 shrink-0 mt-0.5" />
            <span>
              Google Sign-In is not configured. Set <code className="text-zinc-300 font-mono text-[10px]">GOOGLE_CLIENT_ID</code> in your backend environment variables to enable it.
            </span>
          </div>
        )}

        <div className="text-center text-xs text-zinc-500 pt-2">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline cursor-pointer font-medium"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
