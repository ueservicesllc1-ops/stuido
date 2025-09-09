'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface FaderProps {
  label: string;
}

const Fader: React.FC<FaderProps> = ({ label }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-mono uppercase text-muted-foreground">{label}</span>
      <div className="flex items-center justify-center gap-2 h-40">
        <Slider
          defaultValue={[50]}
          max={100}
          step={1}
          orientation="vertical"
          className="w-2 h-full"
        />
        <div className="w-10 h-full bg-input rounded-md flex items-end">
            <div className="bg-secondary h-1/2 w-full rounded-md border-t-2 border-black" />
        </div>
      </div>
      <div className="flex flex-col gap-1 w-full">
         <Button variant="secondary" size="sm" className="h-6 text-xs">P</Button>
         <Button variant="secondary" size="sm" className="h-6 text-xs">B</Button>
         <Button variant="secondary" size="sm" className="h-6 text-xs">L</Button>
         <Button variant="secondary" size="sm" className="h-6 text-xs">M</Button>
      </div>
    </div>
  );
};

export default Fader;
