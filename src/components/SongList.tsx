
'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { AlignJustify, Library, MoreHorizontal, Music, Loader2, Calendar, X, PlusCircle, DownloadCloud, Trash2, Upload, Globe, ScanSearch, Music2, Hash, Zap, Clock2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSongs, Song, deleteSong, reanalyzeSongStructure } from '@/actions/songs';
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
import { cacheAudio, getCachedAudio } from '@/lib/audiocache';


interface SongListProps {
  initialSetlist?: Setlist | null;
  activeSongId: string | null;
  onSetlistSelected: (setlist: Setlist | null) => void;
  onSongSelected: (songId: string) => void;
  onSongsFetched: (songs: Song[]) => void;
}

const blobToDataURI = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
};

const SongList: React.FC<SongListProps> = ({ initialSetlist, activeSongId, onSetlistSelected, onSongSelected, onSongsFetched }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);

  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoadingSetlists, setIsLoadingSetlists] = useState(false);
  const [setlistsError, setSetlistsError] = useState<string | null>(null);
  
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [isSetlistSheetOpen, setIsSetlistSheetOpen] = useState(false);
  const [isLibrarySheetOpen, setIsLibrarySheetOpen] = useState(false);
  const [isLibrarySheetForEditingOpen, setIsLibrarySheetForEditingOpen] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyzingSongId, setAnalyzingSongId] = useState<string | null>(null);
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
        onSongsFetched(result.songs); // Notificar al padre sobre las canciones
      } else {
        setSongsError(result.error || 'No se pudieron cargar las canciones.');
      }
    } catch (err) {
      setSongsError('Ocurrió un error al buscar las canciones.');
    } finally {
      setIsLoadingSongs(false);
    }
  };
  
  // Cargar canciones al montar el componente
  useEffect(() => {
    handleFetchSongs();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Cuando se añade una canción (que es un grupo de pistas),
    // se añaden todas sus pistas al setlist.
    const tracksToAdd: SetlistSong[] = song.tracks.map(track => ({
      id: `${song.id}_${track.fileKey}`, // Genera un ID único para la pista en el setlist
      name: track.name,
      url: track.url,
      fileKey: track.fileKey,
      songId: song.id, // Referencia a la canción padre
      songName: song.name, // Nombre de la canción padre
    }));

    // Prevenir duplicados
    const existingSongIds = new Set(selectedSetlist.songs.map(s => s.songId));
    if (existingSongIds.has(song.id)) {
        toast({
            variant: 'destructive',
            title: 'Canción duplicada',
            description: `La canción "${song.name}" ya está en el setlist.`,
        });
        return;
    }
    
    // Iterar y añadir cada pista individualmente
    let allAdded = true;
    for (const track of tracksToAdd) {
        const result = await addSongToSetlist(selectedSetlist.id, track);
        if (!result.success) {
            allAdded = false;
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || `No se pudo añadir la pista "${track.name}".`,
            });
            break; 
        }
    }

    if (allAdded) {
      const updatedSetlist = {
        ...selectedSetlist,
        songs: [...selectedSetlist.songs, ...tracksToAdd]
      };
      onSetlistSelected(updatedSetlist);
      setSelectedSetlist(updatedSetlist);
      
      toast({
        title: '¡Canción añadida!',
        description: `"${song.name}" se ha añadido a "${selectedSetlist.name}".`,
      });
    }
  };
  
  const handleRemoveSongFromSetlist = async (songId: string, songName: string) => {
    if (!selectedSetlist) return;

    const tracksToRemove = selectedSetlist.songs.filter(s => s.songId === songId);
    if (tracksToRemove.length === 0) return;

    let allRemoved = true;
    for(const track of tracksToRemove) {
      const result = await removeSongFromSetlist(selectedSetlist.id, track);
      if(!result.success) {
        allRemoved = false;
        toast({
            variant: 'destructive',
            title: 'Error al eliminar',
            description: result.error || `No se pudo quitar la pista "${track.name}".`,
        });
        break;
      }
    }

    if (allRemoved) {
        const updatedSongs = selectedSetlist.songs.filter(s => s.songId !== songId);
        const updatedSetlist = { ...selectedSetlist, songs: updatedSongs };

        onSetlistSelected(updatedSetlist);
        setSelectedSetlist(updatedSetlist);

        toast({
            title: 'Canción eliminada',
            description: `"${songName}" se ha quitado del setlist.`,
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
  
  const handleReanalyze = async (song: Song) => {
    if (!song.tracks || song.tracks.length === 0) {
      toast({ variant: 'destructive', title: 'Sin pistas', description: `"${song.name}" no tiene pistas para analizar.`});
      return;
    }

    const cuesTrack = song.tracks.find(t => t.name.trim().toUpperCase() === 'CUES');
    if (!cuesTrack) {
        toast({ variant: 'destructive', title: 'Sin pista de Cues', description: `"${song.name}" no tiene una pista llamada 'CUES'.`});
        return;
    }

    setAnalyzingSongId(song.id);
    try {
        let audioBlob = await getCachedAudio(cuesTrack.url);

        if (!audioBlob) {
            toast({ title: 'Descargando audio', description: 'La pista de Cues no está en caché, se descargará ahora.' });
            const response = await fetch(`/api/download?url=${encodeURIComponent(cuesTrack.url)}`);
            if (!response.ok) throw new Error('Failed to download Cues track for analysis.');
            audioBlob = await response.blob();
            await cacheAudio(cuesTrack.url, audioBlob);
        }
        
        const audioDataUri = await blobToDataURI(audioBlob);

        const result = await reanalyzeSongStructure(song.id, { audioDataUri });
        if (result.success && result.structure) {
            toast({
                title: 'Análisis completado',
                description: `Se ha analizado la estructura de "${song.name}".`,
            });
            const updatedSongs = songs.map(s => 
                s.id === song.id ? { ...s, structure: result.structure } : s
            );
            setSongs(updatedSongs);
            onSongsFetched(updatedSongs);
        } else {
            throw new Error(result.error || 'Ocurrió un error desconocido durante el análisis.');
        }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error en el análisis',
            description: (error as Error).message,
        });
    } finally {
        setAnalyzingSongId(null);
    }
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
          {songs.map((song) => {
            const hasCuesTrack = song.tracks && song.tracks.some(t => t.name.trim().toUpperCase() === 'CUES');
            const isAnalyzing = analyzingSongId === song.id;

            return (
                <div key={song.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent group">
                <Music className="w-5 h-5 text-muted-foreground" />
                <div className="flex-grow">
                    <p className="font-semibold text-foreground">{song.name}</p>
                    <p className="text-xs text-muted-foreground">{song.artist}</p>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {hasCuesTrack && !forGlobal && (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleReanalyze(song)}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
                        </Button>
                    )}

                    {!forGlobal && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setSongToDelete(song)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}

                    {selectedSetlist && (
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleAddSongToSetlist(song)}>
                            <PlusCircle className="w-5 h-5 text-primary" />
                        </Button>
                    )}
                </div>
                </div>
            );
          })}
        </div>
      );
    }
    
    return <p className="text-muted-foreground text-center">No hay canciones en la biblioteca.</p>;
  };

  const renderSetlist = () => {
    if (!selectedSetlist) return null;
    
    // Agrupar pistas por canción
    const songsInSetlist = selectedSetlist.songs.reduce((acc, track) => {
        // Solo procesar pistas que tengan información de la canción padre
        if (track.songId && track.songName) {
            const songId = track.songId;
            if (!acc[songId]) {
                acc[songId] = {
                    songId: songId,
                    songName: track.songName,
                    tracks: []
                };
            }
            acc[songId].tracks.push(track);
        }
        return acc;
    }, {} as Record<string, { songId: string; songName: string; tracks: SetlistSong[] }>);

    const groupedSongs = Object.values(songsInSetlist);

    if (groupedSongs.length === 0) {
        return (
            <div className="text-center pt-10 text-muted-foreground">
                <p>Este setlist no tiene canciones.</p>
                <Button 
                  variant="link" 
                  className="text-primary mt-2" 
                  onClick={() => {
                    handleFetchSongs();
                    setIsLibrarySheetForEditingOpen(true);
                  }}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Añadir canciones
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-[30px_1fr_40px_50px_32px] items-center gap-x-3 px-2 py-1 text-xs font-medium text-muted-foreground border-b border-border/50">
                <Hash className="w-3 h-3 justify-self-center" />
                <span>Nombre</span>
                <Zap className="w-3 h-3 justify-self-center" />
                <Clock2 className="w-3 h-3 justify-self-center" />
                <span />
            </div>
            {/* Song Rows */}
            <div className="space-y-1 mt-1">
                {groupedSongs.map((songGroup, index) => {
                    const fullSong = songs.find(s => s.id === songGroup.songId);

                    return (
                        <div 
                            key={songGroup.songId} 
                            className={cn(
                                "grid grid-cols-[30px_1fr_40px_50px_32px] items-center gap-x-3 rounded-md group cursor-pointer text-sm",
                                activeSongId === songGroup.songId ? 'bg-primary/20' : 'hover:bg-accent'
                            )}
                            onClick={() => onSongSelected(songGroup.songId)}
                        >
                            <span className="justify-self-center text-muted-foreground">{index + 1}</span>
                            
                            <div className="flex items-center gap-2 py-1.5 min-w-0">
                                <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0">
                                    {fullSong?.albumImageUrl ? (
                                        <Image 
                                            src={fullSong.albumImageUrl} 
                                            alt={songGroup.songName} 
                                            width={32} 
                                            height={32} 
                                            className="rounded object-cover w-8 h-8"
                                        />
                                    ) : (
                                        <Music2 className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                                <span className="font-semibold text-foreground truncate">{songGroup.songName}</span>
                            </div>

                            <span className="justify-self-center text-foreground font-medium">{fullSong?.key ?? '-'}</span>
                            <span className="justify-self-center text-foreground font-medium">{fullSong?.tempo ?? '--'}</span>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation(); // Evita que se seleccione la canción al eliminarla
                                    handleRemoveSongFromSetlist(songGroup.songId, songGroup.songName)
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
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
        
        <Sheet open={isSetlistSheetOpen} onOpenChange={setIsSetlistSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-primary" onClick={handleFetchSetlists}>
                    <AlignJustify className="w-4 h-4" />
                    {selectedSetlist ? 'Setlists' : 'Setlists'}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-card/95">
                <SheetHeader>
                    <SheetTitle>Setlists</SheetTitle>
                    <SheetDescription>
                        Elige un setlist existente o crea uno nuevo.
                    </SheetDescription>
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
      </div>
      <div className="flex-grow space-y-1 overflow-y-auto no-scrollbar">
        {selectedSetlist ? renderSetlist() : <p className="text-muted-foreground text-center pt-10">Selecciona un setlist para ver las canciones.</p>}
      </div>
        <div className="pt-3 mt-auto border-t border-border/50 flex justify-between items-center">
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2" onClick={() => {
              handleFetchSongs();
              setIsLibrarySheetOpen(true);
            }}>
                <Library className="w-4 h-4" />
                Biblioteca
            </Button>

            {selectedSetlist && (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
                  handleFetchSongs();
                  setIsLibrarySheetForEditingOpen(true);
                }}>
                    Editar setlist
                </Button>
            )}
        </div>

      <Sheet open={isLibrarySheetOpen} onOpenChange={setIsLibrarySheetOpen}>
        <SheetContent side="left" className="w-[600px] sm:w-[700px] bg-card/95 p-0">
          <SheetHeader className="p-4 pb-0">
            <SheetTitle>Biblioteca de Canciones</SheetTitle>
            <SheetDescription>
                Gestiona tus canciones o explora la biblioteca global.
            </SheetDescription>
          </SheetHeader>
          <Tabs defaultValue="local" className="h-full flex flex-col pt-2">
            <TabsList className="mx-4">
              <TabsTrigger value="local" className="gap-2"><Library className="w-4 h-4" /> Biblioteca Local</TabsTrigger>
              <TabsTrigger value="global" className="gap-2"><Globe className="w-4 h-4"/> Biblioteca Global</TabsTrigger>
            </TabsList>
            
            <TabsContent value="local" className="flex-grow overflow-y-auto px-4">
                <div className="flex justify-between items-center my-4">
                  <h3 className="font-semibold">Biblioteca de Canciones</h3>
                  <UploadSongDialog onUploadFinished={handleFetchSongs} />
                </div>
                {renderSongList()}
            </TabsContent>

            <TabsContent value="global" className="flex-grow overflow-y-auto px-4">
                <div className="flex justify-between items-center my-4">
                  <h3 className="font-semibold">Biblioteca Global</h3>
                </div>
                {renderSongList(true)}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <Sheet open={isLibrarySheetForEditingOpen} onOpenChange={setIsLibrarySheetForEditingOpen}>
        <SheetContent side="left" className="w-[600px] sm:w-[700px] bg-card/95 p-0">
            <SheetHeader className="p-4 pb-0">
                <SheetTitle>Añadir Canciones a "{selectedSetlist?.name}"</SheetTitle>
                <SheetDescription>
                Explora tus bibliotecas y añade canciones al setlist activo.
                </SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="local" className="flex flex-col h-full pt-2">
            <TabsList className="mx-4">
                <TabsTrigger value="local" className="gap-2"><Library className="w-4 h-4" /> Biblioteca Local</TabsTrigger>
                <TabsTrigger value="global" className="gap-2"><Globe className="w-4 h-4"/> Biblioteca Global</TabsTrigger>
            </TabsList>
            <TabsContent value="local" className="flex-grow overflow-y-auto px-4">
                <div className="flex justify-between items-center my-4">
                <h3 className="font-semibold">Biblioteca de Canciones</h3>
                <UploadSongDialog onUploadFinished={handleFetchSongs} />
                </div>
                {renderSongList()}
            </TabsContent>
            <TabsContent value="global" className="flex-grow overflow-y-auto px-4">
                <div className="flex justify-between items-center my-4">
                <h3 className="font-semibold">Biblioteca Global</h3>
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

    