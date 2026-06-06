'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function SettingsSection({ title, description, icon, children }: SettingsSectionProps) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center gap-3 mb-4">
        {icon && <div className="p-2 bg-red-600/10 rounded-lg text-red-500 border border-red-500/20">{icon}</div>}
        <div>
          <h2 className="text-xl font-bold text-white font-orbitron tracking-tight">{title}</h2>
          {description && <p className="text-zinc-400 text-sm mt-0.5 uppercase tracking-widest text-[10px] font-bold">{description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </motion.section>
  );
}
