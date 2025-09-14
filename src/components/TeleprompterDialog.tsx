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
  isPlaying: boolean;
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
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(5);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 4, 96));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 4, 16));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setIsAutoScrolling(false); // Detener scroll al cerrar
    }
  };
  
  // Lógica de resaltado de palabra (no afecta el scroll)
  useEffect(() => {
    if (!syncedLyrics) return;
    
    const adjustedCurrentTime = currentTime - syncOffset;
    const currentWordIndex = syncedLyrics.words.findLastIndex(
      (word) => adjustedCurrentTime >= word.startTime
    );
    
    if (currentWordIndex !== activeWordIndex) {
        setActiveWordIndex(currentWordIndex);
    }
  }, [currentTime, syncedLyrics, syncOffset, activeWordIndex]);


  // Lógica de auto-scroll manual
  const animateScroll = useCallback(() => {
    if (scrollViewportRef.current) {
        const scrollAmount = scrollSpeed / 60; // Pixels per frame at 60fps
        scrollViewportRef.current.scrollTop += scrollAmount;
        animationFrameRef.current = requestAnimationFrame(animateScroll);
    }
  }, [scrollSpeed]);

  useEffect(() => {
    if (isAutoScrolling) {
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAutoScrolling, animateScroll]);
  
  const renderLyrics = () => {
    // Si hay letra sincronizada, la usamos para el resaltado
    if (syncedLyrics && syncedLyrics.words.length > 0) {
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
    
    // Si no, usamos la letra en texto plano
    return (
        <pre 
            className="font-mono text-amber-400 text-center whitespace-pre-wrap p-4 pt-24 pb-24 transition-all"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
        >
            {lyrics || 'No hay letra disponible para esta canción.'}
        </pre>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col bg-black/90 border-amber-400/20">
        <DialogHeader className="p-4 flex-row flex justify-between items-center z-20">
          <DialogTitle className="text-amber-400">{songTitle}</DialogTitle>
          <div className="flex gap-2 items-center">
            {lyrics && (
                <div className="flex items-center gap-3 bg-card/50 p-1.5 rounded-lg w-48">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-amber-400/70 hover:text-amber-400" 
                        onClick={() => setIsAutoScrolling(prev => !prev)}
                    >
                        {isAutoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Slider
                        value={[scrollSpeed]}
                        onValueChange={(val) => setScrollSpeed(val[0])}
                        min={1}
                        max={50}
                        step={1}
                        className="flex-grow"
                        disabled={isAutoScrolling}
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