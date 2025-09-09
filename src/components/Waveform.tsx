'use client';
import { cn } from '@/lib/utils';
import React from 'react';
import { Eye, Pen, Plus } from 'lucide-react';

// This is a static visual representation.
const Waveform = () => {
  return (
    <div className="flex items-center gap-2 bg-[#101832] p-2 h-28">
      <div className="relative h-full flex-grow bg-background/20 rounded-md flex items-center">
        {/* Playhead */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-red-500 z-10"></div>
        {/* Waveform Image */}
        <img src="https://i.imgur.com/4xP2zYF.png" alt="Audio Waveform" className="w-full h-auto object-contain mix-blend-lighten" />
      </div>
      <div className="flex flex-col gap-2">
        <button className="text-muted-foreground hover:text-foreground"><Eye size={18}/></button>
        <button className="text-muted-foreground hover:text-foreground"><Pen size={18}/></button>
        <button className="text-muted-foreground hover:text-foreground"><Plus size={18}/></button>
      </div>
    </div>
  );
};

export default Waveform;
