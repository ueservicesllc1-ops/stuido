'use client';

import React, { useMemo } from 'react';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import VuMeter from './VuMeter';

interface VolumeSliderProps {
    label: string;
    volume: number;
    vuLevel: number;
    onVolumeChange: (volume: number) => void;
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
    label,
    volume,
    vuLevel,
    onVolumeChange,
}) => {
    const isClipping = vuLevel >= 0;
    
    const vuMeterLevel = useMemo(() => {
        const level = Math.max(0, (vuLevel + 48) / 48) * 100;
        return Math.min(level, 100);
    }, [vuLevel]);

    return (
        <div className="flex items-center gap-3 w-full">
            <span className="font-bold text-sm w-16 text-right">{label}</span>
             <div className="relative flex-grow h-10 rounded-md border border-border/50 bg-black/30 p-2 flex items-center gap-4">
                <div className="relative w-full h-full flex items-center">
                    <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={(val) => onVolumeChange(val[0])}
                        className="w-full"
                    />
                </div>
                 <div className="absolute top-1 right-2 flex items-center justify-center gap-1.5 h-3">
                    <div className={cn(
                        "w-2 h-2 rounded-full bg-input transition-colors",
                        vuLevel > -48 && "bg-blue-500 shadow-[0_0_4px_1px] shadow-blue-500/70"
                    )} />
                    <div className={cn(
                        "w-2 h-2 rounded-full bg-input transition-colors",
                        isClipping && "bg-destructive shadow-[0_0_4px_1px] shadow-destructive/70 animate-pulse"
                    )} />
                </div>
            </div>
        </div>
    );
}

export default VolumeSlider;