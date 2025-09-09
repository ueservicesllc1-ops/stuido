'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Song {
  id: string;
  name: string;
  url: string;
}

interface MixerTrackProps {
  name: string;
  song?: Song;
  color?: 'primary' | 'accent';
}

export interface MixerTrackHandle {
  play: () => void;
  pause: () => void;
}

const MixerTrack = forwardRef<MixerTrackHandle, MixerTrackProps>(({ name, song, color = 'primary' }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [volume, setVolume] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // This effect will simulate a volume meter
  useEffect(() => {
    let animationFrameId: number;
    if (isPlaying) {
      const updateVolume = () => {
        // This is a fake meter for visual purposes
        setVolume(Math.random() * 80 + 20); 
        animationFrameId = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } else {
      setVolume(0);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  useImperativeHandle(ref, () => ({
    play: () => {
      if(song) {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    },
    pause: () => {
      if(song) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    },
  }));

  const handlePadClick = () => {
    if (!song) return;
     if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  }

  const bgColor = color === 'accent' ? 'bg-accent' : 'bg-primary';
  const progressColor = color === 'accent' ? 'bg-accent/50' : 'bg-primary/50';

  return (
    <div className="flex flex-col items-center gap-2">
      {song && <audio ref={audioRef} src={song.url} loop muted={isMuted} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />}
      <span className="text-xs font-bold uppercase tracking-wider">{name}</span>
      <div className={cn("w-full h-24 rounded-md flex flex-col justify-end p-1 cursor-pointer", song ? bgColor : 'bg-muted/20')} onClick={handlePadClick}>
         <Progress value={volume} className={cn("h-2", progressColor)} indicatorClassName={bgColor} />
      </div>
      <div className="flex justify-center items-center gap-1 w-full">
        <Button 
          size="sm" 
          variant={isMuted ? 'destructive' : 'secondary'} 
          className="flex-1 h-8 text-xs font-bold"
          onClick={() => setIsMuted(!isMuted)}
        >
          M
        </Button>
        <Button 
          size="sm" 
          variant={isSolo ? 'yellow' : 'secondary'} // Needs custom yellow variant
          className="flex-1 h-8 text-xs font-bold"
          onClick={() => setIsSolo(!isSolo)}
        >
          S
        </Button>
      </div>
    </div>
  );
});

MixerTrack.displayName = "MixerTrack";

// A small helper for progress bar custom color
const ProgressIndicator = React.forwardRef<
    React.ElementRef<typeof Progress>,
    React.ComponentPropsWithoutRef<typeof Progress> & { indicatorClassName?: string }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <Progress ref={ref} className={className} {...props} value={value}>
    <Progress.Indicator
      className={cn("h-full w-full flex-1 transition-all", indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </Progress>
))
ProgressIndicator.displayName = "ProgressIndicatorWithCustomColor"


export default MixerTrack;
