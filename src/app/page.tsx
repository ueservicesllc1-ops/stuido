'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from "@/components/ui/toaster";
import { getSongs } from '@/actions/songs';
import { Loader, Music, ListMusic, UploadCloud, Play, Pause } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Track, { type TrackHandle } from '@/components/Track';

interface Song {
  id: string;
  name: string;
  url: string;
}

export default function MultitrackPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const trackRefs = useRef<Map<string, TrackHandle>>(new Map());

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
        
        // Actualizar la lista de canciones
        setSongs(prevSongs => [result.song, ...prevSongs]);

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
  
  const playAll = () => {
    trackRefs.current.forEach(ref => ref.play());
  };

  const pauseAll = () => {
    trackRefs.current.forEach(ref => ref.pause());
  };


  return (
    <>
      <Toaster />
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 gap-8">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadCloud />
                  Subir Nueva Pista
                </CardTitle>
                <CardDescription>
                  Sube un archivo de audio para añadirlo como una nueva pista.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={formRef} onSubmit={handleUpload} className="flex flex-col gap-4">
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="name">
                      <Music className="inline-block mr-2 h-4 w-4" />
                      Nombre de la Pista
                    </Label>
                    <Input 
                      id="name"
                      name="name" 
                      type="text" 
                      placeholder="Ej: Guitarra Principal" 
                      disabled={isUploading}
                      required
                    />
                  </div>
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="file">
                       <UploadCloud className="inline-block mr-2 h-4 w-4" />
                       Archivo de Audio
                    </Label>
                    <Input 
                      id="file"
                      name="file"
                      type="file" 
                      accept="audio/*"
                      disabled={isUploading}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    {isUploading ? 'Subiendo...' : 'Subir Pista'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ListMusic />
                          Pistas del Proyecto
                        </div>
                        <div className="flex gap-2">
                          <Button size="icon" variant="outline" onClick={playAll} title="Reproducir Todo">
                            <Play />
                          </Button>
                          <Button size="icon" variant="outline" onClick={pauseAll} title="Pausar Todo">
                            <Pause />
                          </Button>
                        </div>
                    </CardTitle>
                    <CardDescription>
                        Controla cada pista individualmente o todas a la vez.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        {songs.length > 0 ? (
                             <ul className="flex flex-col gap-4 pr-4">
                                {songs.map((song) => (
                                    <li key={song.id}>
                                       <Track
                                          ref={ref => {
                                            if (ref) {
                                              trackRefs.current.set(song.id, ref);
                                            } else {
                                              trackRefs.current.delete(song.id);
                                            }
                                          }}
                                          song={song}
                                        />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Aún no has subido ninguna pista.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
