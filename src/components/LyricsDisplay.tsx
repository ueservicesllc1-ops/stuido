'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { X, Music4, Youtube } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface LyricsDisplayProps {
  text: string | null;
  songTitle: string | null;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ text, songTitle }) => {
  const [showLyrics, setShowLyrics] = useState(false);

  if (showLyrics) {
    return (
       <div className="bg-black/80 border border-amber-400/20 rounded-lg p-3 h-full flex flex-col">
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <h3 className="font-mono text-amber-400 font-semibold">{songTitle || 'Letra'}</h3>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-amber-400/70 hover:text-amber-400" onClick={() => setShowLyrics(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <ScrollArea className="h-full w-full">
            <pre className="font-mono text-amber-400 text-sm whitespace-pre-wrap [text-shadow:0_0_8px_theme(colors.amber.400)]">
                {text || 'No hay letra disponible para esta canción.'}
            </pre>
          </ScrollArea>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
        <button 
            className="relative rounded-lg overflow-hidden group h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            onClick={() => setShowLyrics(true)}
        >
            <Image
                src="https://picsum.photos/seed/lyrics-btn/600/400"
                alt="Letra de la canción"
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint="sheet music"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="font-bold text-xl text-white drop-shadow-lg flex items-center gap-2">
                    <Music4 />
                    Letra
                </span>
            </div>
        </button>
       <div className="relative rounded-lg overflow-hidden group h-full">
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
      </div>
      <div className="relative rounded-lg overflow-hidden group h-full">
        <Image
          src="https://picsum.photos/seed/lights/600/400"
          alt="Luces"
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          data-ai-hint="stage lights"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
             <span className="font-bold text-xl text-white drop-shadow-lg">Luces</span>
         </div>
      </div>
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
