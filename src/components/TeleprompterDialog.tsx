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
import { ScrollArea, ScrollBar } from './ui/scroll-area';
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
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [isManualAutoScrolling, setIsManualAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(5); // Píxeles por segundo
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationRef = useRef<number>();
  const manualScrollTimeoutRef = useRef<NodeJS.Timeout>();


  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 4, 96));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 4, 16));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setIsManualAutoScrolling(false); // Detiene el autoscroll al cerrar
    }
  };

  // --- Lógica de Sincronización con Karaoke (cuando la canción está en play) ---
  useEffect(() => {
    if (!isPlaying || !syncedLyrics) {
      if(!isPlaying) setActiveWordIndex(-1);
      return;
    }

    // El modo karaoke está activo, desactivamos el autoscroll manual
    if (isManualAutoScrolling) setIsManualAutoScrolling(false);

    const adjustedCurrentTime = currentTime - syncOffset;

    const currentWordIndex = syncedLyrics.words.findLastIndex(
      (word) => adjustedCurrentTime >= word.startTime
    );
    
    setActiveWordIndex(currentWordIndex);

  }, [currentTime, isPlaying, syncedLyrics, syncOffset, isManualAutoScrolling]);


  useEffect(() => {
    // Solo hacer scroll automático si el usuario no está interactuando manualmente
    if (isPlaying && activeWordIndex !== -1 && !isUserScrolling) {
      const wordElement = wordRefs.current.get(activeWordIndex);
      if (wordElement && wordElement !== activeWordRef.current) {
        wordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        activeWordRef.current = wordElement;
      }
    }
  }, [activeWordIndex, isPlaying, isUserScrolling]);


  // --- Lógica de Auto-Scroll Manual ---
  const animateScroll = useCallback(() => {
      if (scrollViewportRef.current) {
          const scrollAmount = scrollSpeed / 60; // Dividido por 60fps
          scrollViewportRef.current.scrollTop += scrollAmount;
          scrollAnimationRef.current = requestAnimationFrame(animateScroll);
      }
  }, [scrollSpeed]);

  useEffect(() => {
    if (isManualAutoScrolling && !isPlaying) {
        // Inicia la animación
        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    } else {
        // Detiene la animación
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = undefined;
        }
    }

    return () => {
        // Cleanup: se asegura de detener la animación al desmontar
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
        }
    };
  }, [isManualAutoScrolling, animateScroll, isPlaying]);
  
  const handleManualScroll = () => {
      setIsUserScrolling(true);
      if (manualScrollTimeoutRef.current) {
          clearTimeout(manualScrollTimeoutRef.current);
      }
      manualScrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
      }, 2000); // 2 segundos de inactividad para reanudar autoscroll
  };
  
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.addEventListener('scroll', handleManualScroll);
      return () => viewport.removeEventListener('scroll', handleManualScroll);
    }
  }, [isOpen]);

  const renderLyrics = () => {
    if (syncedLyrics && syncedLyrics.words.length > 0) {
        wordRefs.current.clear();
        return (
            <p 
                className="font-mono text-center whitespace-pre-wrap p-4 pt-16 transition-all"
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
    
    return (
        <pre 
            className="font-mono text-amber-400 text-center whitespace-pre-wrap p-4 pt-16 transition-all"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
        >
            {lyrics || 'No hay letra disponible para esta canción.'}
        </pre>
    );
  }

  // No mostrar controles de autoscroll si el karaoke está activo
  const showAutoScrollControls = !isPlaying && !!lyrics;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col bg-black/90 border-amber-400/20">
        <DialogHeader className="p-4 flex-row flex justify-between items-center z-20">
          <DialogTitle className="text-amber-400">{songTitle}</DialogTitle>
          <div className="flex gap-2 items-center">
             {showAutoScrollControls && (
                <div className="flex items-center gap-3 bg-card/50 p-1.5 rounded-lg w-48">
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-amber-400/70 hover:text-amber-400" onClick={() => setIsManualAutoScrolling(!isManualAutoScrolling)}>
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
