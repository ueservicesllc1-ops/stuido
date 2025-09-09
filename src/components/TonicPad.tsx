'use client';
import React from 'react';
import { Button } from './ui/button';
import { Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';

const keys = [
    'C', 'Db', 'D', 'Eb', 'E', 'F',
    'Gb', 'G', 'Ab', 'A', 'Bb', 'B'
]

const TonicPad = () => {
  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col h-full gap-2">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground"><Power className="w-5 h-5" /></Button>
            <div>
                <p className="text-xs text-muted-foreground">Tonic Pad</p>
                <p className="font-bold text-foreground">Classic Foundation</p>
            </div>
         </div>
         <div className="text-right">
             <p className="text-xs text-muted-foreground">Preset</p>
             <p className="font-bold text-foreground">Lock</p>
         </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5 flex-grow">
        {keys.map((key, index) => (
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
