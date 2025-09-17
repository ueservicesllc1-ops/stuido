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

  const faderLedColor = useMemo(() => {
    if (isMuted) return "bg-destructive shadow-[0_0_3px_1px] shadow-destructive/50";
    if (isSolo) return "bg-yellow-500 shadow-[0_0_3px_1px] shadow-yellow-500/50";
    return "bg-amber-400 shadow-[0_0_3px_1px] shadow-amber-400/50";
  }, [isMuted, isSolo]);


  return (
    <div 
        className={cn(
            "relative flex flex-col items-center gap-2 rounded-lg border border-black/50 transition-colors h-64 justify-between p-1",
            isPlaying ? "bg-primary/5" : "bg-input"
        )}
    >
        {/* Fader */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-10 flex flex-col items-center">
             <Slider
                value={volumeSliderValue}
                max={100}
                step={1}
                orientation="vertical"
                onValueChange={(val) => onValueChange(val[0])}
                className="h-full w-4"
                trackClassName="bg-input"
                rangeClassName="bg-gradient-to-t from-destructive via-yellow-500 to-green-500"
            />
        </div>

      <div className="relative z-10 flex gap-1.5 w-full mt-auto">
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
