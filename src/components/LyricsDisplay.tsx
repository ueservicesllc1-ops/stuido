
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import GraphicEq from './GraphicEq';

interface LyricsDisplayProps {
  lyrics: string | null;
  youtubeUrl: string | null;
  onOpenYouTube: () => void;
  onOpenTeleprompter: () => void;
  eqBands: number[];
  onEqChange: (bandIndex: number, value: number) => void;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ 
    lyrics, 
    youtubeUrl, 
    onOpenYouTube,
    onOpenTeleprompter,
    eqBands,
    onEqChange
}) => {
  return (
    <div className="grid grid-cols-4 gap-4 h-full">
        <div className="relative rounded-lg overflow-hidden h-full bg-card/50 border border-border p-2">
            <GraphicEq bands={eqBands} onBandChange={onEqChange} />
        </div>
       <button 
          className={cn(
            "relative rounded-lg overflow-hidden group h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
            !youtubeUrl && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => youtubeUrl && onOpenYouTube()}
          disabled={!youtubeUrl}
        >
        <Image
          src="https://picsum.photos/seed/youtube-btn/600/400"
          alt="YouTube"
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          data-ai-hint="video play button"
        />
         <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
             <span className="font-bold text-xl text-white drop-shadow-lg flex items-center gap-2">
                <Youtube />
                YouTube
             </span>
         </div>
      </button>
      <button 
        className={cn(
            "relative rounded-lg overflow-hidden group h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
            !lyrics && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => lyrics && onOpenTeleprompter()}
        disabled={!lyrics}
        >
        <Image
          src="https://picsum.photos/seed/lights/600/400"
          alt="Teleprompter"
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          data-ai-hint="stage lights"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
             <span className="font-bold text-xl text-white drop-shadow-lg">Teleprompter</span>
         </div>
      </button>
      <div className="relative rounded-lg overflow-hidden group h-full">
        <Image
          src="https://picsum.photos/seed/extra/600/400"
          alt="Extra"
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          data-ai-hint="guitar pedals"
        />
         <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
             <span className="font-bold text-xl text-white drop-shadow-lg">Extra</span>
         </div>
      </div>
    </div>
  );
};

export default LyricsDisplay;
