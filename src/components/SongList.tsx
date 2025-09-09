'use client';
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AlignJustify, Library, MoreHorizontal, Music, PlusCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getSongs } from '@/actions/songs';

interface Song {
  id: string;
  name: string;
  url: string;
  fileKey: string;
}

const initialSongs: { title: string; key: string; bpm: string | number }[] = [];

const SongList = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchSongs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSongs();
      if (result.success && result.songs) {
        setSongs(result.songs);
      } else {
        setError(result.error || 'No se pudieron cargar las canciones.');
      }
    } catch (err) {
      setError('Ocurrió un error al buscar las canciones.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-foreground">Nuevas betel</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-primary">
              <AlignJustify className="w-4 h-4" />
              Setlists
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-card/95">
              <SheetHeader>
                <SheetTitle>Setlists</SheetTitle>
              </SheetHeader>
              <div className="py-4 h-full flex flex-col">
                <div className="flex-grow text-center text-muted-foreground pt-10">
                  <p>Aún no has creado un setlist.</p>
                </div>
                <Button className="mt-auto gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Crear nuevo setlist
                </Button>
              </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex-grow space-y-1 overflow-y-auto">
        {initialSongs.map((song, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer',
              index === 0 ? 'bg-primary/20' : 'hover:bg-accent'
            )}
          >
            <span className="text-muted-foreground font-mono text-sm">{index + 1}</span>
            <Music className="w-5 h-5 text-muted-foreground" />
            <div className="flex-grow">
              <p className="font-semibold text-foreground">{song.title}</p>
              <p className="text-xs text-muted-foreground">Original</p>
            </div>
            <Button variant="ghost" size="icon" className="w-6 h-6"><MoreHorizontal className="w-4 h-4" /></Button>
            <span className="w-6 text-center font-mono text-xs text-muted-foreground">{song.key}</span>
            <span className="w-8 text-right font-mono text-xs text-muted-foreground">{song.bpm}</span>
            <div className="w-4 h-4 border-2 border-muted-foreground rounded-sm"></div>
          </div>
        ))}
      </div>
      <div className="pt-3 mt-auto border-t border-border/50 flex justify-between items-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2" onClick={handleFetchSongs}>
                <Library className="w-4 h-4" />
                Library
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-card/95">
            <SheetHeader>
              <SheetTitle>Biblioteca de Canciones</SheetTitle>
            </SheetHeader>
            <div className="py-4 h-full">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                 <div className="text-destructive text-center">{error}</div>
              ) : (
                <div className="space-y-2">
                  {songs.length > 0 ? (
                    songs.map((song) => (
                      <div key={song.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                        <Music className="w-5 h-5 text-muted-foreground" />
                        <p className="font-semibold text-foreground flex-grow">{song.name}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center">No hay canciones en la biblioteca.</p>
                  )}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
         <Button variant="ghost" size="sm" className="text-muted-foreground">
            Edit setlist
        </Button>
      </div>
    </div>
  );
};

export default SongList;
