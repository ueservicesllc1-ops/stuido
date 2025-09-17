
'use client';

import React from 'react';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';

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
    const hasSignal = vuLevel > -Infinity;

    return (
        <div className="flex items-center gap-3 w-full">
            <span className="font-bold text-sm w-16 text-right">{label}</span>
            <div className="relative flex-grow h-10 rounded-md border border-border/50 bg-black/30 p-2 pl-3 pr-3">
                 <div className="absolute top-1/2 left-2 -translate-y-1/2 flex items-center justify-center gap-1.5 mb-1 h-3">
                    <div className={cn(
                        "w-2 h-2 rounded-full bg-input transition-colors",
                        hasSignal && "bg-green-500 shadow-[0_0_4px_1px] shadow-green-500/70 animate-pulse"
                    )} />
                    <div className={cn(
                        "w-2 h-2 rounded-full bg-input transition-colors",
                         "bg-blue-500 shadow-[0_0_4px_1px] shadow-blue-500/70"
                    )} />
                    <div className={cn(
                        "w-2 h-2 rounded-full bg-input transition-colors",
                        isClipping && "bg-destructive shadow-[0_0_4px_1px] shadow-destructive/70 animate-pulse"
                    )} />
                </div>
                <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={(val) => onVolumeChange(val[0])}
                    className="h-full w-full"
                    trackClassName="bg-input h-1.5"
                    rangeClassName="bg-gradient-to-r from-blue-500 to-green-500"
                    thumbClassName="h-5 w-3 rounded-sm bg-foreground border-none cursor-pointer"
                />
            </div>
        </div>
    );
}

export default VolumeSlider;
