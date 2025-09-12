
'use client';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { Loader2, Settings } from 'lucide-react';
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
  pan: number;
  onVolumeChange: (volume: number) => void;
  onPanChange: (pan: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  vuMeterLevel: number;
  playbackMode: PlaybackMode;
  isPanVisible: boolean;
}

const TrackPad: React.FC<TrackPadProps> = React.memo(({
  track,
  isLoading,
  isMuted,
  isSolo,
  isAudible,
  volume,
  pan,
  onVolumeChange,
  onPanChange,
  onSoloToggle,
  onMuteToggle,
  vuMeterLevel,
  playbackMode,
  isPanVisible,
}) => {
  const { name } = track;
  const [localVolume, setLocalVolume] = useState(volume);
  const [localPan, setLocalPan] = useState(pan);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  useEffect(() => {
    setLocalPan(pan);
  }, [pan]);
  
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setLocalVolume(newVolume);
    onVolumeChange(newVolume);
  };

  const handlePanChange = (value: number[]) => {
    const newPan = value[0];
    setLocalPan(newPan);
    onPanChange(newPan);
  }
  
  const sliderValue = useMemo(() => [localVolume], [localVolume]);
  const panSliderValue = useMemo(() => [localPan], [localPan]);
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
       
       {isPanVisible && (
        <div className="w-full px-2">
              <Slider
                  value={panSliderValue}
                  max={1}
                  min={-1}
                  step={0.05}
                  onValueChange={handlePanChange}
                  disabled={isDisabled}
                  className={cn(
                      'w-full h-4',
                      (isDisabled) && 'opacity-50'
                  )}
                  thumbClassName="h-3.5 w-2"
              />
        </div>
       )}

      <div className="flex gap-1.5 w-full mt-2">
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
});

TrackPad.displayName = 'TrackPad';

export default TrackPad;
