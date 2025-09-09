'use client';
import React from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import { SetlistSong } from '@/actions/setlists';

interface TrackPadProps {
  track: SetlistSong;
  isActive: boolean;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
}

const TrackPad: React.FC<TrackPadProps> = ({
  track,
  isActive,
  isMuted,
  isSolo,
  volume,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
}) => {
  const { name, id } = track;
  // Define color based on track name for specific tracks
  const color = (name.toUpperCase() === 'CLICK' || name.toUpperCase() === 'CUES') ? 'destructive' : 'primary';

  const sliderColorClass = {
    primary: 'data-[state=active]:bg-primary',
    destructive: 'data-[state=active]:bg-destructive',
  };

  const handleVolumeChange = (value: number[]) => {
    onVolumeChange(value[0]);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-40 flex justify-center items-center">
        <Slider
          defaultValue={[volume]}
          max={100}
          step={1}
          orientation="vertical"
          onValueChange={handleVolumeChange}
          className={cn(
            '[&>span:first-child]:bg-secondary',
            isActive && '[&_.bg-primary]:bg-primary [&_.border-primary]:border-primary',
            isActive && color === 'destructive' && '[&_.bg-primary]:bg-destructive [&_.border-primary]:border-destructive',
            (isSolo || isMuted) && 'opacity-50'
          )}
        />
      </div>

       <div className="flex items-center justify-center w-full mt-2">
         <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{name}</span>
         {name === 'CUES' && <Button variant="ghost" size="icon" className="w-4 h-4 ml-1 text-muted-foreground"><Settings className="w-3 h-3" /></Button>}
       </div>

      <div className="flex gap-1.5 w-full">
        <Button
          onClick={onMuteToggle}
          variant={isMuted ? 'secondary' : 'ghost'}
          className={cn(
            'w-full h-7 text-xs font-bold border',
             isMuted ? 'bg-primary text-primary-foreground' : 'bg-secondary/50'
          )}
        >
          M
        </Button>
        <Button
          onClick={onSoloToggle}
          variant={isSolo ? 'secondary' : 'ghost'}
          className={cn(
            'w-full h-7 text-xs font-bold border',
            isSolo ? 'bg-yellow-500 text-black' : 'bg-secondary/50'
          )}
        >
          S
        </Button>
      </div>
    </div>
  );
};

export default TrackPad;
