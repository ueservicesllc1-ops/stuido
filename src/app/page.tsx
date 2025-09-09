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
import { Toaster } from "@/components/ui/toaster"
import { saveSong, getSongs } from '@/actions/songs';
import { Loader, Music, ListMusic, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Song {
  id: string;
  name: string;
  artist: string;
}

export default function FirestorePage() {
  const [isSaving, setIsSaving] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

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

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const artist = formData.get('artist') as string;

    if (!name || !artist) {
      toast({
        variant: 'destructive',
        title: 'Faltan campos',
        description: 'Por favor, completa el nombre y el artista.',
      });
      setIsSaving(false);
      return;
    }

    try {
      const result = await saveSong({ name, artist });

      if (result.success) {
        toast({
          title: '¡Guardado!',
          description: `"${name}" de ${artist} se ha guardado en Firestore.`,
        });
        formRef.current?.reset();
        await fetchSongs(); // Refresh the list
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err.message || 'Ocurrió un problema al intentar guardar en Firestore.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Toaster />
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music />
                  Añadir Nueva Canción
                </CardTitle>
                <CardDescription>
                  Guarda la información de una canción directamente en Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={formRef} onSubmit={handleSave} className="flex flex-col gap-4">
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="name">
                      <Music className="inline-block mr-2 h-4 w-4" />
                      Nombre de la canción
                    </Label>
                    <Input 
                      id="name"
                      name="name" 
                      type="text" 
                      placeholder="Mi increíble canción" 
                      disabled={isSaving}
                      required
                    />
                  </div>
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="artist">
                       <User className="inline-block mr-2 h-4 w-4" />
                       Artista
                    </Label>
                    <Input 
                      id="artist"
                      name="artist"
                      type="text" 
                      placeholder="El mejor artista"
                      disabled={isSaving}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Guardando...' : 'Guardar en Firestore'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListMusic />
                        Canciones Guardadas
                    </CardTitle>
                    <CardDescription>
                        Lista de canciones desde Firestore.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        {songs.length > 0 ? (
                             <ul className="flex flex-col gap-2 pr-4">
                                {songs.map((song) => (
                                    <li key={song.id} className="flex items-center justify-between p-2 rounded-md border">
                                        <div>
                                            <p className="font-semibold truncate">{song.name}</p>
                                            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No hay canciones en la base de datos.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </main>
    </>
  );
}
