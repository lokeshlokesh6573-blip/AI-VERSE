'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import SettingsPanel from '@/components/settings/SettingsPanel';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white font-sans relative">
      <SettingsPanel isOpen={true} onClose={() => router.push('/')} />
    </main>
  );
}