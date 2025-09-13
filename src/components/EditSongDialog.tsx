
'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { updateSong, Song, SongUpdateData } from '@/actions/songs';
import { Textarea } from './ui/textarea';

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
  const { toast } = useToast();

  const form = useForm<EditSongFormValues>({
    resolver: zodResolver(editSongFormSchema),
    defaultValues: {
      name: song.name,
      artist: song.artist,
      lyrics: song.lyrics || '',
    },
  });

  // Asegúrate de que el formulario se resetee cuando la canción a editar cambie.
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

  return (
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
                  <FormItem><FormLabel>Letra de la canción</FormLabel><FormControl><Textarea placeholder="[Intro]&#10;[Verso 1]&#10;..." {...field} rows={15} className="bg-input" /></FormControl><FormMessage /></FormItem>
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
  );
};

export default EditSongDialog;
