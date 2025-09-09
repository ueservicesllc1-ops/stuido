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
import { Loader, Music, ListMusic, UploadCloud, PlayCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'axios';

interface Song {
  id: string;
  name: string;
  url: string;
}

export default function MultitrackPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchSongs = async () => {
    const result = await getSongs();
    if (result.success && result.songs) {
      setSongs(result.songs);
      if (!currentSong && result.songs.length > 0) {
        setCurrentSong(result.songs[0]);
      }
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

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.url;
      audioRef.current.load();
      audioRef.current.play().catch(e => console.error("La reproducción automática falló", e));
    }
  }, [currentSong]);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUploading(true);

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;
    const songName = formData.get('name') as string;

    if (!file || !songName) {
      toast({
        variant: 'destructive',
        title: 'Faltan campos',
        description: 'Por favor, introduce un nombre y selecciona un archivo.',
      });
      setIsUploading(false);
      return;
    }
    
    // Usamos FormData para enviar el archivo al endpoint de la API
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('name', songName);

    try {
      const response = await axios.post('/api/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data;

      if (result.success && result.song) {
        toast({
          title: '¡Canción Subida!',
          description: `"${result.song.name}" está lista.`,
        });
        formRef.current?.reset();
        
        // Actualizar la lista de canciones y reproducir la nueva
        const updatedSongs = [result.song, ...songs];
        setSongs(updatedSongs);
        setCurrentSong(result.song);

      } else {
        throw new Error(result.error || 'Error desconocido en la subida.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error en la subida',
        description: err.response?.data?.error || err.message || 'Ocurrió un problema al subir el archivo.',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSelectSong = (song: Song) => {
    setCurrentSong(song);
  }

  return (
    <>
      <Toaster />
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 gap-8">
        <div className="w-full max-w-6xl mx-auto">
          <Card className="mb-8">
              <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                      <PlayCircle className="text-accent" size={28}/>
                      Reproductor
                  </CardTitle>
                   <CardDescription>
                     {currentSong ? `Reproduciendo: ${currentSong.name}` : "Selecciona una canción de la lista"}
                   </CardDescription>
              </CardHeader>
              <CardContent>
                  <audio ref={audioRef} controls className="w-full" src={currentSong?.url}>
                      Tu navegador no soporta el elemento de audio.
                  </audio>
              </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadCloud />
                  Subir Nueva Canción
                </CardTitle>
                <CardDescription>
                  Sube una pista para añadirla a tu proyecto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={formRef} onSubmit={handleUpload} className="flex flex-col gap-4">
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="name">
                      <Music className="inline-block mr-2 h-4 w-4" />
                      Nombre de la Canción
                    </Label>
                    <Input 
                      id="name"
                      name="name" 
                      type="text" 
                      placeholder="Ej: Pista de Guitarra" 
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
                    {isUploading ? 'Subiendo...' : 'Subir'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListMusic />
                        Lista de Reproducción
                    </CardTitle>
                    <CardDescription>
                        Canciones guardadas en tu proyecto.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        {songs.length > 0 ? (
                             <ul className="flex flex-col gap-2 pr-4">
                                {songs.map((song) => (
                                    <li key={song.id} 
                                        className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${currentSong?.id === song.id ? 'bg-accent/20 border-accent' : 'hover:bg-muted/50'}`}
                                        onClick={() => handleSelectSong(song)}
                                    >
                                        <div>
                                            <p className="font-semibold truncate">{song.name}</p>
                                        </div>
                                        {currentSong?.id === song.id && <PlayCircle className="text-accent" />}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Aún no has subido ninguna canción.</p>
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
