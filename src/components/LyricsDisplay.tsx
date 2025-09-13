
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { X, Music4, Youtube, ZoomIn, ZoomOut } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import type { LyricsSyncOutput } from '@/ai/flows/lyrics-synchronization';

interface LyricsDisplayProps {
  lyrics: string | null;
  syncedLyrics: LyricsSyncOutput | null;
  currentTime: number;
  isPlaying: boolean;
  youtubeUrl: string | null;
  onOpenYouTube: () => void;
  syncOffset: number;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ 
    lyrics, 
    syncedLyrics,
    currentTime,
    isPlaying,
    youtubeUrl, 
    onOpenYouTube,
    syncOffset = 0
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 48));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 12));

  // Determine current word and scroll into view
  useEffect(() => {
      if (!isPlaying || !syncedLyrics || !showLyrics) return;

      const adjustedCurrentTime = currentTime - syncOffset;

      const currentWordIndex = syncedLyrics.words.findIndex(
          (word) => adjustedCurrentTime >= word.startTime && adjustedCurrentTime <= word.endTime
      );

      if (currentWordIndex !== -1) {
          const wordElement = wordRefs.current.get(currentWordIndex);
          if (wordElement && wordElement !== activeWordRef.current) {
              wordElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
              });
              // @ts-ignore
              activeWordRef.current = wordElement;
          }
      }
  }, [currentTime, isPlaying, showLyrics, syncedLyrics, syncOffset]);

  const renderLyrics = () => {
    const adjustedCurrentTime = currentTime - syncOffset;
    // Karaoke Mode
    if (syncedLyrics && syncedLyrics.words.length > 0) {
        wordRefs.current.clear();
        const currentWordIndex = syncedLyrics.words.findIndex(word => adjustedCurrentTime >= word.startTime && adjustedCurrentTime < word.endTime);

        return (
            <p 
                className="font-mono text-center whitespace-pre-wrap p-4 pt-16 transition-all"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
            >
                {syncedLyrics.words.map((word, index) => {
                    const isActive = isPlaying && currentWordIndex === index;
                    return (
                        <span
                            key={index}
                            ref={(el) => {
                                if (el) wordRefs.current.set(index, el);
                            }}
                            className={cn(
                                'transition-colors duration-150',
                                isActive ? 'text-amber-400' : 'text-muted-foreground/70'
                            )}
                        >
                            {word.word}{' '}
                        </span>
                    );
                })}
            </p>
        );
    }
    
    // Static Text Mode
    return (
        <pre 
            className="font-mono text-amber-400 text-center whitespace-pre-wrap p-4 pt-16 transition-all"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
        >
            {lyrics || 'No hay letra disponible para esta canción.'}
        </pre>
    );
  }

  if (showLyrics) {
    return (
       <div className="relative bg-black/80 border border-amber-400/20 rounded-lg h-full flex flex-col">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-20 w-8 h-8 text-amber-400/70 hover:text-amber-400" onClick={() => setShowLyrics(false)}>
              <X className="w-5 h-5" />
          </Button>

          <div className="absolute top-2 left-2 z-20 flex gap-2 items-center bg-black/50 p-1 rounded-lg">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-amber-400/70 hover:text-amber-400" onClick={handleZoomIn}>
                <ZoomIn className="w-5 h-5" />
            </Button>
             <Button variant="ghost" size="icon" className="w-8 h-8 text-amber-400/70 hover:text-amber-400" onClick={handleZoomOut}>
                <ZoomOut className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="h-full w-full rounded-lg">
            {renderLyrics()}
          </ScrollArea>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
        <button 
            className={cn(
                "relative rounded-lg overflow-hidden group h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                !lyrics && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => lyrics && setShowLyrics(true)}
            disabled={!lyrics}
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
