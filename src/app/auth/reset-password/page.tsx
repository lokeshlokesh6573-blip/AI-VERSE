'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Lock, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update protocol.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
      {/* Background HUD */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2620&auto=format&fit=crop')] bg-cover bg-center grayscale" />
        <div className="absolute inset-0 bg-linear-to-b from-black via-transparent to-black" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-zinc-950 border border-orange-500/20 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_-12px_rgba(249,115,22,0.2)]"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-orange-500/50 to-transparent" />
        
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-orange-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <Lock className="text-orange-500" size={32} />
          </div>
          <h1 className="text-2xl font-black font-orbitron tracking-tight text-white mb-2">UPDATE_PROTOCOL</h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold">New Security Key Required</p>
        </div>

        {success ? (
          <div className="text-center space-y-6 py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-500">
                <CheckCircle2 size={40} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">ACCESS RESTORED</h2>
              <p className="text-zinc-500 text-sm">Security signature updated successfully. Redirecting to Core...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 focus:bg-zinc-900 transition-all text-sm"
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

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                Confirm Password
              </label>
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/40 focus:bg-zinc-900 transition-all text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl bg-orange-600 py-4 font-black uppercase tracking-[0.2em] text-[11px] text-white transition-all hover:bg-orange-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-[0_0_20px_-5px_rgba(249,115,22,0.4)]"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    Update Access Key
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </button>
          </form>
        )}
      </motion.div>
    </main>
  );
}
