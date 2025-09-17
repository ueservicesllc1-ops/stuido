
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
  isPlaying: boolean;
  isMuted: boolean;
  isSolo: boolean;
  isAudible: boolean;
  volume: number;
  pan: number;
  onVolumeChange: (volume: number) => void;
  onPanChange: (pan: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onPlayToggle: () => void;
  vuMeterLevel: number;
  playbackMode: PlaybackMode;
  isPanVisible: boolean;
}

const FaderTickMarks = React.memo(() => {
    const marks = [
        { value: 95, label: "+5" },
        { value: 75, label: "0" },
        { value: 55, label: "-5" },
        { value: 40, label: "-10" },
        { value: 25, label: "-20" },
        { value: 15, label: "-30" },
        { value: 0, label: "-∞" },
    ];
    return (
        <div className="absolute h-full w-4 pointer-events-none text-[8px] text-muted-foreground/70 bottom-0 left-0 py-2">
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


const TrackPad: React.FC<TrackPadProps> = React.memo(({
  track,
  isLoading,
  isPlaying,
  isMuted,
  isSolo,
  isAudible,
  volume,
  pan,
  onVolumeChange,
  onPanChange,
  onSoloToggle,
  onMuteToggle,
  onPlayToggle,
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

  const isPeaking = useMemo(() => volume >= 95, [volume]);

  const rangeColorClass = useMemo(() => {
    if (isSpecialTrack) return 'bg-destructive';
    return 'bg-primary';
  }, [isSpecialTrack]);

  const ledColorClass = useMemo(() => {
    switch (playbackMode) {
      case 'online':
        return 'bg-blue-500 shadow-[0_0_5px_1px] shadow-blue-500/70';
      case 'offline':
        return 'bg-green-500 shadow-[0_0_5px_1px] shadow-green-500/70';
      default:
        return 'bg-amber-400 shadow-[0_0_5px_1px] shadow-amber-400/70';
    }
  }, [playbackMode]);

  return (
    <div 
        className={cn(
            "flex flex-col items-center gap-2 p-1 rounded-sm border border-black/50 transition-colors",
            isPlaying ? "bg-primary/5" : "bg-input"
        )}
    >
      {/* LEDs & Play Button */}
       <div className="flex justify-between items-center w-full px-1 pt-1">
        <div className="flex gap-1.5">
          <div className={cn("w-2 h-2 rounded-full transition-colors", isAudible ? ledColorClass : "bg-background/50")} />
          <div className={cn("w-2 h-2 rounded-full transition-colors", isPeaking ? "bg-destructive shadow-[0_0_5px_1px] shadow-destructive/70" : "bg-background/50")} />
        </div>
        <Button 
            onClick={onPlayToggle}
            disabled={isDisabled}
            variant={isPlaying ? 'default' : 'secondary'}
            size="sm"
            className={cn(
                "w-12 h-5 text-xs font-bold rounded-sm",
                isPlaying && "bg-primary text-primary-foreground",
                isDisabled && '!bg-secondary/30 !text-muted-foreground'
            )}
        >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'PLAY'}
        </Button>
      </div>

      {/* Fader channel */}
      <div className="relative h-36 w-12 flex justify-center items-center">
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
                ledClassName={ledColorClass}
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
