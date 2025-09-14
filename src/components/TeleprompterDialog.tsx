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

interface TeleprompterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
  lyrics: string | null;
}

const SCROLL_SPEED = 1; // Velocidad fija (píxeles por frame)

const TeleprompterDialog: React.FC<TeleprompterDialogProps> = ({
  isOpen,
  onClose,
  songTitle,
  lyrics,
}) => {
  const [fontSize, setFontSize] = useState(48);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const isManuallyScrolling = useRef(false);
  const manualScrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleZoomIn = () => setFontSize((prev) => Math.min(prev + 4, 96));
  const handleZoomOut = () => setFontSize((prev) => Math.max(prev - 4, 16));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setIsAutoScrolling(false); 
    }
  };

  const animateScroll = useCallback(() => {
    if (isManuallyScrolling.current) return;

    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop += SCROLL_SPEED;
    }
    
    animationFrameRef.current = requestAnimationFrame(animateScroll);
  }, []);

  useEffect(() => {
    if (isOpen && isAutoScrolling) {
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
  }, [isAutoScrolling, isOpen, animateScroll]);
  
  const handleManualScroll = () => {
    isManuallyScrolling.current = true;
    if (isAutoScrolling) {
        setIsAutoScrolling(false);
    }
    if (manualScrollTimeoutRef.current) clearTimeout(manualScrollTimeoutRef.current);
    manualScrollTimeoutRef.current = setTimeout(() => {
        isManuallyScrolling.current = false;
    }, 2000); 
  };
  
  const renderLyrics = () => {
    return (
      <pre
        className="font-mono text-amber-400 text-center whitespace-pre-wrap p-4 pt-24 pb-24 transition-all"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
      >
        {lyrics || 'No hay letra disponible para esta canción.'}
      </pre>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col bg-black/90 border-amber-400/20">
        <DialogHeader className="p-4 flex-row flex justify-between items-center z-20">
          <DialogTitle className="text-amber-400">{songTitle}</DialogTitle>
          <div className="flex gap-2 items-center">
            {lyrics && (
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-amber-400/70 hover:text-amber-400"
                onClick={() => setIsAutoScrolling((prev) => !prev)}
              >
                {isAutoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-amber-400/70 hover:text-amber-400"
              onClick={handleZoomIn}
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-amber-400/70 hover:text-amber-400"
              onClick={handleZoomOut}
            >
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
          <ScrollArea 
            className="h-full w-full rounded-b-lg" 
            viewportRef={scrollViewportRef}
            onWheelCapture={handleManualScroll}
            onTouchStartCapture={handleManualScroll}
          >
            {renderLyrics()}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeleprompterDialog;
