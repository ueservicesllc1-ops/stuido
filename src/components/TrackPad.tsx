
'use client';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { Loader2, Settings, ArrowDownToLine } from 'lucide-react';
import { SetlistSong } from '@/actions/setlists';
import { PlaybackMode } from '@/app/page';

interface TrackPadProps {
  track: SetlistSong;
  isLoading: boolean;
  isMuted: boolean;
  isSolo: boolean;
  isAudible: boolean;
  volume: number;
  onVolumeChange: (trackId: string, volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  isPlaying: boolean;
  playbackPosition: number;
  duration: number;
  playbackMode: PlaybackMode;
  isCached: boolean;
  isHybridDownloading: boolean;
}

const TrackPad: React.FC<TrackPadProps> = ({
  track,
  isLoading,
  isMuted,
  isSolo,
  isAudible,
  volume,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  isPlaying,
  playbackPosition,
  duration,
  playbackMode,
  isCached,
  isHybridDownloading,
}) => {
  const { id, name } = track;
  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderHeight, setSliderHeight] = useState(0);
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    if (sliderRef.current) {
      setSliderHeight(sliderRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const color = (name.trim().toUpperCase() === 'CLICK' || name.trim().toUpperCase() === 'CUES') ? 'destructive' : 'primary';
  
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setLocalVolume(newVolume);
    onVolumeChange(id, newVolume);
  };
  
  const progressPercentage = duration > 0 ? (playbackPosition / duration) * 100 : 0;
  // Calculate indicator position based on the slider's height. The '8' is a magic number for thumb height adjustment.
  const indicatorPosition = (progressPercentage / 100) * (sliderHeight > 8 ? sliderHeight - 8 : sliderHeight); 

  const isDownloadingForOffline = playbackMode === 'offline' && !isCached;
  const isDisabled = isLoading || isDownloadingForOffline;
  
  const sliderValue = useMemo(() => [localVolume], [localVolume]);

  const getSliderColorClass = () => {
    if (color === 'destructive') return '[&_.bg-primary]:bg-destructive [&_.border-primary]:border-destructive';

    switch (playbackMode) {
        case 'online':
            return '[&_.bg-primary]:bg-primary [&_.border-primary]:border-primary';
        case 'hybrid':
            return isCached ? '[&_.bg-primary]:bg-green-500 [&_.border-primary]:border-green-500' : '[&_.bg-primary]:bg-primary [&_.border-primary]:border-primary';
        case 'offline':
            return '[&_.bg-primary]:bg-yellow-500 [&_.border-primary]:border-yellow-500';
        default:
            return '[&_.bg-primary]:bg-primary [&_.border-primary]:border-primary';
    }
  };

  const isSaturated = localVolume >= 95;


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
      <div className="relative h-40 flex justify-center items-center" ref={sliderRef}>
         {isHybridDownloading && (
            <div className="absolute top-0 right-0 z-20 p-1 bg-card/80 rounded-full">
               <ArrowDownToLine className="w-3 h-3 text-primary animate-pulse" />
            </div>
         )}
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
          value={sliderValue}
          max={100}
          step={1}
          orientation="vertical"
          onValueChange={handleVolumeChange}
          disabled={isDisabled}
          className={cn(
            '[&>span:first-child]:bg-secondary',
            getSliderColorClass(),
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
