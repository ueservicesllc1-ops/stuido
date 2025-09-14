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

interface TeleprompterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
  lyrics: string | null;
}

type Speed = 'slow' | 'medium' | 'fast';

const speedValues: Record<Speed, number> = {
  slow: 0.5,
  medium: 1,
  fast: 2,
};

const TeleprompterDialog: React.FC<TeleprompterDialogProps> = ({
  isOpen,
  onClose,
  songTitle,
  lyrics,
}) => {
  const [fontSize, setFontSize] = useState(48);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [speed, setSpeed] = useState<Speed>('medium');

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
    if (!isManuallyScrolling.current && scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop += speedValues[speed];
    }
    animationFrameRef.current = requestAnimationFrame(animateScroll);
  }, [speed]);

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
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-amber-400/70 hover:text-amber-400"
                  onClick={() => setIsAutoScrolling((prev) => !prev)}
                >
                  {isAutoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-md">
                    {(['slow', 'medium', 'fast'] as Speed[]).map((s) => (
                        <Button
                            key={s}
                            variant={speed === s ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setSpeed(s)}
                            className={cn(
                                "h-auto px-2 py-1 text-xs capitalize",
                                speed === s ? 'bg-amber-500/20 text-amber-400' : 'text-amber-400/70'
                            )}
                        >
                            {s === 'slow' && 'Lento'}
                            {s === 'medium' && 'Medio'}
                            {s === 'fast' && 'Rápido'}
                        </Button>
                    ))}
                </div>
              </>
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
