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
  onMuteToggle: () => void;
  onSoloToggle: () => void;
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
  const isClipping = vuLevel >= 0;
  const hasSignal = vuLevel > -48;

  // Convert dB to a 0-100 scale. Assuming VU meter range starts from -48dB.
  const vuMeterLevel = useMemo(() => {
    if (isMuted) return 0;
    const level = Math.max(0, (vuLevel + 48) / 48) * 100;
    return Math.min(level, 100);
  }, [vuLevel, isMuted]);


  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-40 w-16 rounded-md border border-border/50 bg-black/30 p-2 flex flex-col gap-2">
        <div className="relative flex-grow h-full pt-4">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 h-3">
                {/* Active (Blue) LED */}
                <div className={cn(
                    "w-2 h-2 rounded-full bg-input transition-colors",
                     hasSignal && !isMuted && "bg-blue-500 shadow-[0_0_4px_1px] shadow-blue-500/70"
                )} />
                {/* Clip (Red) LED */}
                <div className={cn(
                    "w-2 h-2 rounded-full bg-input transition-colors",
                    isClipping && !isMuted && "bg-destructive shadow-[0_0_4px_1px] shadow-destructive/70 animate-pulse"
                )} />
            </div>

            <Slider
                value={volumeSliderValue}
                max={100}
                step={1}
                orientation="vertical"
                onValueChange={(val) => onVolumeChange(val[0])}
                className="h-full w-4 absolute left-1/2 -translate-x-1/2"
                trackClassName="bg-input"
                rangeClassName="bg-gradient-to-t from-blue-500 to-green-500"
                thumbClassName="h-3 w-5 rounded-sm bg-foreground border-none cursor-pointer"
            />
            <div className="absolute left-[calc(50%+12px)] h-full">
              <VuMeter level={vuMeterLevel} orientation="vertical" />
            </div>
        </div>
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
