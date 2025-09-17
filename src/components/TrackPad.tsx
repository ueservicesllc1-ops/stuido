'use client';
import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { SetlistSong } from '@/actions/setlists';

interface TrackPadProps {
  track: SetlistSong;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
}

const TrackPad: React.FC<React.memoExoticComponent<any>> = React.memo(({
  track,
  isMuted,
  isSolo,
  volume,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
}) => {
  const volumeSliderValue = useMemo(() => [volume], [volume]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Marco del Fader */}
      <div className="relative h-52 w-16 rounded-md border border-border/50 bg-black/30 p-2 pt-3 pb-3">
        <Slider
            value={volumeSliderValue}
            max={100}
            step={1}
            orientation="vertical"
            onValueChange={(val) => onVolumeChange(val[0])}
            className="h-full w-full"
            trackClassName="bg-input w-1 mx-auto"
            rangeClassName="bg-gradient-to-t from-blue-500 to-green-500"
            thumbClassName="h-1 w-5 rounded-sm bg-foreground border-none cursor-pointer"
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
