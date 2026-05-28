'use client';

import React from 'react';
import { Sandpack } from "@codesandbox/sandpack-react";

interface LiveCodeBlockProps {
  code: string;
}

export default function LiveCodeBlock({ code }: LiveCodeBlockProps) {
  return (
    <div className="w-full my-4 rounded-xl overflow-hidden shadow-2xl border border-white/10 group-hover:border-red-500/50 transition-colors">
      <div className="bg-black/50 backdrop-blur-md p-2 flex justify-between items-center border-b border-white/5">
        <span className="text-[10px] text-red-400 font-black tracking-widest uppercase">Live Workspace Active</span>
        <span className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500/50" />
        </span>
      </div>
      <Sandpack
        template="react"
        theme="dark"
        files={{
          "/App.js": code,
        }}
        options={{
          showNavigator: false,
          showTabs: false,
          editorHeight: 350,
          wrapContent: true,
          classes: {
            "sp-wrapper": "custom-sandpack-wrapper",
          }
        }}
        customSetup={{
           dependencies: {
              "framer-motion": "latest",
              "lucide-react": "latest",
              "clsx": "latest",
              "tailwind-merge": "latest"
           }
        }}
      />
    </div>
  );
}
