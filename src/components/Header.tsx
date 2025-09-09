'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Rewind, Play, Pause, Stop, FastForward, Triangle } from 'lucide-react';

interface HeaderProps {
  isPlaying: boolean;
  onPlayPause: () => void;
}

const Header: React.FC<HeaderProps> = ({ isPlaying, onPlayPause }) => {
  return (
    <header className="flex items-center justify-between p-2 bg-[#101832] border-b border-border">
      {/* Left Side */}
      <div className="flex items-center gap-2">
        <Button variant="outline" className="bg-white text-black hover:bg-gray-200 font-bold">MASTER</Button>
      </div>

      {/* Center: Transport Controls */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" className="w-12 h-10">
          <Rewind className="h-6 w-6" />
        </Button>
        <Button variant="secondary" size="icon" className="w-20 h-10 bg-white text-black hover:bg-gray-200" onClick={onPlayPause}>
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        <Button variant="secondary" size="icon" className="w-12 h-10">
          <Stop className="h-6 w-6" />
        </Button>
        <Button variant="secondary" size="icon" className="w-12 h-10">
          <FastForward className="h-6 w-6" />
        </Button>
        <Button variant="secondary" size="icon" className="w-12 h-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h4v-5h4v5h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2h-4v5h-4V2z"/></svg>
        </Button>
        <Button variant="secondary" size="icon" className="w-12 h-10">
            <Triangle className="h-5 w-5" />
        </Button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        <div className="text-lg font-mono">
          <span>00:00</span>
          <span className="text-muted-foreground"> / 05:29</span>
        </div>
        <div className="flex items-center gap-1">
            <Button variant="secondary" className="font-bold">71...</Button>
            <Button variant="secondary" className="font-bold">D</Button>
        </div>
        <div className="flex items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full border border-current"></div>
                MIDI IN
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full border border-current"></div>
                OUTS
            </Button>
        </div>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
