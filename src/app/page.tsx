'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from "@/components/ui/toaster";
import { getSongs } from '@/actions/songs';
import { Loader, Play, Upload, Settings } from 'lucide-react';
import MixerTrack, { type MixerTrackHandle } from '@/components/MixerTrack';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';

interface Song {
  id: string;
  name: string;
  url: string;
}

const initialTracks = [
  { id: 'click', name: 'CLICK', color: 'accent' },
  { id: 'cues', name: 'CUES', color: 'accent' },
  { id: 'ag', name: 'AG' },
  { id: 'bass', name: 'BASS' },
  { id: 'bgvs', name: 'BGVS' },
  { id: 'drums', name: 'DRUMS' },
  { id: 'eg1', name: 'EG 1' },
  { id: 'eg2', name: 'EG 2' },
  { id: 'eg3', name: 'EG 3' },
  { id: 'eg4', name: 'EG 4' },
  { id: 'keys1', name: 'KEYS 1' },
  { id: 'keys2', name: 'KEYS 2' },
  { id: 'keys3', name: 'KEYS 3' },
  { id: 'keys4', name: 'KEYS 4' },
  { id: 'organ', name: 'ORGAN' },
  { id: 'perc', name: 'PERC' },
  { id: 'piano', name: 'PIANO' },
  { id: 'synth', name: 'SYNTH B...' },
];


export default function MultitrackPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const trackRefs = useRef<Map<string, MixerTrackHandle>>(new Map());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchSongs = async () => {
    const result = await getSongs();
    if (result.success && result.songs) {
      setSongs(result.songs);
    } else {
      toast({
        variant: "destructive",
        title: "Error al cargar canciones",
        description: result.error,
      });
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);
  
  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUploading(true);

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;
    const songName = formData.get('name') as string;

    if (!file || file.size === 0 || !songName) {
      toast({
        variant: 'destructive',
        title: 'Faltan campos',
        description: 'Por favor, introduce un nombre y selecciona un archivo.',
      });
      setIsUploading(false);
      return;
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success && result.song) {
        toast({
          title: '¡Pista Subida!',
          description: `"${result.song.name}" está lista.`,
        });
        formRef.current?.reset();
        setSongs(prevSongs => [result.song, ...prevSongs]);
        setIsDialogOpen(false);
      } else {
        throw new Error(result.error || 'Error desconocido en la subida.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error en la subida',
        description: err.message || 'Ocurrió un problema al subir el archivo.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const playAll = () => trackRefs.current.forEach(ref => ref.play());
  const pauseAll = () => trackRefs.current.forEach(ref => ref.pause());

  const getSongForTrack = (trackName: string) => {
    // This allows matching "EG 1" with a song named "eg1" or "EG1"
    const normalizedTrackName = trackName.replace(/\s+/g, '').toLowerCase();
    return songs.find(s => s.name.replace(/\s+/g, '').toLowerCase() === normalizedTrackName);
  }

  return (
    <>
      <Toaster />
      <div className="flex flex-col h-screen bg-background text-foreground p-4 gap-4">
        {/* Header Section */}
        <header className="flex-shrink-0 flex items-center justify-between p-2 bg-card rounded-md">
           <div className="flex items-center gap-2">
             <Button variant="outline" className="font-bold bg-white text-black hover:bg-gray-200">MASTER</Button>
           </div>
           <div className="flex items-center gap-2">
              <Button size="icon" variant="secondary"><Play className="rotate-180" /></Button>
              <Button size="icon" variant="secondary" className="w-20 h-12 text-2xl"><Play /></Button>
              <Button size="icon" variant="secondary"><div className="w-4 h-4 bg-foreground" /></Button>
              <Button size="icon" variant="secondary"><Play /></Button>
           </div>
            <div className="text-2xl font-mono">
              00:00 / 00:00
            </div>
           <div className="flex items-center gap-2">
            <Button variant="outline">MIDI IN</Button>
            <Button variant="outline">OUTS</Button>
            <Button size="icon" variant="ghost"><Settings /></Button>
          </div>
        </header>

        {/* Waveform Display */}
        <div className="flex-shrink-0 h-32 bg-card rounded-md flex items-center justify-center">
            <p className="text-muted-foreground">Waveform Display</p>
        </div>


        {/* Mixer Grid */}
        <main className="flex-grow grid grid-cols-6 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6 gap-x-2 gap-y-4">
          {initialTracks.map(track => {
            const song = getSongForTrack(track.name);
            return (
              <MixerTrack 
                key={track.id} 
                name={track.name} 
                color={track.color as any} 
                song={song}
                ref={ref => {
                  if (ref && song) trackRefs.current.set(song.id, ref);
                  else if (song) trackRefs.current.delete(song.id);
                }}
              />
            );
          })}
        </main>
        
        {/* Footer for Upload */}
        <footer className="flex-shrink-0 p-2 bg-card rounded-md flex items-center justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="primary">
                <Upload className="mr-2"/>
                Añadir Pista al Mezclador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Nueva Pista</DialogTitle>
                <DialogDescription>
                  Sube un archivo de audio para añadirlo como una nueva pista al mezclador. El nombre de la pista debe coincidir con uno de los pads (ej: 'AG', 'Bass', 'EG 1').
                </DialogDescription>
              </DialogHeader>
              <form ref={formRef} onSubmit={handleUpload} className="flex flex-col gap-4">
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="name">Nombre de la Pista</Label>
                    <Input id="name" name="name" type="text" placeholder="Ej: EG 1" disabled={isUploading} required/>
                  </div>
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="file">Archivo de Audio</Label>
                    <Input id="file" name="file" type="file" accept="audio/*" disabled={isUploading} required />
                  </div>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    {isUploading ? 'Subiendo...' : 'Subir Pista'}
                  </Button>
                </form>
            </DialogContent>
          </Dialog>
        </footer>
      </div>
    </>
  );
}
