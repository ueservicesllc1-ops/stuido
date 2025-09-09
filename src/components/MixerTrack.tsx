'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { buttonVariants } from './ui/button';

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
    const audio = audioRef.current;
    if (isPlaying && audio) {
       const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
       const analyser = audioContext.createAnalyser();
       const source = audioContext.createMediaElementSource(audio);
       source.connect(analyser);
       analyser.connect(audioContext.destination);
       analyser.fftSize = 32;
       const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setVolume((average / 255) * 100); 
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
  
  const bgColor = song ? (color === 'accent' ? 'bg-accent' : 'bg-primary') : 'bg-card';
  const progressColor = color === 'accent' ? 'bg-accent/50' : 'bg-primary/50';

  return (
    <div className="flex flex-col items-center gap-2">
      {song && <audio ref={audioRef} src={song.url} loop muted={isMuted} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} crossOrigin="anonymous" />}
      <span className="text-xs font-bold uppercase tracking-wider">{name}</span>
      <div className={cn("w-full h-24 rounded-md flex flex-col justify-end p-1 cursor-pointer relative overflow-hidden", bgColor)} onClick={handlePadClick}>
         <Progress value={volume} className="h-1 absolute bottom-1 left-1 right-1 w-auto" />
      </div>
      <div className="flex justify-center items-center gap-1 w-full">
        <Button 
          size="sm" 
          variant={isMuted ? 'destructive' : 'secondary'} 
          className="flex-1 h-8 text-xs font-bold"
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
        >
          M
        </Button>
        <Button 
          size="sm" 
          className={cn("flex-1 h-8 text-xs font-bold", buttonVariants({ variant: isSolo ? 'yellow' : 'secondary' }))}
          onClick={(e) => { e.stopPropagation(); setIsSolo(!isSolo); }}
        >
          S
        </Button>
      </div>
    </div>
  );
});

MixerTrack.displayName = "MixerTrack";

export default MixerTrack;
