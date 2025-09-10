'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Slider } from './ui/slider';

const keys = [
    'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F',
    'C', 'G', 'D', 'A', 'E', 'B'
];

// Placeholder para las URLs de los sonidos de strings.
// Deberías reemplazar esto con las URLs reales de tus archivos de audio.
const soundSources: { [key:string]: string } = {
    'Gb': '/sounds/strings/Gb.mp3',
    'Db': '/sounds/strings/Db.mp3',
    'Ab': '/sounds/strings/Ab.mp3',
    'Eb': '/sounds/strings/Eb.mp3',
    'Bb': '/sounds/strings/Bb.mp3',
    'F': '/sounds/strings/F.mp3',
    'C': '/sounds/strings/C.mp3',
    'G': '/sounds/strings/G.mp3',
    'D': '/sounds/strings/D.mp3',
    'A': '/sounds/strings/A.mp3',
    'E': '/sounds/strings/E.mp3',
    'B': '/sounds/strings/B.mp3',
}

const TonicPad = () => {
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false); // La lógica de Solo podría ser más compleja en una app real
  // const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  /*
  useEffect(() => {
    // Precargar los elementos de audio
    keys.forEach(key => {
        if (!audioRefs.current[key]) {
            const audio = new Audio(soundSources[key]);
            audio.preload = 'auto';
            audioRefs.current[key] = audio;
        }
    });
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
      audio.currentTime = 0; // Reinicia el sonido si ya se está reproduciendo
      audio.play().catch(e => console.error("Error al reproducir sonido:", e));
    }
    */
   console.log(`Reproduciendo sonido para: ${key}`);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col gap-2">
      <div className="grid grid-cols-6 grid-rows-2 gap-1.5 h-40">
        {keys.map((key) => (
            <Button 
                key={key} 
                variant="secondary"
                className={cn(
                    "w-full h-full text-base font-bold",
                    key === 'D' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'
                )}
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
