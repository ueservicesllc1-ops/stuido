
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import type { LyricsSyncOutput } from '@/ai/flows/lyrics-synchronization';

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
  
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 4, 96));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 4, 16));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isPlaying || !syncedLyrics) {
      if(isPlaying) setActiveWordIndex(-1);
      return;
    }

    const adjustedCurrentTime = currentTime - syncOffset;

    const currentWordIndex = syncedLyrics.words.findLastIndex(
      (word) => adjustedCurrentTime >= word.startTime
    );
    
    setActiveWordIndex(currentWordIndex);

  }, [currentTime, isPlaying, syncedLyrics, syncOffset]);


  useEffect(() => {
    if (activeWordIndex !== -1 && isPlaying) {
      const wordElement = wordRefs.current.get(activeWordIndex);
      if (wordElement && wordElement !== activeWordRef.current) {
        wordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        activeWordRef.current = wordElement;
      }
    }
  }, [activeWordIndex, isPlaying]);


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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col bg-black/90 border-amber-400/20">
        <DialogHeader className="p-4 flex-row flex justify-between items-center z-20">
          <DialogTitle className="text-amber-400">{songTitle}</DialogTitle>
          <div className="flex gap-2 items-center">
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
            <ScrollArea className="h-full w-full rounded-b-lg">
                {renderLyrics()}
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeleprompterDialog;
