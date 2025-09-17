'use client';
import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { SetlistSong } from '@/actions/setlists';

interface TrackPadProps {
  track: SetlistSong;
  isPlaying: boolean;
  isMuted: boolean;
  isSolo: boolean;
  isAudible: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
}

const TrackPad: React.FC<React.memoExoticComponent<any>> = React.memo(({
  track,
  isPlaying,
  isMuted,
  isSolo,
  isAudible,
  volume,
  onVolumeChange,
  onSoloToggle,
  onMuteToggle,
}) => {
  const { name } = track;
  
  const volumeSliderValue = useMemo(() => [volume], [volume]);

  const isSpecialTrack = useMemo(() => {
    const upperCaseName = name.trim().toUpperCase();
    return upperCaseName === 'CLICK' || upperCaseName === 'CUES';
  }, [name]);


  return (
    <div className="flex flex-col items-center gap-2">
      {/* Marco del Fader */}
      <div className="relative h-64 w-16 rounded-md border border-border/50 bg-black/30 p-2 pt-3 pb-3">
        <Slider
            value={volumeSliderValue}
            max={100}
            step={1}
            orientation="vertical"
            onValueChange={(val) => onValueChange(val[0])}
            className="h-full w-full"
            trackClassName="bg-input w-1 mx-auto"
            rangeClassName="bg-gradient-to-t from-blue-500 via-yellow-500 to-green-500"
            thumbClassName="h-4 w-8 rounded-sm bg-foreground border-none cursor-pointer"
        />
      </div>

      {/* Contenedor de Botones */}
      <div className="flex gap-1.5 w-full">
        <Button
          onClick={onMuteToggle}
          variant="secondary"
          className={cn(
            'w-full h-8 text-xs font-bold rounded-sm',
             isMuted ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          )}
        >
          M
        </Button>
        <Button
          onClick={onSoloToggle}
          variant="secondary"
          disabled={isSpecialTrack}
          className={cn(
            'w-full h-8 text-xs font-bold rounded-sm',
            isSolo ? 'bg-yellow-500 text-black' : 'bg-secondary',
             isSpecialTrack && '!bg-secondary/30 !text-muted-foreground'
          )}
        >
          S
        </Button>
      </div>
    </div>
  );
});

TrackPad.displayName = 'TrackPad';

export default TrackPad;
