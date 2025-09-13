
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { updateSong, Song, SongUpdateData, synchronizeLyrics } from '@/actions/songs';
import { Textarea } from './ui/textarea';
import { blobToDataURI } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

const editSongFormSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  artist: z.string().min(2, { message: 'El artista debe tener al menos 2 caracteres.' }),
  lyrics: z.string().optional(),
});

type EditSongFormValues = z.infer<typeof editSongFormSchema>;

interface EditSongDialogProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onSongUpdated: (updatedSong: Song) => void;
}

const EditSongDialog: React.FC<EditSongDialogProps> = ({ song, isOpen, onClose, onSongUpdated }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAlertOpen, setSyncAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<EditSongFormValues>({
    resolver: zodResolver(editSongFormSchema),
    defaultValues: {
      name: song.name,
      artist: song.artist,
      lyrics: song.lyrics || '',
    },
  });

  useEffect(() => {
    if (song) {
        form.reset({
            name: song.name,
            artist: song.artist,
            lyrics: song.lyrics || '',
        });
    }
  }, [song, form]);


  async function onSubmit(data: EditSongFormValues) {
    setIsSaving(true);
    try {
      const updateData: SongUpdateData = {
        name: data.name,
        artist: data.artist,
        lyrics: data.lyrics,
      };
      
      const result = await updateSong(song.id, updateData);

      if (result.success && result.song) {
        toast({
          title: '¡Éxito!',
          description: `La canción "${result.song.name}" ha sido actualizada.`,
        });
        onSongUpdated(result.song);
        onClose();
      } else {
        throw new Error(result.error || 'No se pudo actualizar la canción.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleSyncClick = () => {
    const lyrics = form.getValues('lyrics');
    if (!lyrics?.trim()) {
        toast({
            variant: 'destructive',
            title: 'Falta la letra',
            description: 'Por favor, añade la letra de la canción antes de sincronizar.',
        });
        return;
    }
    setSyncAlertOpen(true);
  }

  const handleFileSelectedForSync = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
        toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Por favor, selecciona un archivo de audio (MP3, WAV, etc.).' });
        return;
    }

    setIsSyncing(true);
    toast({ title: 'Procesando...', description: 'La IA está sincronizando la letra. Esto puede tardar un momento.'});

    try {
        const audioDataUri = await blobToDataURI(file);
        const lyrics = form.getValues('lyrics')!;

        const result = await synchronizeLyrics(song.id, { audioDataUri, lyrics });

        if (result.success && result.song) {
            toast({
                title: '¡Sincronización completa!',
                description: `La letra de "${result.song.name}" ha sido sincronizada.`,
            });
            onSongUpdated(result.song);
        } else {
            throw new Error(result.error || 'Ocurrió un error desconocido durante la sincronización.');
        }

    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error de sincronización',
            description: (error as Error).message,
        });
    } finally {
        setIsSyncing(false);
    }
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Canción</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la canción. Los cambios se guardarán en la biblioteca.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ScrollArea className="h-[450px] pr-6">
                <div className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nombre de la canción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="artist" render={({ field }) => (
                    <FormItem><FormLabel>Artista</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="lyrics" render={({ field }) => (
                    <FormItem>
                        <div className="flex justify-between items-center">
                            <FormLabel>Letra de la canción</FormLabel>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelectedForSync}
                                className="hidden"
                                accept="audio/*"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSyncClick}
                                disabled={isSyncing}
                                className="gap-2"
                            >
                                {isSyncing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Zap className="w-4 h-4" />
                                )}
                                Sincronizar Letra con IA
                            </Button>
                        </div>
                        <FormControl>
                            <Textarea placeholder="[Intro]&#10;[Verso 1]&#10;..." {...field} rows={15} className="bg-input" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )}/>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={syncAlertOpen} onOpenChange={setSyncAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Subir audio para sincronización</AlertDialogTitle>
                <AlertDialogDescription>
                    Para sincronizar la letra, necesitas subir el archivo de audio (MP3, WAV, etc.) de la canción completa. La IA lo analizará para encontrar los tiempos exactos de cada palabra.
                    <br/><br/>
                    <span className="font-bold text-foreground">Importante:</span> El audio no se guardará, solo se usará para el análisis.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
                    Seleccionar Archivo de Audio
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditSongDialog;
