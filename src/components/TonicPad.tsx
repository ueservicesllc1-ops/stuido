'use client';
import React from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';

const keys = [
    'Gb', 'G', 'Ab', 'A', 'Bb', 'B'
]

const TonicPad = () => {
  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1.5">
        {keys.map((key) => (
            <Button 
                key={key} 
                variant="secondary"
                className={cn(
                    "w-full aspect-square text-base font-bold",
                    key === 'D' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'
                )}
            >
                {key}
            </Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-full h-8 flex flex-col justify-end">
            <Progress value={75} className="h-1.5" indicatorClassName="bg-primary" />
        </div>
        <Button variant="secondary" className="w-8 h-8 text-xs font-bold border bg-secondary/80">M</Button>
        <Button variant="secondary" className="w-8 h-8 text-xs font-bold border bg-secondary/80">S</Button>
      </div>
    </div>
  );
};

export default TonicPad;
