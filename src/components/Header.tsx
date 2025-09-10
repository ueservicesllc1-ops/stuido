
'use client';

import React from 'react';
import { Button } from './ui/button';
import { Rewind, Play, Pause, Square, FastForward, Settings, RadioTower, Disc, Loader2 } from 'lucide-react';
import { Circle } from './icons';
import PlaybackModeToggle from './PlaybackModeToggle';
import type { PlaybackMode } from '@/app/page';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { Slider } from './ui/slider';


interface HeaderProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onSeek: (position: number) => void;
  currentTime: number;
  duration: number;
  playbackMode: PlaybackMode;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  loadingProgress: number;
  showLoadingBar: boolean;
  isReadyToPlay: boolean;
}

const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '00:00';
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
  onSeek,
  currentTime,
  duration,
  playbackMode,
  onPlaybackModeChange,
  loadingProgress,
  showLoadingBar,
  isReadyToPlay,
}) => {
  
  const handleSeek = (value: number[]) => {
    if (isReadyToPlay) {
      onSeek(value[0]);
    }
  };
  
  return (
    <header className="flex flex-col bg-card/50 border-b border-border p-2 gap-2 rounded-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-white text-black hover:bg-neutral-200 font-bold">
            MASTER
            </Button>
            <Button variant="secondary" size="icon"><Disc className="w-5 h-5 text-destructive" /></Button>
            <Button variant="secondary" size="icon"><RadioTower className="w-5 h-5" /></Button>
        </div>

        <div className="flex items-center gap-1 bg-background p-1 rounded-lg">
            <Button variant="secondary" size="icon" className="w-12 h-10" onClick={onRewind} disabled={!isReadyToPlay}>
            <Rewind className="w-6 h-6" />
            </Button>
            <div className="bg-white rounded-lg p-1">
                <Button 
                    variant="secondary" 
                    size="icon" 
                    className={cn(
                      "w-20 h-10 bg-white text-black hover:bg-neutral-200",
                      !isReadyToPlay && "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                    )}
                    onClick={isPlaying ? onPause : onPlay}
                    disabled={!isReadyToPlay}
                >
                    {isReadyToPlay ? (
                      isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />
                    ) : (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    )}
                </Button>
            </div>
            <Button variant="secondary" size="icon" className="w-12 h-10" onClick={onStop} disabled={!isReadyToPlay}>
            <Square className="w-6 h-6" />
            </Button>
            <Button variant="secondary" size="icon" className="w-12 h-10" onClick={onFastForward} disabled={!isReadyToPlay}>
            <FastForward className="w-6 h-6" />
            </Button>
        </div>
        
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
      </div>
      
      <div className="flex items-center gap-3 px-1 pt-1">
        <span className="font-mono text-sm text-muted-foreground w-14 text-right">
            {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSeek}
          disabled={!isReadyToPlay}
          className={cn(
             '[&>span:first-child]:bg-secondary',
             '[&_.bg-primary]:bg-primary [&_.border-primary]:border-primary h-2',
             !isReadyToPlay && 'opacity-50'
          )}
        />
        <span className="font-mono text-sm text-muted-foreground w-14 text-left">
            {formatTime(duration)}
        </span>
      </div>

      {showLoadingBar && (
        <div className="flex items-center gap-3 px-2 pt-2">
            <DownloadCloud className="w-5 h-5 text-yellow-400 animate-pulse" />
            <div className="flex-grow">
                 <Progress value={loadingProgress} className="h-2" indicatorClassName="bg-yellow-500" />
            </div>
            <span className="text-xs text-yellow-400 font-mono w-28 text-right">
                {Math.round(loadingProgress)}%
            </span>
        </div>
      )}
    </header>
  );
};

export default Header;
