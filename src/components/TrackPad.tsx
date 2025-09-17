
'use client';
import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import { Loader2, Settings } from 'lucide-react';
import { SetlistSong } from '@/actions/setlists';
import VuMeter from './VuMeter';

interface TrackPadProps {
  track: SetlistSong;
  isLoading: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isSolo: boolean;
  isAudible: boolean;
  pan: number;
  onPanChange: (pan: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  vuMeterLevel: number;
  isPanVisible: boolean;
}

const TrackPad: React.FC<React.memoExoticComponent<any>> = React.memo(({
  track,
  isLoading,
  isPlaying,
  isMuted,
  isSolo,
  isAudible,
  pan,
  onPanChange,
  onSoloToggle,
  onMuteToggle,
  vuMeterLevel,
  isPanVisible,
}) => {
  const { name } = track;
  
  const panSliderValue = useMemo(() => [pan], [pan]);
  const isDisabled = isLoading;

  const isSpecialTrack = useMemo(() => {
    const upperCaseName = name.trim().toUpperCase();
    return upperCaseName === 'CLICK' || upperCaseName === 'CUES';
  }, [name]);

  const ledColorClass = 'bg-green-500 shadow-[0_0_5px_1px] shadow-green-500/70';

  return (
    <div 
        className={cn(
            "flex flex-col items-center gap-2 p-1 rounded-sm border border-black/50 transition-colors h-48 justify-between",
            isPlaying ? "bg-primary/5" : "bg-input"
        )}
    >
      {/* LEDs & Name */}
       <div className="flex justify-between items-center w-full px-1 pt-1">
        <div className="flex gap-1.5">
          <div className={cn("w-2 h-2 rounded-full transition-colors", isAudible ? ledColorClass : "bg-background/50")} />
        </div>
        <div className={cn("w-12 h-5 text-xs flex items-center justify-center font-bold rounded-sm",
            isLoading && 'text-muted-foreground'
        )}>
             {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>
      </div>

       <VuMeter level={vuMeterLevel} />

       <div className="flex items-center justify-center w-full mt-1">
         <span className={cn(
            "text-xs font-semibold uppercase text-muted-foreground tracking-wider truncate",
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
                  renderRange={false}
                  onValueChange={(val) => onPanChange(val[0])}
                  disabled={isDisabled}
                  className={cn(
                      'w-full',
                      (isDisabled) && 'opacity-50'
                  )}
                  thumbClassName="h-3 w-3 bg-foreground rounded-full"
                  trackClassName="bg-muted-foreground/30"
              />
        </div>
       )}

      <div className="flex gap-1.5 w-full mt-1">
        <Button
          onClick={onMuteToggle}
          variant="secondary"
          disabled={isDisabled}
          className={cn(
            'w-full h-5 text-xs font-bold rounded-sm',
             isMuted ? 'bg-primary text-primary-foreground' : 'bg-secondary',
             isDisabled && '!bg-secondary/30 !text-muted-foreground'
          )}
        >
          M
        </Button>
        <Button
          onClick={onSoloToggle}
          variant="secondary"
          disabled={isDisabled || isSpecialTrack}
          className={cn(
            'w-full h-5 text-xs font-bold rounded-sm',
            isSolo ? 'bg-yellow-500 text-black' : 'bg-secondary',
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
