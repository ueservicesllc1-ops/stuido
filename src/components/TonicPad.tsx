'use client';
import React from 'react';
import { Button } from './ui/button';
import { Power, Lock } from 'lucide-react';
import { Progress } from './ui/progress';

const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const TonicPad = () => {
    return (
        <div className="bg-card p-2 rounded-lg flex gap-2">
            <div className="flex-grow">
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                            <Power size={18} />
                        </Button>
                        <div>
                            <p className="text-sm font-bold">Tonic Pad</p>
                            <p className="text-xs text-muted-foreground">Classic Foundation</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Preset</p>
                        <Button variant="ghost" size="sm" className="h-6 px-1">
                            <Lock size={14} className="mr-1" /> Lock
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-6 gap-1">
                    {keys.map(key => (
                        <Button 
                            key={key} 
                            variant={key === 'D' ? "primary" : "secondary"}
                            className="font-bold aspect-square h-auto w-full text-base"
                        >
                            {key}
                        </Button>
                    ))}
                </div>
            </div>
            <div className="flex flex-col items-center justify-end w-10 gap-1">
                <div className="w-full h-full bg-secondary rounded-md relative overflow-hidden">
                    <Progress value={60} className="absolute bottom-0 w-full h-full" indicatorClassName="bg-primary" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                    <Button variant="secondary" size="sm" className="h-6 w-full font-bold">M</Button>
                    <Button variant="secondary" size="sm" className="h-6 w-full font-bold">S</Button>
                </div>
            </div>
        </div>
    );
}

export default TonicPad;


// Custom progress bar to match the style
const VolumeSlider = () => (
    <div className="w-full h-full bg-secondary rounded-md flex items-end">
        <div className="w-full bg-primary" style={{ height: '60%' }}></div>
    </div>
);
