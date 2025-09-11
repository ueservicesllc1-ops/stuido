
'use client';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { Loader2, Settings, Timer } from 'lucide-react';
import { SetlistSong } from '@/actions/setlists';
import VuMeter from './VuMeter';
import { PlaybackMode } from '@/app/page';

interface TrackPadProps {
  track: SetlistSong;
  isLoading: boolean;
  isMuted: boolean;
  isSolo: boolean;
  isAudible: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  vuMeterLevel: number;
  playbackMode: PlaybackMode;
}

const TrackPad: React.FC<TrackPadProps> = ({
  track,
  isLoading,
  isMuted,
  isSolo,
  isAudible,
  volume,
  onVolumeChange,
  onSoloToggle,
  onMuteToggle,
  vuMeterLevel,
  playbackMode,
}) => {
  const { name } = track;
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);
  
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setLocalVolume(newVolume);
    onVolumeChange(newVolume);
  };
  
  const sliderValue = useMemo(() => [localVolume], [localVolume]);
  const isDisabled = isLoading;
  const isSaturated = vuMeterLevel >= 95;

  const isSpecialTrack = useMemo(() => {
    const upperCaseName = name.trim().toUpperCase();
    return upperCaseName === 'CLICK' || upperCaseName === 'CUES';
  }, [name]);

  const rangeColorClass = useMemo(() => {
    if (isSpecialTrack) return 'bg-destructive';
    switch (playbackMode) {
      case 'hybrid':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-green-500';
      case 'online':
      default:
        return 'bg-primary';
    }
  }, [isSpecialTrack, playbackMode]);

  return (
    <div className="flex flex-col items-center gap-2">
       <div className="h-4 w-4 flex items-center justify-center">
            <div
                className={cn(
                    'h-2 w-2 rounded-full bg-secondary/30 transition-all',
                    isAudible && !isSaturated && 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]',
                    isAudible && isSaturated && 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                )}
            />
        </div>
      <div className="relative h-40 flex justify-center items-center gap-1.5">
         {isDisabled && (
           <div className="absolute inset-0 flex justify-center items-center bg-card/80 z-20 rounded-lg">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
           </div>
         )}
        <Slider
            value={sliderValue}
            max={100}
            step={1}
            orientation="vertical"
            onValueChange={handleVolumeChange}
            disabled={isDisabled}
            className={cn(
            '[&>span:first-child]:bg-secondary',
            (isSolo || isMuted || isDisabled) && 'opacity-50'
            )}
            rangeClassName={rangeColorClass}
        />
        <VuMeter level={vuMeterLevel} />
      </div>

       <div className="flex items-center justify-center w-full mt-2">
         <span className={cn(
            "text-xs font-semibold uppercase text-muted-foreground tracking-wider",
            isDisabled && 'opacity-50',
            isSpecialTrack && 'text-destructive'
          )}>{name}</span>
         {name.trim().toUpperCase() === 'CUES' && <Button variant="ghost" size="icon" className="w-4 h-4 ml-1 text-muted-foreground"><Settings className="w-3 h-3" /></Button>}
       </div>

      <div className="flex gap-1.5 w-full">
        <Button
          onClick={onMuteToggle}
          variant={isMuted ? 'secondary' : 'ghost'}
          disabled={isDisabled}
          className={cn(
            'w-full h-7 text-xs font-bold border',
             isMuted ? 'bg-primary text-primary-foreground' : 'bg-secondary/50',
             isDisabled && '!bg-secondary/30 !text-muted-foreground'
          )}
        >
          M
        </Button>
        <Button
          onClick={onSoloToggle}
          variant={isSolo ? 'secondary' : 'ghost'}
          disabled={isDisabled || isSpecialTrack}
          className={cn(
            'w-full h-7 text-xs font-bold border',
            isSolo ? 'bg-yellow-500 text-black' : 'bg-secondary/50',
             (isDisabled || isSpecialTrack) && '!bg-secondary/30 !text-muted-foreground'
          )}
        >
          S
        </Button>
      </div>
    </div>
  );
};

export default TrackPad;
