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

  const handleSimulateGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      // Generate a unique mock user ID per browser/device to avoid shared account histories
      let mockUserId = localStorage.getItem('oracle_mock_user_id');
      if (!mockUserId) {
        mockUserId = 'analyst_' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('oracle_mock_user_id', mockUserId);
      }
      
      // Sends a unique mock OAuth token to backend (starts with mock_)
      await googleLogin(`mock_${mockUserId}`);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google authentication simulation failed.');
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
          <button
            onClick={handleSimulateGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all disabled:opacity-50 font-medium cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.83 21.56,11.41 21.35,11.1z" fill="#4285F4" />
                <path d="M12,20.84c2.47,0 4.54,-0.82 6.06,-2.23l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.3,0.98 -2.37,0 -4.38,-1.6 -5.1,-3.75H2.93v2.66C4.46,19.18 7.97,20.84 12,20.84z" fill="#34A853" />
                <path d="M6.9,13.26c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7c0,-0.59 0.1,-1.16 0.28,-1.7V7.2H2.93C2.3,8.47 1.94,9.91 1.94,11.56c0,1.65 0.36,3.09 0.99,4.36L6.9,13.26z" fill="#FBBC05" />
                <path d="M12,5.56c1.34,0 2.55,0.46 3.5,1.36l2.62,-2.62C16.53,2.83 14.47,2.28 12,2.28 7.97,2.28 4.46,3.94 2.93,7.2L6.9,9.86C7.62,7.71 9.63,5.56 12,5.56z" fill="#EA4335" />
              </g>
            </svg>
            <span>Continue with Google (Demo Sandbox)</span>
          </button>
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
