'use client';
import React from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';

interface TrackPadProps {
  name: string;
  color?: 'primary' | 'destructive';
  isActive: boolean;
  isMuted: boolean;
  isSolo: boolean;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  progress: number;
}

const TrackPad: React.FC<TrackPadProps> = ({
  name,
  color = 'primary',
  isActive,
  isMuted,
  isSolo,
  onMuteToggle,
  onSoloToggle,
  progress,
}) => {
  const padColorClass = {
    primary: 'bg-primary/80 border-primary/90',
    destructive: 'bg-destructive/80 border-destructive/90',
  };

  const progressColorClass = {
    primary: 'bg-primary',
    destructive: 'bg-destructive',
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
       <div className="flex items-center justify-center w-full">
         <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{name}</span>
         {name === 'CUES' && <Button variant="ghost" size="icon" className="w-4 h-4 ml-1 text-muted-foreground"><Settings className="w-3 h-3" /></Button>}
       </div>

      <div
        className={cn(
          'relative w-full aspect-[3/4] rounded-md flex items-center justify-center font-bold text-lg border-2 cursor-pointer transition-all duration-200',
          isActive ? padColorClass[color] : 'bg-muted/40 border-muted-foreground/30',
          (isSolo || isMuted) && 'opacity-50'
        )}
      >
        <div className="absolute bottom-0 left-0 right-0 h-1.5 p-0.5">
          {isActive && <Progress value={progress} className="h-full" indicatorClassName={progressColorClass[color]} />}
        </div>
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
