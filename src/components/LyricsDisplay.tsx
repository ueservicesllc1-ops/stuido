
'use client';

import React from 'react';
import { ScrollArea } from './ui/scroll-area';

interface LyricsDisplayProps {
  text: string;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ text }) => {
  return (
    <div className="bg-black/80 border border-amber-400/20 rounded-lg p-3 h-full">
      <ScrollArea className="h-full w-full">
        <pre className="font-mono text-amber-400 text-sm whitespace-pre-wrap [text-shadow:0_0_8px_theme(colors.amber.400)]">
            {text}
        </pre>
      </ScrollArea>
    </div>
  );
};

export default LyricsDisplay;
