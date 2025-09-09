'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackPadProps {
    name: string;
    color: 'red' | 'cyan';
    hasSong: boolean;
    isMuted?: boolean;
    isSolo?: boolean;
}

const TrackPad: React.FC<TrackPadProps> = ({ name, color, hasSong, isMuted: initialMute = false }) => {
    const [isMuted, setIsMuted] = useState(initialMute);
    const [isSolo, setIsSolo] = useState(false);
    
    // Simulate volume level
    const volume = hasSong ? Math.random() * 80 + 20 : 0;

    return (
        <div className="flex flex-col gap-1 aspect-[3/4]">
             <div className="flex items-center justify-between h-5">
                <h3 className="text-xs font-bold truncate uppercase">{name}</h3>
                {(name === 'CLICK' || name === 'CUES') && <Settings size={12} className="text-muted-foreground" />}
            </div>
            <div className="relative flex-grow rounded-md overflow-hidden">
                 <Button 
                    className={cn(
                        "w-full h-full flex items-end justify-center p-1 rounded-md",
                        {
                            'bg-destructive/80 hover:bg-destructive': color === 'red' && hasSong,
                            'bg-primary/80 hover:bg-primary': color === 'cyan' && hasSong,
                            'bg-secondary/40': !hasSong
                        }
                    )}
                    aria-label={`Play track ${name}`}
                 >
                    {hasSong && <Progress value={volume} className="h-1.5 w-full bg-black/20" indicatorClassName={cn({'bg-destructive-foreground/70': color==='red', 'bg-primary-foreground/70': color === 'cyan'})} />}
                 </Button>
            </div>
            <div className="flex gap-1">
                <Button 
                    variant={isMuted ? 'default' : 'secondary'}
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                        "w-full h-7 text-xs font-bold",
                         { 'bg-primary text-primary-foreground': isMuted }
                    )}
                >
                    M
                </Button>
                <Button 
                    variant={isSolo ? 'default' : 'secondary'}
                    onClick={() => setIsSolo(!isSolo)}
                     className={cn(
                        "w-full h-7 text-xs font-bold",
                         { 'bg-yellow-500 text-black': isSolo }
                    )}
                >
                    S
                </Button>
            </div>
        </div>
    );
};

export default TrackPad;
