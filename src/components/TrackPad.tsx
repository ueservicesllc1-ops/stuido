'use client';
import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { SetlistSong } from '@/actions/setlists';
import VuMeter from './VuMeter';

interface TrackPadProps {
  track: SetlistSong;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  vuLevel: number;
  onVolumeChange: (volume: number) => void;
  onSoloToggle: () => void;
  onMuteToggle: () => void;
}

const TrackPad: React.FC<React.memoExoticComponent<any>> = React.memo(({
  track,
  isMuted,
  isSolo,
  volume,
  vuLevel,
  onVolumeChange,
  onSoloToggle,
  onMuteToggle
}) => {
  const volumeSliderValue = useMemo(() => [volume], [volume]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-40 w-20 rounded-md border border-border/20 bg-black/50 p-2 flex justify-center items-center">
        <Slider
            value={volumeSliderValue}
            max={100}
            step={1}
            orientation="vertical"
            onValueChange={(val) => onVolumeChange(val[0])}
        />
      </div>

       <div className="w-full text-center mt-1">
        <span className="text-xs font-mono text-foreground truncate block w-full">{track.name}</span>
      </div>

      {/* Contenedor de Botones */}
      <div className="flex gap-1.5 w-full">
        <Button
          onClick={onMuteToggle}
          variant="secondary"
          className={cn(
            'w-full h-7 text-xs font-bold rounded-sm',
             isMuted ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          )}
        >
          M
        </Button>
        <Button
          onClick={onSoloToggle}
          variant="secondary"
          className={cn(
            'w-full h-7 text-xs font-bold rounded-sm',
            isSolo ? 'bg-yellow-500 text-black' : 'bg-secondary'
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
