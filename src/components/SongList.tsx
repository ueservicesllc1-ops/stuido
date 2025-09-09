'use client';
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AlignJustify, Library, MoreHorizontal, Music, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getSongs } from '@/actions/songs';
import CreateSetlistDialog from './CreateSetlistDialog';
import { getSetlists, Setlist } from '@/actions/setlists';
import { format } from 'date-fns';


interface Song {
  id: string;
  name: string;
  url: string;
  fileKey: string;
}

const SongList = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);

  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoadingSetlists, setIsLoadingSetlists] = useState(false);
  const [setlistsError, setSetlistsError] = useState<string | null>(null);

  const handleFetchSongs = async () => {
    setIsLoadingSongs(true);
    setSongsError(null);
    try {
      const result = await getSongs();
      if (result.success && result.songs) {
        setSongs(result.songs);
      } else {
        setSongsError(result.error || 'No se pudieron cargar las canciones.');
      }
    } catch (err) {
      setSongsError('Ocurrió un error al buscar las canciones.');
    } finally {
      setIsLoadingSongs(false);
    }
  };

  const handleFetchSetlists = async () => {
    setIsLoadingSetlists(true);
    setSetlistsError(null);
    // NOTA: El userId está hardcodeado. Se deberá reemplazar con el del usuario autenticado.
    const userId = 'user_placeholder_id'; 
    try {
      const result = await getSetlists(userId);
      if (result.success && result.setlists) {
        setSetlists(result.setlists);
      } else {
        setSetlistsError(result.error || 'No se pudieron cargar los setlists.');
      }
    } catch (err) {
      setSetlistsError('Ocurrió un error al buscar los setlists.');
    } finally {
      setIsLoadingSetlists(false);
    }
  };


  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-foreground">Nuevas betel</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-primary" onClick={handleFetchSetlists}>
              <AlignJustify className="w-4 h-4" />
              Setlists
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-card/95">
              <SheetHeader>
                <SheetTitle>Setlists</SheetTitle>
              </SheetHeader>
              <div className="py-4 h-full flex flex-col">
                <div className="flex-grow space-y-2">
                   {isLoadingSetlists ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : setlistsError ? (
                    <div className="text-destructive text-center">{setlistsError}</div>
                  ) : setlists.length > 0 ? (
                    setlists.map((setlist) => (
                      <div key={setlist.id} className="flex flex-col p-2 rounded-md hover:bg-accent gap-1">
                        <p className="font-semibold text-foreground flex-grow">{setlist.name}</p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <p className="text-xs">{format(setlist.date, 'dd/MM/yyyy')}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center pt-10">Aún no has creado un setlist.</p>
                  )}
                </div>
                <CreateSetlistDialog onSetlistCreated={handleFetchSetlists} />
              </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex-grow space-y-1 overflow-y-auto">
        {/* Los datos de ejemplo se han eliminado */}
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
              {isLoadingSongs ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : songsError ? (
                 <div className="text-destructive text-center">{songsError}</div>
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