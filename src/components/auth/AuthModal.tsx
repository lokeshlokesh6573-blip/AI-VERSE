'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { X, Mail, Lock, User, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });
        if (error) throw error;
        setSuccess('Account created! Please check your email for verification.');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
           redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setSuccess('Password reset link sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md overflow-hidden bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl"
      >
        {/* Glow Effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl" />

        <div className="relative p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-red-600/20 rounded-xl border border-red-500/30 flex items-center justify-center mb-4">
              <ShieldCheck className="text-red-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold font-orbitron tracking-tight text-white">
              {mode === 'login' ? 'System Access' : mode === 'signup' ? 'New Protocol' : 'Reset Signal'}
            </h2>
            <p className="text-zinc-400 text-sm mt-1 uppercase tracking-widest font-medium">
              {mode === 'login' ? 'Authentication Required' : mode === 'signup' ? 'Join AI Verse Network' : 'Recover Access'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  key="user-field"
                >
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="PeterParker"
                      className="w-full bg-zinc-800/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                Security ID (Email)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="avenger@stark-industries.com"
                  className="w-full bg-zinc-800/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                  Access Key
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-800/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-xs font-medium">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {mode === 'login' ? 'Initialize Link' : mode === 'signup' ? 'Create Profile' : 'Send Signal'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-2">
            {mode === 'login' ? (
              <>
                <button
                  onClick={() => setMode('signup')}
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  New recruit? <span className="text-blue-400 font-bold">Register Profile</span>
                </button>
                <br />
                <button
                  onClick={() => setMode('reset')}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  Identity forgotten? <span className="text-zinc-300 italic underline">Reset Signal</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setMode('login')}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Existing Agent? <span className="text-red-500 font-bold">Authenticate Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer HUD line */}
        <div className="h-1 bg-linear-to-r from-transparent via-red-500/50 to-transparent opacity-50" />
      </motion.div>
    </div>
  );
}
