'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X, ZoomIn, ZoomOut, Play, Pause } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import type { LyricsSyncOutput } from '@/ai/flows/lyrics-synchronization';
import { Slider } from './ui/slider';

interface TeleprompterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
  lyrics: string | null;
  syncedLyrics: LyricsSyncOutput | null;
  currentTime: number;
  isPlaying: boolean; // Is the main song playing?
  syncOffset: number;
}

const TeleprompterDialog: React.FC<TeleprompterDialogProps> = ({ 
    isOpen,
    onClose,
    songTitle,
    lyrics, 
    syncedLyrics,
    currentTime,
    isPlaying,
    syncOffset = 0
}) => {
  const [fontSize, setFontSize] = useState(48);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [isManualAutoScrolling, setIsManualAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(5);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout>();

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 4, 96));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 4, 16));

  // Reset states when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setIsManualAutoScrolling(false);
    }
  };

  // --- Karaoke Mode Logic (when main song is playing) ---
  useEffect(() => {
    if (!isPlaying || !syncedLyrics) {
      if (!isPlaying) setActiveWordIndex(-1); // Reset highlight when song stops
      return;
    }

    // Karaoke mode is active, disable manual auto-scroll if it was on
    if (isManualAutoScrolling) setIsManualAutoScrolling(false);

    const adjustedCurrentTime = currentTime - syncOffset;
    const currentWordIndex = syncedLyrics.words.findLastIndex(
      (word) => adjustedCurrentTime >= word.startTime
    );
    
    if (currentWordIndex !== activeWordIndex) {
        setActiveWordIndex(currentWordIndex);
    }
  }, [currentTime, isPlaying, syncedLyrics, syncOffset, isManualAutoScrolling, activeWordIndex]);

  // Effect to scroll the highlighted word into view in Karaoke mode
  useEffect(() => {
    if (isPlaying && activeWordIndex > -1 && !isUserInteracting) {
      const wordElement = wordRefs.current.get(activeWordIndex);
      if (wordElement) {
        wordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeWordIndex, isPlaying, isUserInteracting]);


  // --- Manual Auto-Scroll Logic ---
  const animateScroll = useCallback(() => {
    if (scrollViewportRef.current && !isUserInteracting) {
        const scrollAmount = scrollSpeed / 60; // Pixels per 60fps frame
        scrollViewportRef.current.scrollTop += scrollAmount;
        animationFrameRef.current = requestAnimationFrame(animateScroll);
    }
  }, [scrollSpeed, isUserInteracting]);

  useEffect(() => {
    // Start or stop manual scrolling animation
    if (isManualAutoScrolling && !isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    // Cleanup function to stop animation when component unmounts or deps change
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isManualAutoScrolling, isPlaying, animateScroll]);
  
  // --- User Interaction Logic ---
  const handleUserScroll = useCallback(() => {
    setIsUserInteracting(true);
    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 2500); // User has 2.5 seconds of manual control before auto-scroll resumes
  }, []);
  
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.addEventListener('scroll', handleUserScroll, { passive: true });
      return () => viewport.removeEventListener('scroll', handleUserScroll);
    }
  }, [isOpen, handleUserScroll]); // Re-attach listener if dialog re-opens
  

  const renderLyrics = () => {
    if (syncedLyrics && syncedLyrics.words.length > 0) {
        wordRefs.current.clear();
        return (
            <p 
                className="font-mono text-center whitespace-pre-wrap p-4 pt-24 pb-24 transition-all"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
            >
                {syncedLyrics.words.map((word, index) => {
                    const isActive = isPlaying && activeWordIndex === index;
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
    
    // Fallback to plain text
    return (
        <pre 
            className="font-mono text-amber-400 text-center whitespace-pre-wrap p-4 pt-24 pb-24 transition-all"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
        >
            {lyrics || 'No hay letra disponible para esta canción.'}
        </pre>
    );
  }

  const showAutoScrollControls = !isPlaying && !!lyrics;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col bg-black/90 border-amber-400/20">
        <DialogHeader className="p-4 flex-row flex justify-between items-center z-20">
          <DialogTitle className="text-amber-400">{songTitle}</DialogTitle>
          <div className="flex gap-2 items-center">
             {showAutoScrollControls && (
                <div className="flex items-center gap-3 bg-card/50 p-1.5 rounded-lg w-48">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-amber-400/70 hover:text-amber-400" 
                        onClick={() => setIsManualAutoScrolling(prev => !prev)}
                    >
                        {isManualAutoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Slider
                        value={[scrollSpeed]}
                        onValueChange={(val) => setScrollSpeed(val[0])}
                        min={1}
                        max={50}
                        step={1}
                        className="flex-grow"
                    />
                </div>
            )}
            <Button variant="ghost" size="icon" className="w-8 h-8 text-amber-400/70 hover:text-amber-400" onClick={handleZoomIn}>
                <ZoomIn className="w-5 h-5" />
            </Button>
             <Button variant="ghost" size="icon" className="w-8 h-8 text-amber-400/70 hover:text-amber-400" onClick={handleZoomOut}>
                <ZoomOut className="w-5 h-5" />
            </Button>
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-amber-400/70 hover:text-amber-400">
                    <X className="w-5 h-5" />
                </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex-grow w-full h-full -mt-16">
            <ScrollArea className="h-full w-full rounded-b-lg" viewportRef={scrollViewportRef}>
                {renderLyrics()}
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeleprompterDialog;
