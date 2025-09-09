'use client';

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';

interface Song {
  id: string;
  name: string;
  url: string;
}

interface TrackState {
  isPlaying: boolean;
  volume: number;
}

interface TrackProps {
  song: Song;
  trackState: TrackState;
  setTrackState: (newState: Partial<TrackState>) => void;
  setAudioRef: (el: HTMLAudioElement | null) => void;
}

const Track: React.FC<TrackProps> = ({ song, trackState, setTrackState, setAudioRef }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if(audioRef.current) {
      setAudioRef(audioRef.current);
    }
    return () => {
      setAudioRef(null);
    }
  }, [setAudioRef]);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = trackState.volume;
    }
  }, [trackState.volume]);

  const togglePlay = () => {
    if (trackState.isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setTrackState({ isPlaying: !trackState.isPlaying });
  };

  const handleVolumeChange = (value: number[]) => {
    setTrackState({ volume: value[0] });
  };
  
  const handleEnded = () => {
    setTrackState({ isPlaying: false });
     if(audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-card/50">
      <audio
        ref={audioRef}
        src={song.url}
        onPlay={() => setTrackState({ isPlaying: true })}
        onPause={() => setTrackState({ isPlaying: false })}
        onEnded={handleEnded}
        loop
        crossOrigin="anonymous"
      />
      <Button onClick={togglePlay} size="icon" variant="ghost">
        {trackState.isPlaying ? <Pause /> : <Play />}
      </Button>
      <div className="flex-grow">
        <p className="font-semibold">{song.name}</p>
        <p className="text-sm text-muted-foreground">Duración: --:--</p> 
      </div>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={[trackState.volume]}
        onValueChange={handleVolumeChange}
        className="w-[150px]"
      />
    </div>
  );
};

export default Track;
