'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from "@/components/ui/toaster";
import { saveSong, getSongs } from '@/actions/songs';
import { uploadFileToB2 } from '@/actions/upload';
import { Loader, Play, Pause, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Track from '@/components/Track';

interface Song {
  id: string;
  name: string;
  url: string;
}

interface TrackState {
  isPlaying: boolean;
  volume: number;
}

export default function MultitrackPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [trackStates, setTrackStates] = useState<Record<string, TrackState>>({});
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const fetchSongs = async () => {
    const result = await getSongs();
    if (result.success && result.songs) {
      setSongs(result.songs);
      const initialStates: Record<string, TrackState> = {};
      result.songs.forEach(song => {
        initialStates[song.id] = { isPlaying: false, volume: 1 };
      });
      setTrackStates(initialStates);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const nameInput = formRef.current?.querySelector('input[name="name"]') as HTMLInputElement;
      if (nameInput) {
        // Remove extension and use as name
        nameInput.value = file.name.replace(/\.[^/.]+$/, "");
      }
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUploading(true);

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;
    const songName = formData.get('name') as string;

    if (!file || file.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Archivo no seleccionado',
        description: 'Por favor, selecciona un archivo para subir.',
      });
      setIsUploading(false);
      return;
    }

    // 1. Upload to B2
    const uploadResult = await uploadFileToB2(file);
    if (!uploadResult.success || !uploadResult.url || !uploadResult.fileKey) {
        console.error("Error en la subida a B2:", uploadResult.error);
        toast({
            variant: "destructive",
            title: "Error de Subida",
            description: uploadResult.error || "No se pudo obtener la URL del archivo de B2.",
        });
        setIsUploading(false);
        return;
    }
    
    // 2. Save to Firestore
    const songData = {
        name: songName || file.name.replace(/\.[^/.]+$/, ""),
        url: uploadResult.url,
        fileKey: uploadResult.fileKey
    };

    const saveResult = await saveSong(songData);

    if (saveResult.success && saveResult.song) {
        toast({
            title: '¡Pista Subida!',
            description: `"${saveResult.song.name}" está lista.`,
        });
        formRef.current?.reset();
        
        // Add new song to state
        setSongs(prev => [saveResult.song!, ...prev]);
        setTrackStates(prev => ({
          ...prev,
          [saveResult.song!.id]: { isPlaying: false, volume: 1 }
        }));

    } else {
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: saveResult.error || "No se pudo guardar la información de la canción.",
        });
    }

    setIsUploading(false);
  };
  
  const updateTrackState = (id: string, new_state: Partial<TrackState>) => {
      setTrackStates(prev => ({
          ...prev,
          [id]: { ...prev[id], ...new_state }
      }));
  }
  
  const playAll = () => {
    const newStates = { ...trackStates };
    audioRefs.current.forEach((audio, id) => {
        audio.play();
        newStates[id] = { ...newStates[id], isPlaying: true };
    });
    setTrackStates(newStates);
  }

  const pauseAll = () => {
    const newStates = { ...trackStates };
    audioRefs.current.forEach((audio, id) => {
        audio.pause();
        newStates[id] = { ...newStates[id], isPlaying: false };
    });
    setTrackStates(newStates);
  }
  
  const setAudioRef = useCallback((id: string, el: HTMLAudioElement | null) => {
    if (el) {
        audioRefs.current.set(id, el);
    } else {
        audioRefs.current.delete(id);
    }
  }, []);

  return (
    <>
      <Toaster />
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <header className="p-4 border-b border-border">
          <h1 className="text-3xl font-bold text-primary">Multitrack Player</h1>
        </header>

        <main className="flex-grow p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna de subida y controles */}
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload />
                  Subir Nueva Pista
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form ref={formRef} onSubmit={handleUpload} className="space-y-4">
                  <Input
                    name="name"
                    type="text"
                    placeholder="Nombre de la pista"
                    disabled={isUploading}
                    required
                  />
                  <Input
                    name="file"
                    type="file"
                    accept="audio/*"
                    disabled={isUploading}
                    onChange={handleFileChange}
                    required
                  />
                  <Button type="submit" disabled={isUploading} className="w-full">
                    {isUploading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    {isUploading ? 'Subiendo...' : 'Subir Pista'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Controles Maestros</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                  <Button onClick={playAll} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Play className="mr-2"/>
                    Reproducir Todo
                  </Button>
                  <Button onClick={pauseAll} variant="destructive" className="flex-1">
                    <Pause className="mr-2"/>
                    Detener Todo
                  </Button>
              </CardContent>
            </Card>
          </div>

          {/* Columna de Pistas */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Pistas del Proyecto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {songs.length > 0 ? (
                  songs.map((song) => (
                    <Track 
                      key={song.id}
                      song={song}
                      trackState={trackStates[song.id]}
                      setTrackState={(newState) => updateTrackState(song.id, newState)}
                      setAudioRef={(el) => setAudioRef(song.id, el)}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground">Aún no hay pistas. Sube una para comenzar.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        
        <footer className="p-4 text-center text-sm text-muted-foreground border-t border-border">
          Creado con Firebase Studio
        </footer>
      </div>
    </>
  );
}
