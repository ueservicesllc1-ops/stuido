'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from './ui/card';


interface Song {
  id: string;
  name: string;
  url: string;
}

interface TrackProps {
  song: Song;
}

export interface TrackHandle {
  play: () => void;
  pause: () => void;
}

const Track = forwardRef<TrackHandle, TrackProps>(({ song }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useImperativeHandle(ref, () => ({
    play: () => {
      audioRef.current?.play();
      setIsPlaying(true);
    },
    pause: () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    },
  }));
  
  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setVolume(vol);
  };

  return (
    <Card className="bg-muted/30">
        <audio ref={audioRef} src={song.url} loop onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}></audio>
        <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
                <Button size="icon" onClick={togglePlayPause}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div>
                   <CardTitle className="text-base font-semibold leading-tight truncate">{song.name}</CardTitle>
                   <CardDescription className="text-xs">
                        {isPlaying ? 'Reproduciendo...' : 'En pausa'}
                   </CardDescription>
                </div>
            </div>
            <div className="flex items-center gap-2 w-full max-w-xs">
                {volume > 0 ? <Volume2 className="text-muted-foreground" /> : <VolumeX className="text-muted-foreground" />}
                <Slider
                    value={[volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                />
            </div>
        </CardContent>
    </Card>
  );
});

Track.displayName = "Track";

export default Track;
