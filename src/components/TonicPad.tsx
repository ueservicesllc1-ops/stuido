'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Slider } from './ui/slider';
import { getSamplesByGroup, Sample } from '@/actions/samples';
import { useToast } from './ui/use-toast';
import { Loader2 } from 'lucide-react';
import { getCachedArrayBuffer, cacheArrayBuffer } from '@/lib/audiocache';

const topRowKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
const bottomRowKeys = ['1', '2', '3', '4', '5', '6'];

type ToneModule = typeof import('tone');
type PlayersRef = Record<string, import('tone').Player | null>;

const TonicPad = () => {
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [activePad, setActivePad] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const toneRef = useRef<ToneModule | null>(null);
  const audioPlayersRef = useRef<PlayersRef>({});
  const masterVolumeNodeRef = useRef<import('tone').Volume | null>(null);

  const initializeAudio = useCallback(async () => {
    if (!toneRef.current) {
        toneRef.current = await import('tone');
    }
    const Tone = toneRef.current;
    if (Tone.context.state === 'suspended') {
        await Tone.start();
    }
    if (!masterVolumeNodeRef.current) {
        masterVolumeNodeRef.current = new Tone.Volume().toDestination();
    }
  }, []);

  const loadSamplesForGroup = useCallback(async (groupKey: string) => {
    setIsLoading(true);
    await initializeAudio();
    const Tone = toneRef.current!;

    // Dispose old players
    Object.values(audioPlayersRef.current).forEach(player => player?.dispose());
    audioPlayersRef.current = {};

    const { success, samples, error } = await getSamplesByGroup(groupKey);

    if (!success) {
      toast({ variant: 'destructive', title: 'Error cargando samples', description: error });
      setIsLoading(false);
      return;
    }

    if (!samples || samples.length === 0) {
      setIsLoading(false);
      return;
    }

    const loadPromises = samples.map(async (sample) => {
        if (!sample.url || !sample.padKey) return;
        try {
            let buffer;
            const cachedBuffer = await getCachedArrayBuffer(sample.url);
            if (cachedBuffer) {
                buffer = cachedBuffer;
            } else {
                const proxyUrl = `/api/download?url=${encodeURIComponent(sample.url)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Failed to fetch ${sample.url}`);
                buffer = await response.arrayBuffer();
                await cacheArrayBuffer(sample.url, buffer.slice(0));
            }
            
            const player = new Tone.Player(buffer).connect(masterVolumeNodeRef.current!);
            audioPlayersRef.current[sample.padKey] = player;
        } catch (e) {
            console.error(`Error cargando el sample ${sample.name}:`, e);
            toast({ variant: 'destructive', title: 'Error de carga', description: `No se pudo cargar el sample "${sample.name}".`});
        }
    });

    await Promise.all(loadPromises);
    setIsLoading(false);
  }, [initializeAudio, toast]);

  useEffect(() => {
    if (selectedGroup) {
      loadSamplesForGroup(selectedGroup);
    } else {
       // Si no hay grupo, limpiar los players
       Object.values(audioPlayersRef.current).forEach(player => player?.dispose());
       audioPlayersRef.current = {};
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);
  
  useEffect(() => {
      if (masterVolumeNodeRef.current) {
          masterVolumeNodeRef.current.mute = isMuted;
      }
  }, [isMuted])

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (masterVolumeNodeRef.current) {
        const newDb = value[0] > 0 ? (value[0] / 100) * 20 - 20 : -Infinity;
        masterVolumeNodeRef.current.volume.value = newDb;
    }
  };
  
  const handleGroupSelect = (key: string) => {
    const newGroup = selectedGroup === key ? null : key;
    setSelectedGroup(newGroup);
    setActivePad(null); // Deselecciona el pad activo
  }

  const playSound = (padKey: string) => {
   if (isLoading) return;

   const player = audioPlayersRef.current[padKey];
   if (player) {
       if (player.state === 'started') {
            player.stop();
            setActivePad(null);
       } else {
            player.start();
            setActivePad(padKey);
            player.onstop = () => {
                // Solo quitar el estado activo si este es el pad que se detuvo
                setActivePad(currentPad => currentPad === padKey ? null : currentPad);
            }
       }
   } else {
       toast({ title: "Sin sonido", description: `No hay un sample asignado al pad ${padKey}.`, variant: "destructive" });
   }
  };


  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col gap-2">
      <div className="grid grid-cols-6 grid-rows-2 gap-1.5 h-32">
        {topRowKeys.map((key) => (
            <Button 
                key={key} 
                variant={selectedGroup === key ? 'default' : 'secondary'}
                className={cn(
                    "w-full h-full text-base font-bold",
                    selectedGroup === key 
                        ? "bg-yellow-500 text-black hover:bg-yellow-500/90" 
                        : "bg-secondary hover:bg-accent"
                )}
                onClick={() => handleGroupSelect(key)}
            >
                {key}
            </Button>
        ))}
        {bottomRowKeys.map((key) => (
            <Button 
                key={key} 
                variant="secondary"
                className={cn(
                    "w-full h-full text-base font-bold transition-colors relative",
                    !selectedGroup && "opacity-50 cursor-not-allowed",
                    activePad === key
                        ? "bg-yellow-500 text-black hover:bg-yellow-500/90"
                        : "bg-secondary hover:bg-accent"
                )}
                onClick={() => playSound(key)}
                disabled={!selectedGroup || isLoading}
            >
                {isLoading && selectedGroup ? <Loader2 className="w-5 h-5 animate-spin" /> : key}
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
            disabled={isMuted}
        />
        <Button 
            variant={isMuted ? 'destructive' : 'secondary'}
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
                'w-10 h-8 text-xs font-bold'
            )}
        >
            MUTE
        </Button>
      </div>
    </div>
  );
};

export default TonicPad;
