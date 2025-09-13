
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { X, Music4, Youtube, ZoomIn, ZoomOut, Play, Pause } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Slider } from './ui/slider';


interface LyricsDisplayProps {
  text: string | null;
  songTitle: string | null;
  youtubeUrl: string | null;
  onOpenYouTube: () => void;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ text, songTitle, youtubeUrl, onOpenYouTube }) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(5); // Valor inicial de velocidad (ej. 1 a 10)
  
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number>();

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 48));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 12));

  const toggleScroll = () => {
    setIsScrolling(prev => !prev);
  }

  useEffect(() => {
    const scrollViewport = scrollViewportRef.current;
    if (!scrollViewport) return;

    const animateScroll = () => {
      // La velocidad se traduce a píxeles por segundo (ej. speed 5 -> 25px/s)
      const pixelsPerFrame = (scrollSpeed * 5) / 60;
      scrollViewport.scrollTop += pixelsPerFrame;
      if (scrollViewport.scrollTop < scrollViewport.scrollHeight - scrollViewport.clientHeight) {
        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
      } else {
        setIsScrolling(false); // Detener cuando llega al final
      }
    };

    if (isScrolling) {
      scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    } else {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    }

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [isScrolling, scrollSpeed]);

  // Reset scroll on close
  useEffect(() => {
    if (!showLyrics) {
      setIsScrolling(false);
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = 0;
      }
    }
  }, [showLyrics])

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
            <div className="w-px h-6 bg-amber-400/20 mx-1"></div>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-amber-400/70 hover:text-amber-400" onClick={toggleScroll}>
                {isScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Slider
                value={[scrollSpeed]}
                onValueChange={(val) => setScrollSpeed(val[0])}
                min={1}
                max={20}
                step={1}
                className="w-24"
             />
          </div>

          <ScrollArea className="h-full w-full rounded-lg" viewportRef={scrollViewportRef}>
            <pre 
                className="font-mono text-amber-400 text-center whitespace-pre-wrap [text-shadow:0_0_8px_theme(colors.amber.400)] p-4 pt-16 transition-all"
                style={{ fontSize: `${fontSize}px` }}
            >
                {text || 'No hay letra disponible para esta canción.'}
            </pre>
          </ScrollArea>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
        <button 
            className={cn(
                "relative rounded-lg overflow-hidden group h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                !text && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => text && setShowLyrics(true)}
            disabled={!text}
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
