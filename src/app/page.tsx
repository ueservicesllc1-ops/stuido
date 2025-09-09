'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Repeat,
  Sparkles,
  Loader2,
  X,
  Info,
  Rewind,
} from 'lucide-react';
import type { Panner, Player } from 'tone';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/icons';
import { useToast } from "@/hooks/use-toast"
import { suggestOptimalLoopPoints } from '@/ai/flows/suggest-optimal-loop-points';

interface Track {
  id: string;
  file: File;
  player: Player;
  panner: Panner;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
  loop: boolean;
  aiLoading: boolean;
  aiData?: {
    loopStart: number;
    loopEnd: number;
    confidence: number;
    reason: string;
  };
}

const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target!.result as string);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

export default function MultitrackMixerPage() {
  const [isReady, setIsReady] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [masterVolume, setMasterVolume] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tracksRef = useRef(tracks);
  const Tone = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    if (!isReady || !Tone.current) return;
    Tone.current.Transport.bpm.value = tempo;
  }, [tempo, isReady]);

  useEffect(() => {
    if (!isReady || !Tone.current) return;
    Tone.current.getDestination().volume.value = masterVolume;
  }, [masterVolume, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const checkPlaybackState = () => {
      if (Tone.current) {
        setIsPlaying(Tone.current.Transport.state === 'started');
      }
    };
    const interval = setInterval(checkPlaybackState, 100);
    return () => clearInterval(interval);
  }, [isReady]);

  const initializeAudio = useCallback(async () => {
    if (isReady) return;
    try {
      const ToneModule = await import('tone');
      Tone.current = ToneModule;
      await ToneModule.start();
      Tone.current.getDestination().volume.value = masterVolume;
      Tone.current.Transport.bpm.value = tempo;
      setIsReady(true);
    } catch (error) {
      console.error('Error starting audio context:', error);
      toast({
        title: "Audio Error",
        description: "Could not start audio context. User interaction may be required.",
        variant: "destructive",
      });
    }
  }, [isReady, masterVolume, tempo, toast]);

  const handlePlayPause = () => {
    if (!isReady) initializeAudio();
    if (!Tone.current) return;
    if (Tone.current.Transport.state === 'started') {
      Tone.current.Transport.pause();
    } else {
      Tone.current.Transport.start();
    }
    setIsPlaying(Tone.current.Transport.state === 'started');
  };

  const handleStop = () => {
    if (!Tone.current) return;
    Tone.current.Transport.stop();
    setIsPlaying(false);
  };
  
  const addTrack = useCallback(async (file: File) => {
    if (!Tone.current) return;
    try {
      const url = URL.createObjectURL(file);
      const panner = new Tone.current.Panner(0).toDestination();
      const player = new Tone.current.Player(url).connect(panner);
      
      await new Promise((resolve, reject) => {
        player.onload = resolve;
        player.onerror = reject;
      });

      const newTrack: Track = {
        id: `${file.name}-${Date.now()}`,
        file,
        player,
        panner,
        volume: 0,
        pan: 0,
        isMuted: false,
        isSoloed: false,
        loop: false,
        aiLoading: false,
      };

      setTracks((prev) => [...prev, newTrack]);
    } catch (error) {
      console.error('Error loading track:', error);
      toast({
        title: "Track Load Error",
        description: `Could not load ${file.name}. The file may be corrupt or an unsupported format.`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await initializeAudio();
      const files = event.target.files;
      if (files) {
        for (const file of Array.from(files)) {
          await addTrack(file);
        }
      }
    },
    [addTrack, initializeAudio]
  );
  
  const updateTrackProperty = useCallback((id: string, newProps: Partial<Track>) => {
    setTracks(prev => {
        const newTracks = prev.map(t => (t.id === id ? { ...t, ...newProps } : t));
        tracksRef.current = newTracks; // Immediately update ref
        return newTracks;
    });
  }, []);

  const updateTrackSoloMute = useCallback(() => {
    const currentTracks = tracksRef.current;
    const anySolo = currentTracks.some(t => t.isSoloed);
    currentTracks.forEach(t => {
      t.player.mute = anySolo ? !t.isSoloed : t.isMuted;
    });
  }, []);

  const handleVolumeChange = (id: string, value: number) => {
    const track = tracksRef.current.find((t) => t.id === id);
    if (track) {
      track.player.volume.value = value;
      updateTrackProperty(id, { volume: value });
    }
  };

  const handlePanChange = (id: string, value: number) => {
    const track = tracksRef.current.find((t) => t.id === id);
    if (track) {
      track.panner.pan.value = value;
      updateTrackProperty(id, { pan: value });
    }
  };

  const handleMuteToggle = (id: string) => {
    const track = tracksRef.current.find((t) => t.id === id);
    if (track) {
      updateTrackProperty(id, { isMuted: !track.isMuted });
      setTimeout(updateTrackSoloMute, 0);
    }
  };

  const handleSoloToggle = (id: string) => {
    const track = tracksRef.current.find((t) => t.id === id);
    if (track) {
      updateTrackProperty(id, { isSoloed: !track.isSoloed });
      setTimeout(updateTrackSoloMute, 0);
    }
  };
  
  const handleLoopToggle = (id: string) => {
    const track = tracksRef.current.find((t) => t.id === id);
    if (track) {
      const newLoopState = !track.player.loop;
      track.player.loop = newLoopState;
      updateTrackProperty(id, { loop: newLoopState });
    }
  };

  const removeTrack = (id: string) => {
    const track = tracksRef.current.find((t) => t.id === id);
    if (track) {
      track.player.dispose();
      track.panner.dispose();
      setTracks((prev) => prev.filter((t) => t.id !== id));
    }
  };
  
  const handleAiLoop = async (id: string) => {
    const track = tracksRef.current.find((t) => t.id === id);
    if (!track) return;

    updateTrackProperty(id, { aiLoading: true });

    try {
      const audioDataUri = await fileToDataUri(track.file);
      const result = await suggestOptimalLoopPoints({ audioDataUri, trackName: track.file.name });

      if (result) {
        const targetTrack = tracksRef.current.find((t) => t.id === id);
        if(targetTrack) {
            targetTrack.player.loop = true;
            targetTrack.player.loopStart = result.loopStart;
            targetTrack.player.loopEnd = result.loopEnd;
            updateTrackProperty(id, { loop: true, aiData: result, aiLoading: false });
            toast({
              title: "AI Loop Set!",
              description: `Loop points suggested for ${track.file.name}.`,
            });
        }
      }
    } catch (error) {
      console.error("AI loop suggestion failed:", error);
      toast({
        title: "AI Error",
        description: "Could not suggest loop points.",
        variant: "destructive",
      });
      updateTrackProperty(id, { aiLoading: false });
    }
  };

  if (!isReady) {
    return (
      <div
        className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground cursor-pointer p-4"
        onClick={initializeAudio}
        role="button"
        tabIndex={0}
      >
        <Logo className="h-24 w-24 text-primary mb-4" />
        <h1 className="text-4xl font-bold mb-2 font-headline text-center">Multitrack Mixer</h1>
        <p className="text-lg text-muted-foreground text-center">Click anywhere to start</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground p-4 lg:p-8">
        <main className="max-w-7xl mx-auto space-y-8">
          <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Logo className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold font-headline">Multitrack Mixer</h1>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload Tracks
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="audio/*"
              className="hidden"
            />
          </header>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Master Controls</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <Button variant="outline" size="icon" onClick={handleStop} aria-label="Stop and Rewind">
                  <Rewind />
                </Button>
                <Button size="lg" onClick={handlePlayPause} className="w-24 bg-accent hover:bg-accent/90 text-accent-foreground">
                  {isPlaying ? <Pause /> : <Play />}
                  <span className="ml-2">{isPlaying ? 'Pause' : 'Play'}</span>
                </Button>
              </div>
              <div className="space-y-2">
                <label htmlFor="tempo-slider" className="text-sm font-medium">Tempo: {tempo.toFixed(0)} BPM</label>
                <Slider
                  id="tempo-slider"
                  min={60}
                  max={240}
                  step={1}
                  value={[tempo]}
                  onValueChange={(value) => setTempo(value[0])}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="master-volume-slider" className="text-sm font-medium">Master Volume</label>
                <Slider
                  id="master-volume-slider"
                  min={-60}
                  max={6}
                  step={0.5}
                  value={[masterVolume]}
                  onValueChange={(value) => setMasterVolume(value[0])}
                />
              </div>
            </CardContent>
          </Card>
          
          <Separator />

          <div className="space-y-4">
            {tracks.length > 0 ? (
              tracks.map((track) => (
                <Card key={track.id} className="shadow-md overflow-hidden">
                  <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full md:w-auto min-w-0">
                      <p className="font-semibold truncate" title={track.file.name}>{track.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(track.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                variant={track.isMuted ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => handleMuteToggle(track.id)}
                                className="font-mono w-9"
                                >
                                M
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mute</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                variant={track.isSoloed ? 'secondary' : 'outline'}
                                className={track.isSoloed ? 'bg-primary/80' : ''}
                                size="sm"
                                onClick={() => handleSoloToggle(track.id)}
                                 className="font-mono w-9"
                                >
                                S
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Solo</TooltipContent>
                        </Tooltip>
                    </div>

                    <div className="flex items-center gap-2 w-full md:flex-1">
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                      <Slider
                        min={-40}
                        max={6}
                        step={0.5}
                        value={[track.volume]}
                        onValueChange={(v) => handleVolumeChange(track.id, v[0])}
                        aria-label={`${track.file.name} volume`}
                      />
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex items-center gap-2 w-full md:flex-1">
                      <span className="text-xs font-bold">L</span>
                      <Slider
                        min={-1}
                        max={1}
                        step={0.05}
                        value={[track.pan]}
                        onValueChange={(v) => handlePanChange(track.id, v[0])}
                        aria-label={`${track.file.name} pan`}
                      />
                      <span className="text-xs font-bold">R</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleLoopToggle(track.id)} 
                            className={track.loop ? 'border-accent text-accent' : ''}
                            aria-pressed={track.loop}
                          >
                            <Repeat className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle Loop</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => handleAiLoop(track.id)} disabled={track.aiLoading}>
                            {track.aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>AI Suggest Loop</TooltipContent>
                      </Tooltip>

                      {track.aiData && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Show AI loop analysis">
                                    <Info className="h-4 w-4 text-accent" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">AI Loop Analysis</h4>
                                    <p className="text-sm text-muted-foreground">
                                    AI-suggested loop points for this track.
                                    </p>
                                </div>
                                <div className="grid gap-2 text-sm">
                                    <div className="grid grid-cols-3 items-center gap-4">
                                    <span>Start</span>
                                    <span className="col-span-2 font-mono text-right">{track.aiData?.loopStart.toFixed(2)}s</span>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                    <span>End</span>
                                    <span className="col-span-2 font-mono text-right">{track.aiData?.loopEnd.toFixed(2)}s</span>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                    <span>Confidence</span>
                                    <span className="col-span-2 font-mono text-right">{((track.aiData?.confidence ?? 0) * 100).toFixed(0)}%</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <p className="text-muted-foreground italic">{track.aiData?.reason}</p>
                                </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                       )}
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="destructive" size="icon" onClick={() => removeTrack(track.id)} aria-label={`Remove ${track.file.name}`}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove Track</TooltipContent>
                      </Tooltip>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-border rounded-lg">
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-medium">Your mixer is empty</h3>
                <p className="text-muted-foreground mt-2">Upload some audio tracks to get started.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
