
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface LyricsDisplayProps {
  text: string;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ text }) => {
  return (
    <div className="bg-black/80 border border-amber-400/20 rounded-lg p-4 h-full flex items-center justify-center">
      <ScrollArea className="h-full w-full">
        <p className="font-mono text-xl text-amber-400 [text-shadow:0_0_8px_theme(colors.amber.400)] whitespace-pre-wrap text-center">
          {text}
        </p>
      </ScrollArea>
    </div>
  );
};

export default LyricsDisplay;
