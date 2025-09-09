'use client';
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AlignJustify, Library, MoreHorizontal, Music, Loader2, Calendar, X, PlusCircle } from 'lucide-react';
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
  
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [isSetlistSheetOpen, setIsSetlistSheetOpen] = useState(false);
  const [isLibrarySheetOpen, setIsLibrarySheetOpen] = useState(false);

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

  const handleSetlistSelect = (setlist: Setlist) => {
    setSelectedSetlist(setlist);
    setIsSetlistSheetOpen(false);
  }

  const clearSelectedSetlist = () => {
    setSelectedSetlist(null);
  }


  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-foreground">{selectedSetlist ? selectedSetlist.name : 'Nuevas betel'}</h2>
        
        {selectedSetlist ? (
             <Button variant="ghost" size="sm" className="gap-2 text-primary" onClick={clearSelectedSetlist}>
                <X className="w-4 h-4" />
                Limpiar
             </Button>
        ) : (
            <Sheet open={isSetlistSheetOpen} onOpenChange={setIsSetlistSheetOpen}>
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
                            <div key={setlist.id} className="flex flex-col p-2 rounded-md hover:bg-accent gap-1 cursor-pointer" onClick={() => handleSetlistSelect(setlist)}>
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
        )}
      </div>
      <div className="flex-grow space-y-1 overflow-y-auto">
        {selectedSetlist ? (
            selectedSetlist.songs && selectedSetlist.songs.length > 0 ? (
                selectedSetlist.songs.map((song, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                        <Music className="w-5 h-5 text-muted-foreground" />
                        <p className="font-semibold text-foreground flex-grow">{song.name}</p>
                    </div>
                ))
            ) : (
                <div className="text-center pt-10 text-muted-foreground">
                    <p>Este setlist no tiene canciones.</p>
                    <Sheet open={isLibrarySheetOpen} onOpenChange={setIsLibrarySheetOpen}>
                      <SheetTrigger asChild>
                         <Button variant="link" className="text-primary mt-2" onClick={handleFetchSongs}>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Añadir canciones
                        </Button>
                      </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-card/95">
                          <SheetHeader>
                            <SheetTitle>Añadir a "{selectedSetlist.name}"</SheetTitle>
                          </SheetHeader>
                          <div className="py-4 h-full">
                            {/* Library content goes here */}
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
                                    <div key={song.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                                        <Music className="w-5 h-5 text-muted-foreground" />
                                        <p className="font-semibold text-foreground flex-grow">{song.name}</p>
                                        <Button variant="ghost" size="icon" className="w-8 h-8">
                                            <PlusCircle className="w-5 h-5 text-primary" />
                                        </Button>
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
                </div>
            )
        ) : (
             <p className="text-muted-foreground text-center pt-10">Selecciona un setlist para ver las canciones.</p>
        )}
      </div>
       <Sheet open={isLibrarySheetOpen} onOpenChange={setIsLibrarySheetOpen}>
        <div className="pt-3 mt-auto border-t border-border/50 flex justify-between items-center">
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-2" onClick={handleFetchSongs}>
                  <Library className="w-4 h-4" />
                  Biblioteca
              </Button>
            </SheetTrigger>

            {selectedSetlist && (
                 <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleFetchSongs}>
                        Editar setlist
                    </Button>
                 </SheetTrigger>
            )}
        </div>

        <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-card/95">
          <SheetHeader>
            <SheetTitle>{selectedSetlist ? `Añadir a "${selectedSetlist.name}"` : 'Biblioteca de Canciones'}</SheetTitle>
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
                    <div key={song.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                      <Music className="w-5 h-5 text-muted-foreground" />
                      <p className="font-semibold text-foreground flex-grow">{song.name}</p>
                      {selectedSetlist && (
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                            <PlusCircle className="w-5 h-5 text-primary" />
                        </Button>
                      )}
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
    </div>
  );
};

export default SongList;
