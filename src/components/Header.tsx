
'use client';

import React from 'react';
import { Button } from './ui/button';
import { Rewind, Play, Pause, Square, FastForward, Settings, RadioTower, Disc } from 'lucide-react';
import { Circle } from './icons';
import PlaybackModeToggle from './PlaybackModeToggle';
import type { PlaybackMode } from '@/app/page';


interface HeaderProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  currentTime: number;
  duration: number;
  playbackMode: PlaybackMode;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};


const Header: React.FC<HeaderProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onRewind,
  onFastForward,
  currentTime,
  duration,
  playbackMode,
  onPlaybackModeChange
}) => {
  return (
    <header className="flex items-center justify-between bg-card/50 border-b border-border p-2 gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" className="bg-white text-black hover:bg-neutral-200 font-bold">
          MASTER
        </Button>
      </div>

      <div className="flex items-center gap-1 bg-background p-1 rounded-lg">
        <Button variant="secondary" size="icon" className="w-12 h-10" onClick={onRewind}>
          <Rewind className="w-6 h-6" />
        </Button>
        <div className="bg-white rounded-lg p-1">
            <Button 
                variant="secondary" 
                size="icon" 
                className="w-20 h-10 bg-white text-black hover:bg-neutral-200"
                onClick={isPlaying ? onPause : onPlay}
            >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </Button>
        </div>
        <Button variant="secondary" size="icon" className="w-12 h-10" onClick={onStop}>
          <Square className="w-6 h-6" />
        </Button>
        <Button variant="secondary" size="icon" className="w-12 h-10" onClick={onFastForward}>
          <FastForward className="w-6 h-6" />
        </Button>
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="icon"><Disc className="w-5 h-5 text-destructive" /></Button>
        <Button variant="secondary" size="icon"><RadioTower className="w-5 h-5" /></Button>
      </div>


      <div className="flex items-center gap-2 bg-secondary/50 text-foreground font-mono text-xl p-2 rounded-lg w-40 justify-center">
        <span>{formatTime(currentTime)}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{formatTime(duration)}</span>
      </div>

      <div className="flex-grow"></div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" className="font-mono">71...</Button>
        <Button variant="secondary" className="font-mono">D</Button>
        
        <PlaybackModeToggle value={playbackMode} onChange={onPlaybackModeChange} />
        
        <Button variant="ghost" className="gap-2">
            <Circle className="w-2 h-2 fill-current" />
            OUTS
        </Button>
        <Button variant="ghost" size="icon">
          <Settings />
        </Button>
      </div>
    </header>
  );
};

export default Header;
