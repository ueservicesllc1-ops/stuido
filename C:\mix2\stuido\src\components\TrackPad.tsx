
'use client';
import React, { useMemo } from 'react';
import VuMeter from './VuMeter';
import TempoLed from './TempoLed';
import { SetlistSong } from '@/actions/setlists';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface TrackPadProps {
  track: SetlistSong;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  vuLevel: number;
  tempo: number;
  isPlaying: boolean;
  onVolumeChange: (volume: number) => void;
  onSoloToggle: () => void;
  onMuteToggle: () => void;
}

const TrackPad: React.FC<TrackPadProps> = ({
  track,
  isMuted,
  isSolo,
  volume,
  vuLevel,
  tempo,
  isPlaying,
  onVolumeChange,
  onSoloToggle,
  onMuteToggle
}) => {
  const isClickTrack = useMemo(() => track.name.trim().toUpperCase() === 'CLICK', [track.name]);

  const vuMeterLevel = useMemo(() => {
    const level = Math.max(0, (vuLevel + 48) / 48) * 100;
    return Math.min(level, 100);
  }, [vuLevel]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full text-center bg-black/80 border border-blue-500/20 rounded-md px-1 py-1 h-8 flex items-center justify-center">
        <span className="font-mono text-sm text-blue-400 [text-shadow:0_0_8px_theme(colors.blue.500)] truncate block w-full">
            {track.name}
        </span>
      </div>
        
      <div className="relative h-52 w-24 rounded-md border border-border/20 bg-black/50 p-2 flex justify-center items-center">
        
        <div className="absolute right-2 top-0 bottom-0 flex items-center">
            {isClickTrack ? (
                <TempoLed tempo={tempo} isPlaying={isPlaying} />
            ) : (
                <VuMeter level={vuMeterLevel} orientation="vertical" />
            )}
        </div>
      </div>

      <div className="flex gap-1.5 w-full">
        <Button
          onClick={onMuteToggle}
          variant="secondary"
          className={cn(
            'w-full py-1 h-auto text-xs font-bold rounded-sm',
             isMuted ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          )}
        >
          M
        </Button>
        <Button
          onClick={onSoloToggle}
          variant="secondary"
          className={cn(
            'w-full py-1 h-auto text-xs font-bold rounded-sm',
            isSolo ? 'bg-yellow-500 text-black' : 'bg-secondary'
          )}
        >
          S
        </Button>
      </div>
    </div>
  );
};

export default TrackPad;
