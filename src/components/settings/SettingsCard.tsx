'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn'; // Assuming I need to create this or it exists

interface SettingsCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
}

export default function SettingsCard({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  className,
  danger 
}: SettingsCardProps) {
  return (
    <div className={cn(
      "relative group p-5 bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden transition-all hover:bg-zinc-900/60 hover:border-white/10",
      danger && "hover:border-red-500/30",
      className
    )}>
      {/* Background HUD decorative lines */}
      <div className="absolute top-0 right-0 p-2 opacity-5">
        <Icon size={40} />
      </div>
      
      <div className="flex items-start gap-4 h-full">
        <div className={cn(
          "p-3 rounded-xl bg-zinc-800/50 border border-white/5 text-zinc-400 group-hover:text-white transition-colors",
          danger && "bg-red-500/10 border-red-500/20 text-red-500 group-hover:text-red-400"
        )}>
          <Icon size={20} />
        </div>
        
        <div className="flex-1 flex flex-col h-full">
          <div className="mb-4">
            <h3 className="font-bold text-white tracking-tight">{title}</h3>
            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{description}</p>
          </div>
          
          <div className="mt-auto pt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
