
'use client';
import React, { useMemo } from 'react';
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

const FaderTickMarks = React.memo(() => {
    // Escala logarítmica más precisa para un fader
    const marks = [
        { value: 100, label: "+10" },
        { value: 87.5, label: "+5" },
        { value: 75, label: "0" },
        { value: 65, label: "-5" },
        { value: 58, label: "-10" },
        { value: 45, label: "-20" },
        { value: 35, label: "-30" },
        { value: 0, label: "-∞" },
    ];
    return (
        <div className="absolute top-0 left-0 h-full w-4 py-2 pointer-events-none text-[8px] text-muted-foreground/70">
            {marks.map((mark) => (
                <div key={mark.label} className="absolute w-full flex items-center" style={{bottom: `${mark.value}%`}}>
                    <span className="absolute -left-3.5 text-center w-3">{mark.label}</span>
                    <div className="w-1.5 h-px bg-muted-foreground/50" />
                </div>
            ))}
        </div>
    );
});
FaderTickMarks.displayName = 'FaderTickMarks';


const TrackPad: React.FC<React.memoExoticComponent<any>> = React.memo(({
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
  
  const sliderValue = useMemo(() => [volume], [volume]);
  const panSliderValue = useMemo(() => [pan], [pan]);
  const isDisabled = isLoading;

  const isSpecialTrack = useMemo(() => {
    const upperCaseName = name.trim().toUpperCase();
    return upperCaseName === 'CLICK' || upperCaseName === 'CUES';
  }, [name]);

  const rangeColorClass = useMemo(() => {
    if (isSpecialTrack) return 'bg-destructive';
    return 'bg-primary';
  }, [isSpecialTrack]);

  return (
    <div className="flex flex-col items-center gap-2 bg-input p-1 rounded-sm border border-black/50">
      {/* Fader channel */}
      <div className="relative h-48 w-12 flex justify-center items-center">
         {isDisabled && (
           <div className="absolute inset-0 flex justify-center items-center bg-card/80 z-20 rounded-lg">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
           </div>
         )}
         
        {/* Fader Slot */}
        <div className="relative h-full w-full flex justify-center">
            <FaderTickMarks />
            <Slider
                value={sliderValue}
                max={100}
                step={1}
                orientation="vertical"
                onValueChange={(val) => onVolumeChange(val[0])}
                disabled={isDisabled}
                className={cn(
                  'h-full w-4',
                  (isSolo || isMuted || isDisabled) && 'opacity-60'
                )}
                trackClassName="bg-transparent"
                rangeClassName={cn(rangeColorClass)}
                thumbClassName={cn((isSolo || isMuted) && 'opacity-50')}
            />
            {name.trim().toUpperCase() !== 'CLICK' && <VuMeter level={vuMeterLevel} />}
        </div>
      </div>

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
                  onValueChange={(val) => onPanChange(val[0])}
                  disabled={isDisabled}
                  className={cn(
                      'w-full h-4',
                      (isDisabled) && 'opacity-50'
                  )}
                  trackClassName="h-0.5"
                  thumbClassName="h-3 w-3 rounded-full border-none bg-muted-foreground"
              />
        </div>
       )}

      <div className="flex gap-1.5 w-full mt-1">
        <Button
          onClick={onMuteToggle}
          variant="secondary"
          disabled={isDisabled}
          className={cn(
            'w-full h-7 text-xs font-bold rounded-sm',
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
            'w-full h-7 text-xs font-bold rounded-sm',
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
