'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Slider } from './ui/slider';

const topRowKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
const bottomRowKeys = ['1', '2', '3', '4', '5', '6'];

// Placeholder para las URLs de los sonidos de strings.
// En el futuro, esto se llenará dinámicamente.
const soundSources: { [key:string]: string } = {}

const TonicPad = () => {
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  // const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  /*
  useEffect(() => {
    // La lógica de precarga deberá cambiar cuando los pads sean configurables
  }, []);
  
  useEffect(() => {
      // Aplicar volumen y mute a todos los audios
      Object.values(audioRefs.current).forEach(audio => {
          if (audio) {
              audio.volume = isMuted ? 0 : volume / 100;
          }
      })
  }, [volume, isMuted])
  */

  const playSound = (key: string) => {
   /*
    const audio = audioRefs.current[key];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.error("Error al reproducir sonido:", e));
    }
    */
   console.log(`Reproduciendo pad: ${key}`);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col gap-2">
      <div className="grid grid-cols-6 grid-rows-2 gap-1.5 h-32">
        {topRowKeys.map((key) => (
            <Button 
                key={key} 
                variant="secondary"
                className="w-full h-full text-base font-bold bg-secondary hover:bg-accent"
                onClick={() => playSound(key)}
            >
                {key}
            </Button>
        ))}
        {bottomRowKeys.map((key) => (
            <Button 
                key={key} 
                variant="secondary"
                className="w-full h-full text-base font-bold bg-secondary hover:bg-accent"
                onClick={() => playSound(key)}
            >
                {key}
            </Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Slider
            defaultValue={[volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className={cn(
                '[&>span:first-child]:bg-secondary',
                '[&_.bg-primary]:bg-primary [&_.border-primary]:border-primary',
                 (isMuted) && 'opacity-50'
             )}
        />
        <Button 
            variant={isMuted ? 'secondary' : 'ghost'}
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
                'w-8 h-8 text-xs font-bold border',
                isMuted ? 'bg-primary text-primary-foreground' : 'bg-secondary/80'
            )}
        >
            M
        </Button>
        <Button
            variant={isSolo ? 'secondary' : 'ghost'}
            onClick={() => setIsSolo(!isSolo)}
            className={cn(
                'w-8 h-8 text-xs font-bold border',
                isSolo ? 'bg-yellow-500 text-black' : 'bg-secondary/80',
            )}
        >
          S
        </Button>
      </div>
    </div>
  );
};

export default TonicPad;
