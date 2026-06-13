'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { X, Mail, Lock, User, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validate = () => {
    if (!email.includes('@')) {
      setError('Invalid email address.');
      return false;
    }
    if (password.length < 6 && mode !== 'reset') {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (mode === 'signup' && !username.trim()) {
      setError('Username is required.');
      return false;
    }
    return true;
  };

  const getFriendlyError = (err: any) => {
    const msg = err.message || '';
    if (msg.includes('Email already registered')) return 'Email already registered.';
    if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
    if (msg.includes('user_already_exists')) return 'User already exists.';
    if (msg.includes('Invalid path')) return 'Redirect URL not allowed. Please check Supabase Auth settings.';
    if (msg.includes('Password should be')) return 'Password requirement not met.';
    return msg || 'Unable to complete request. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
        // window.location.reload(); <- Removed to prevent race conditions
      } else if (mode === 'signup') {
        // Omitting emailRedirectTo lets Supabase use the default Site URL
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });
        if (error) throw error;
        
        if (data?.session) {
           setSuccess('Profile created successfully. Welcome to AI Verse.');
           setTimeout(() => {
             onClose();
             // window.location.reload(); <- Removed
           }, 2000);
        } else {
           setSuccess('Security verification link sent to your email.');
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
           redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
        });
        if (error) throw error;
        setSuccess('Security reset link sent to your email.');
      }
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md overflow-hidden bg-zinc-950 border border-red-500/20 rounded-3xl shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)]"
      >
        {/* Cyber Flourishes */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-red-500/50 to-transparent" />
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative p-8 sm:p-10">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-all hover:rotate-90"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center mb-10 text-center">
            <div className="relative mb-6">
               <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse" />
               <div className="relative w-20 h-20 bg-linear-to-br from-zinc-900 to-black border border-red-500/40 rounded-2xl flex items-center justify-center shadow-inner">
                 <ShieldCheck className="text-red-500" size={40} />
               </div>
            </div>
            <h2 className="text-3xl font-black font-orbitron tracking-tighter text-white mb-2">
              {mode === 'login' ? 'CORE_ACCESS' : mode === 'signup' ? 'NEW_ACCOUNT' : 'SIGNAL_RECOVERY'}
            </h2>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold">
              {mode === 'login' ? 'Authentication Required' : mode === 'signup' ? 'Join Intelligence Network' : 'Identity Verification'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key="user-field"
                >
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                    Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="GhostProtocol"
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-700 focus:outline-none focus:border-red-500/40 focus:bg-zinc-900 transition-all text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                Security ID (Email)
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nexus.com"
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 focus:bg-zinc-900 transition-all text-sm"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-zinc-700 focus:outline-none focus:border-red-500/40 focus:bg-zinc-900 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-xs font-bold"
                >
                  <CheckCircle2 size={14} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl bg-red-600 py-4 font-black uppercase tracking-[0.2em] text-[11px] text-white transition-all hover:bg-red-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    {mode === 'login' ? 'Authenticate Session' : mode === 'signup' ? 'Create Profile' : 'Send Recovery Signal'}
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            {mode === 'login' ? (
              <>
                <button
                  onClick={() => setMode('signup')}
                  className="text-[10px] text-zinc-500 uppercase tracking-widest font-black hover:text-orange-500 transition-colors"
                >
                  No identity? <span className="text-orange-500 underline underline-offset-4">Register New Agent</span>
                </button>
                <button
                  onClick={() => setMode('reset')}
                  className="text-[10px] text-zinc-600 uppercase tracking-widest font-black hover:text-white transition-colors"
                >
                  Access Forgotten? <span className="italic underline">Override Protocol</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setMode('login')}
                className="text-[10px] text-zinc-500 uppercase tracking-widest font-black hover:text-red-500 transition-colors"
              >
                Existing Identity? <span className="text-red-500 underline underline-offset-4">Enter Core Access</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
