
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Rewind, Play, Pause, Square, FastForward, Settings, RadioTower, Disc, Loader2, DownloadCloud, Timer, Volume2, Plus, Minus } from 'lucide-react';
import { Circle } from './icons';
import PlaybackModeToggle from './PlaybackModeToggle';
import type { PlaybackMode } from '@/app/page';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import Timeline from './Timeline';
import { SongStructure } from '@/ai/flows/song-structure';
import SettingsDialog from './SettingsDialog';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import type { Song } from '@/actions/songs';


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
  songStructure: SongStructure | null;
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  fadeOutDuration: number;
  onFadeOutDurationChange: (duration: number) => void;
  isPanVisible: boolean;
  onPanVisibilityChange: (isVisible: boolean) => void;
  activeSong: Song | undefined;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  onBpmChange: (bpm: number) => void;
}

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
  songStructure,
  masterVolume,
  onMasterVolumeChange,
  fadeOutDuration,
  onFadeOutDurationChange,
  isPanVisible,
  onPanVisibilityChange,
  activeSong,
  playbackRate,
  onPlaybackRateChange,
  onBpmChange,
}) => {
  
  const currentBPM = activeSong?.tempo ? activeSong.tempo * playbackRate : null;
  const pitchPercent = ((playbackRate - 1) * 100).toFixed(1);
  const [bpmInput, setBpmInput] = useState<string>('');

  useEffect(() => {
    if (currentBPM !== null) {
      setBpmInput(currentBPM.toFixed(1));
    } else {
      setBpmInput('--');
    }
  }, [currentBPM]);

  const handleBpmInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpmInput(e.target.value);
  }

  const handleBpmInputBlur = () => {
    const newBpm = parseFloat(bpmInput);
    if (!isNaN(newBpm) && newBpm > 0) {
      onBpmChange(newBpm);
    } else {
      // Revert if input is invalid
      setBpmInput(currentBPM ? currentBPM.toFixed(1) : '--');
    }
  }

  const handleBpmInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleBpmInputBlur();
        e.currentTarget.blur();
    }
  }
  
  const handleBpmStep = (amount: number) => {
    if (currentBPM) {
        onBpmChange(currentBPM + amount);
    }
  }


  return (
    <header className="flex flex-col bg-card/50 border-b border-border p-2 gap-2 rounded-lg">
      <div className="flex items-center justify-start gap-6">
        <div className="flex items-center gap-2 w-52">
            <Volume2 className="w-5 h-5 text-muted-foreground ml-1 flex-shrink-0" />
            <Slider
                value={[masterVolume]}
                onValueChange={(vals) => onMasterVolumeChange(vals[0])}
                max={100}
                step={1}
                className="flex-grow"
                rangeClassName="bg-amber-400"
                thumbClassName="bg-amber-400 border-amber-600 h-5 w-5"
            />
            <div className="bg-black/80 border border-amber-400/20 rounded-md px-2 py-1 w-16 text-center">
                <span className="font-mono text-lg text-amber-400 [text-shadow:0_0_8px_theme(colors.amber.400)]">
                    {masterVolume}
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/80 border border-amber-400/20 rounded-md h-12">
                 <Button variant="ghost" size="icon" className="w-10 h-10 text-amber-400/70" onClick={() => handleBpmStep(-1)} disabled={!activeSong}>
                    <Minus className="w-5 h-5" />
                 </Button>
                 <div className="flex flex-col items-center justify-center px-1 py-1 w-24">
                    <Input
                        type="text"
                        value={bpmInput}
                        onChange={handleBpmInput}
                        onBlur={handleBpmInputBlur}
                        onKeyPress={handleBpmInputKeyPress}
                        disabled={!activeSong?.tempo}
                        className="w-full h-full p-0 m-0 bg-transparent border-none text-center font-mono text-xl font-bold text-amber-400 [text-shadow:0_0_8px_theme(colors.amber.400)] focus:ring-0 focus:outline-none"
                    />
                    <span className="text-xs font-mono text-amber-400/70 -mt-1">BPM</span>
                 </div>
                 <Button variant="ghost" size="icon" className="w-10 h-10 text-amber-400/70" onClick={() => handleBpmStep(1)} disabled={!activeSong}>
                    <Plus className="w-5 h-5" />
                 </Button>
            </div>
             <div className="text-xs font-mono text-amber-400/70 ml-2 w-24">
                Pitch: {playbackRate === 1.0 ? "0.0%" : `${pitchPercent}%`}
            </div>
        </div>

        <div className="flex items-center justify-center gap-4">
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
        </div>
        
        <div className="flex items-center justify-end gap-2 ml-auto">
            <div className="flex items-center gap-1.5 bg-destructive/20 border border-destructive/50 rounded-md px-2 py-1">
                <div className="w-2 h-2 rounded-full bg-destructive shadow-[0_0_4px] shadow-destructive" />
                <span className="text-destructive font-bold text-sm">IA</span>
            </div>
             <Button variant="outline">D</Button>
            <PlaybackModeToggle value={playbackMode} onChange={onPlaybackModeChange} />
            <Button variant="ghost" className="gap-2">
                <Circle className="w-2 h-2 fill-current" />
                OUTS
            </Button>
            <SettingsDialog 
              fadeOutDuration={fadeOutDuration}
              onFadeOutDurationChange={onFadeOutDurationChange}
              isPanVisible={isPanVisible}
              onPanVisibilityChange={onPanVisibilityChange}
            >
                <Button variant="ghost" size="icon">
                    <Settings />
                </Button>
            </SettingsDialog>
        </div>
      </div>
      
      <Timeline
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        structure={songStructure}
        isReady={isReadyToPlay}
       />

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

    