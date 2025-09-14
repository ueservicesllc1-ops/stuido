
'use client';

import React from 'react';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';

interface GraphicEqProps {
  bands: number[]; // Array de 5 valores (0-100)
  onBandChange: (bandIndex: number, value: number) => void;
}

const bandFrequencies = ['60', '250', '1k', '4k', '8k'];

const GraphicEq: React.FC<GraphicEqProps> = ({ bands, onBandChange }) => {
  return (
    <div className="flex justify-around items-end h-full w-full gap-3 px-2 pb-1">
      {bands.map((bandValue, index) => (
        <div key={index} className="flex flex-col items-center justify-end h-full w-full gap-1">
          <div className="relative h-full w-4 flex justify-center">
            <Slider
              value={[bandValue]}
              max={100}
              step={1}
              orientation="vertical"
              onValueChange={(val) => onBandChange(index, val[0])}
              className="h-full w-4 [&>span:first-child]:bg-transparent"
              trackClassName="bg-input"
              rangeClassName="bg-gradient-to-t from-destructive via-yellow-500 to-green-500"
              thumbClassName="h-3 w-5 rounded-sm bg-foreground border-none cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{bandFrequencies[index]}</span>
        </div>
      ))}
    </div>
  );
};

export default GraphicEq;
