
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AlignJustify, Library, MoreHorizontal, Music, Loader2, Calendar, X, PlusCircle, DownloadCloud, Trash2, Upload, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSongs, Song, deleteSong } from '@/actions/songs';
import CreateSetlistDialog from './CreateSetlistDialog';
import { getSetlists, Setlist, addSongToSetlist, SetlistSong, removeSongFromSetlist } from '@/actions/setlists';
import { format } from 'date-fns';
import { useToast } from './ui/use-toast';
import UploadSongDialog from './UploadSongDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


interface SongListProps {
  initialSetlist?: Setlist | null;
  onSetlistSelected: (setlist: Setlist | null) => void;
  onLoadTrack: (track: SetlistSong) => void;
}

const SongList: React.FC<SongListProps> = ({ initialSetlist, onSetlistSelected, onLoadTrack }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);

  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoadingSetlists, setIsLoadingSetlists] = useState(false);
  const [setlistsError, setSetlistsError] = useState<string | null>(null);
  
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [isSetlistSheetOpen, setIsSetlistSheetOpen] = useState(false);
  const [isLibrarySheetOpen, setIsLibrarySheetOpen] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    if (initialSetlist) {
      setSelectedSetlist(initialSetlist);
    } else {
      setSelectedSetlist(null);
    }
  }, [initialSetlist]);

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
    onSetlistSelected(setlist);
    setIsSetlistSheetOpen(false);
  }

  const clearSelectedSetlist = () => {
    onSetlistSelected(null);
  }

  const handleAddSongToSetlist = async (song: Song) => {
    if (!selectedSetlist) return;

    const songToAdd: SetlistSong = {
        id: song.id,
        name: song.name,
        url: song.url,
        fileKey: song.fileKey
    }

    if (selectedSetlist.songs.some(s => s.id === song.id)) {
        toast({
            variant: 'destructive',
            title: 'Canción duplicada',
            description: `"${song.name}" ya está en el setlist.`,
        });
        return;
    }
    
    const result = await addSongToSetlist(selectedSetlist.id, songToAdd);

    if (result.success) {
      const updatedSetlist = {
        ...selectedSetlist,
        songs: [...selectedSetlist.songs, songToAdd]
      };
      // Update state locally first for instant UI feedback
      onSetlistSelected(updatedSetlist);
      setSelectedSetlist(updatedSetlist);
      
      // Iniciar la carga/cache de la pista
      onLoadTrack(songToAdd);

      toast({
        title: '¡Canción añadida!',
        description: `"${song.name}" se ha añadido a "${selectedSetlist.name}".`,
      });
      
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'No se pudo añadir la canción.',
      });
    }
  };
  
  const handleRemoveSongFromSetlist = async (songToRemove: SetlistSong) => {
    if (!selectedSetlist) return;

    const result = await removeSongFromSetlist(selectedSetlist.id, songToRemove);

    if (result.success) {
        const updatedSongs = selectedSetlist.songs.filter(s => s.id !== songToRemove.id);
        const updatedSetlist = { ...selectedSetlist, songs: updatedSongs };

        onSetlistSelected(updatedSetlist);
        setSelectedSetlist(updatedSetlist);

        toast({
            title: 'Canción eliminada',
            description: `"${songToRemove.name}" se ha quitado del setlist.`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error al eliminar',
            description: result.error || 'No se pudo quitar la canción.',
        });
    }
  };
  
  const confirmDeleteSong = async () => {
    if (!songToDelete) return;
    setIsDeleting(true);

    const result = await deleteSong(songToDelete);
    if (result.success) {
        toast({
            title: '¡Canción eliminada!',
            description: `"${songToDelete.name}" ha sido eliminada de la biblioteca.`,
        });
        // Remove from local state for instant feedback
        setSongs(prevSongs => prevSongs.filter(s => s.id !== songToDelete.id));
    } else {
        toast({
            variant: 'destructive',
            title: 'Error al eliminar',
            description: result.error || 'No se pudo eliminar la canción.',
        });
    }

    setIsDeleting(false);
    setSongToDelete(null);
  };


  const renderSongList = (forGlobal: boolean = false) => {
    if (isLoadingSongs) {
      return (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (songsError) {
      return <div className="text-destructive text-center">{songsError}</div>;
    }

    if (songs.length > 0) {
      return (
        <div className="space-y-2">
          {songs.map((song) => (
            <div key={song.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent group">
              <Music className="w-5 h-5 text-muted-foreground" />
              <p className="font-semibold text-foreground flex-grow">{song.name}</p>
              
              {!forGlobal && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => setSongToDelete(song)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
              )}

              {selectedSetlist && (
                <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100" onClick={() => handleAddSongToSetlist(song)}>
                    <PlusCircle className="w-5 h-5 text-primary" />
                </Button>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    return <p className="text-muted-foreground text-center">No hay canciones en la biblioteca.</p>;
  };

  return (
    <>
    <AlertDialog open={!!songToDelete} onOpenChange={() => setSongToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción quitará la canción <span className="font-bold text-foreground">"{songToDelete?.name}"</span> de la biblioteca.
                No se eliminará el archivo de audio, por lo que podrá ser añadido de nuevo más tarde si es necesario.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSong} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sí, quitar de la biblioteca
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

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
                    <div key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent group">
                        <Music className="w-5 h-5 text-muted-foreground" />
                        <p className="font-semibold text-foreground flex-grow">{song.name}</p>
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveSongFromSetlist(song)}
                       >
                          <Trash2 className="w-4 h-4" />
                       </Button>
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
                       <SheetContent side="left" className="w-[400px] sm:w-[500px] bg-card/95 p-0">
                          <Tabs defaultValue="local" className="flex flex-col h-full">
                            <TabsList className="m-4">
                              <TabsTrigger value="local" className="gap-2"><Library className="w-4 h-4" /> Biblioteca Local</TabsTrigger>
                              <TabsTrigger value="global" className="gap-2"><Globe className="w-4 h-4"/> Biblioteca Global</TabsTrigger>
                            </TabsList>
                            <TabsContent value="local" className="flex-grow overflow-y-auto px-4">
                               <div className="flex justify-between items-center mb-4">
                                 <h3 className="font-semibold">Añadir a "{selectedSetlist.name}"</h3>
                                 <UploadSongDialog onUploadFinished={handleFetchSongs} />
                               </div>
                               {renderSongList()}
                            </TabsContent>
                            <TabsContent value="global" className="flex-grow overflow-y-auto px-4">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold">Añadir a "{selectedSetlist.name}"</h3>
                              </div>
                              {renderSongList(true)}
                            </TabsContent>
                          </Tabs>
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

        <SheetContent side="left" className="w-[400px] sm:w-[500px] bg-card/95 p-0">
          <Tabs defaultValue="local" className="h-full flex flex-col">
            <TabsList className="m-4">
              <TabsTrigger value="local" className="gap-2"><Library className="w-4 h-4" /> Biblioteca Local</TabsTrigger>
              <TabsTrigger value="global" className="gap-2"><Globe className="w-4 h-4"/> Biblioteca Global</TabsTrigger>
            </TabsList>
            
            <TabsContent value="local" className="flex-grow overflow-y-auto px-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">{selectedSetlist ? `Añadir a "${selectedSetlist.name}"` : 'Biblioteca de Canciones'}</h3>
                  <UploadSongDialog onUploadFinished={handleFetchSongs} />
                </div>
                {renderSongList()}
            </TabsContent>

            <TabsContent value="global" className="flex-grow overflow-y-auto px-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">{selectedSetlist ? `Añadir a "${selectedSetlist.name}"` : 'Biblioteca Global'}</h3>
                </div>
                {renderSongList(true)}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
    </>
  );
};

export default SongList;

    