
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Upload, FileAudio, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from './ui/scroll-area';

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp3'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const trackSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'Se requiere un archivo.')
    .refine((file) => file.size <= MAX_FILE_SIZE, `El tamaño máximo es 50MB.`)
    .refine(
      (file) => ACCEPTED_AUDIO_TYPES.includes(file.type),
      'Formato de audio no soportado.'
    ),
  name: z.string().min(1, { message: 'El nombre de la pista es requerido.' }),
});

const songFormSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  artist: z.string().min(2, { message: 'El artista debe tener al menos 2 caracteres.' }),
  tempo: z.coerce.number().min(40, { message: 'El tempo debe ser al menos 40 BPM.' }).max(300, { message: 'El tempo no puede ser mayor a 300 BPM.' }),
  key: z.string().min(1, { message: 'La tonalidad es requerida.' }),
  timeSignature: z.string().min(3, { message: 'El compás es requerido.' }),
  tracks: z.array(trackSchema).min(1, { message: 'Debes subir al menos una pista.' }),
});

type SongFormValues = z.infer<typeof songFormSchema>;

interface UploadSongDialogProps {
  onUploadFinished: () => void;
  trigger?: React.ReactNode;
}

const UploadSongDialog: React.FC<UploadSongDialogProps> = ({ onUploadFinished, trigger }) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      name: '',
      artist: '',
      tempo: 120,
      key: 'C',
      timeSignature: '4/4',
      tracks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tracks',
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const trackName = file.name.split('.').slice(0, -1).join('.') || file.name;
        append({ file, name: trackName });
      });
      // Set song name from first file if empty
      if (!form.getValues('name') && files.length > 0) {
        form.setValue('name', files[0].name.split('.').slice(0, -1).join('.'));
      }
    }
  };

  async function onSubmit(data: SongFormValues) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('artist', data.artist);
      formData.append('tempo', String(data.tempo));
      formData.append('key', data.key);
      formData.append('timeSignature', data.timeSignature);
      
      data.tracks.forEach(track => {
        formData.append('files', track.file);
        formData.append('trackNames', track.name);
      });
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: '¡Éxito!',
          description: `La canción "${result.song.name}" ha sido subida.`,
        });
        setOpen(false);
        form.reset();
        onUploadFinished();
      } else {
        throw new Error(result.error || 'Error desconocido al subir.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al subir',
        description: (error as Error).message,
      });
    } finally {
      setIsUploading(false);
    }
  }
  
  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Upload className="w-4 h-4" />
      Subir Canción
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        form.reset();
      }
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir nueva canción (grupo de pistas)</DialogTitle>
          <DialogDescription>
            Añade los metadatos de la canción y sube todos los archivos de las pistas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[450px] pr-6">
              <div className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nombre de la canción</FormLabel><FormControl><Input placeholder="Ej: Gracia Sublime es" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="artist" render={({ field }) => (
                  <FormItem><FormLabel>Artista</FormLabel><FormControl><Input placeholder="Ej: Elevation Worship" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="tempo" render={({ field }) => (
                        <FormItem><FormLabel>Tempo (BPM)</FormLabel><FormControl><Input type="number" placeholder="120" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="key" render={({ field }) => (
                        <FormItem><FormLabel>Tonalidad</FormLabel><FormControl><Input placeholder="Ej: G" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="timeSignature" render={({ field }) => (
                        <FormItem><FormLabel>Compás</FormLabel><FormControl><Input placeholder="4/4" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                
                <FormField
                  control={form.control}
                  name="tracks"
                  render={() => (
                    <FormItem>
                      <FormLabel>Archivos de Pistas</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept={ACCEPTED_AUDIO_TYPES.join(',')}
                          multiple
                          onChange={handleFileChange}
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {fields.length > 0 && (
                  <div className="space-y-2">
                    <FormLabel>Pistas a subir</FormLabel>
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                        <FileAudio className="w-5 h-5 text-muted-foreground" />
                        <FormField
                          control={form.control}
                          name={`tracks.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input {...field} className="h-8"/>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => remove(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Subir canción
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSongDialog;
