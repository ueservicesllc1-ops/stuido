
'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { Loader2, Settings } from 'lucide-react';
import { SetlistSong } from '@/actions/setlists';
import { PlaybackMode } from '@/app/page';

interface TrackPadProps {
  track: SetlistSong;
  isLoading: boolean;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  isPlaying: boolean;
  playbackPosition: number;
  duration: number;
  playbackMode: PlaybackMode;
  isCached: boolean;
}

const TrackPad: React.FC<TrackPadProps> = ({
  track,
  isLoading,
  isMuted,
  isSolo,
  volume,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  isPlaying,
  playbackPosition,
  duration,
  playbackMode,
  isCached,
}) => {
  const { name } = track;
  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderHeight, setSliderHeight] = useState(0);

  useEffect(() => {
    if (sliderRef.current) {
      setSliderHeight(sliderRef.current.offsetHeight);
    }
  }, [sliderRef]);

  const color = (name.toUpperCase() === 'CLICK' || name.toUpperCase() === 'CUES') ? 'destructive' : 'primary';

  const handleVolumeChange = (value: number[]) => {
    onVolumeChange(value[0]);
  };
  
  const progressPercentage = duration > 0 ? (playbackPosition / duration) * 100 : 0;
  // We subtract the indicator height (8px) from the total height to keep it within bounds
  const indicatorPosition = (progressPercentage / 100) * (sliderHeight - 8); 

  const isDownloading = playbackMode === 'offline' && !isCached;
  const isDisabled = isLoading || isDownloading;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-40 flex justify-center items-center" ref={sliderRef}>
         {isDisabled && (
           <div className="absolute inset-0 flex justify-center items-center bg-card/80 z-20 rounded-lg">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
           </div>
         )}
         {isPlaying && duration > 0 && !isDisabled && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-4 h-2 rounded-full bg-green-400 z-10"
            style={{ 
              top: `${indicatorPosition}px`,
              boxShadow: '0 0 8px rgba(134, 239, 172, 0.8)' 
            }}
          />
        )}
        <Slider
          defaultValue={[volume]}
          max={100}
          step={1}
          orientation="vertical"
          onValueChange={handleVolumeChange}
          disabled={isDisabled}
          className={cn(
            '[&>span:first-child]:bg-secondary',
            // Default online color
            '[&_.bg-primary]:bg-primary [&_.border-primary]:border-primary',
            // Special colors
            color === 'destructive' && '[&_.bg-primary]:bg-destructive [&_.border-primary]:border-destructive',
            // Offline color override
            playbackMode === 'offline' && color !== 'destructive' && '[&_.bg-primary]:bg-yellow-500 [&_.border-primary]:border-yellow-500',
            (isSolo || isMuted || isDisabled) && 'opacity-50'
          )}
        />
      </div>

       <div className="flex items-center justify-center w-full mt-2">
         <span className={cn(
            "text-xs font-semibold uppercase text-muted-foreground tracking-wider",
            isDisabled && 'opacity-50'
          )}>{name}</span>
         {name === 'CUES' && <Button variant="ghost" size="icon" className="w-4 h-4 ml-1 text-muted-foreground"><Settings className="w-3 h-3" /></Button>}
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
          disabled={isDisabled}
          className={cn(
            'w-full h-7 text-xs font-bold border',
            isSolo ? 'bg-yellow-500 text-black' : 'bg-secondary/50',
             isDisabled && '!bg-secondary/30 !text-muted-foreground'
          )}
        >
          S
        </Button>
      </div>
    </div>
  );
};

export default TrackPad;
