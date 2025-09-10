
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
import { Loader2, Upload, FileAudio, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { saveSong, TrackFile } from '@/actions/songs';
import { cn } from '@/lib/utils';


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

type TrackStatus = 'pending' | 'uploading' | 'success' | 'error';

const UploadSongDialog: React.FC<UploadSongDialogProps> = ({ onUploadFinished, trigger }) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [trackStatuses, setTrackStatuses] = useState<Record<number, TrackStatus>>({});
  const [trackErrorMessages, setTrackErrorMessages] = useState<Record<number, string>>({});
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
  
  const resetComponentState = () => {
    form.reset();
    setIsUploading(false);
    setTrackStatuses({});
    setTrackErrorMessages({});
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newTrackStatuses: Record<number, TrackStatus> = {};
      Array.from(files).forEach((file, index) => {
        let trackName = file.name.split('.').slice(0, -1).join('.') || file.name;
        trackName = trackName.replace(/\s/g, '');
        trackName = trackName.substring(0, 6);
        
        const newIndex = fields.length + index;
        append({ file, name: trackName });
        newTrackStatuses[newIndex] = 'pending';
      });
      setTrackStatuses(prev => ({...prev, ...newTrackStatuses}));

      if (!form.getValues('name') && files.length > 0) {
        form.setValue('name', files[0].name.split('.').slice(0, -1).join('.'));
      }
    }
  };

  async function onSubmit(data: SongFormValues) {
    setIsUploading(true);
    const uploadedTracks: TrackFile[] = [];

    for (let i = 0; i < data.tracks.length; i++) {
        const track = data.tracks[i];
        try {
            setTrackStatuses(prev => ({ ...prev, [i]: 'uploading' }));
            
            const formData = new FormData();
            formData.append('file', track.file);
            formData.append('trackName', track.name);
            
            const response = await fetch('/api/upload-track', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || `Error del servidor al subir ${track.name}.`);
            }

            uploadedTracks.push(result.track);
            setTrackStatuses(prev => ({ ...prev, [i]: 'success' }));

        } catch (error) {
            setTrackStatuses(prev => ({ ...prev, [i]: 'error' }));
            setTrackErrorMessages(prev => ({ ...prev, [i]: (error as Error).message }));
            // No detenemos el bucle, permitimos que las demás subidas continúen
        }
    }

    if (uploadedTracks.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Subida fallida',
            description: 'Ninguna de las pistas pudo ser subida. Por favor, inténtalo de nuevo.',
        });
        setIsUploading(false);
        return;
    }
    
    if (uploadedTracks.length < data.tracks.length) {
         toast({
            variant: 'destructive',
            title: 'Subida parcial',
            description: `Se subieron ${uploadedTracks.length} de ${data.tracks.length} pistas. La canción se guardará con las pistas exitosas.`,
        });
    }

    try {
        const songData = {
          name: data.name,
          artist: data.artist,
          tempo: data.tempo,
          key: data.key,
          timeSignature: data.timeSignature,
          tracks: uploadedTracks,
        };
        
        const saveResult = await saveSong(songData);

        if (!saveResult.success || !saveResult.song) {
           throw new Error(saveResult.error || 'No se pudo guardar la canción en la base de datos.');
        }
        
        toast({
          title: '¡Éxito!',
          description: `La canción "${saveResult.song.name}" ha sido guardada.`,
        });

        // Esperar un poco para que el usuario vea los checks verdes antes de cerrar
        setTimeout(() => {
          setOpen(false);
          onUploadFinished();
        }, 1000);


    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Error al guardar la canción',
            description: (error as Error).message,
        });
        setIsUploading(false);
    }
  }
  
  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Upload className="w-4 h-4" />
      Subir Canción
    </Button>
  );
  
  const StatusIcon = ({ status }: { status: TrackStatus }) => {
    switch (status) {
        case 'uploading':
            return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
        case 'success':
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'error':
            return <XCircle className="w-5 h-5 text-destructive" />;
        case 'pending':
        default:
            return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  }


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetComponentState();
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
                        <FormItem><FormLabel>Tonalidad</FormLabel><FormControl><Input placeholder="C" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="timeSignature" render={({ field }) => (
                        <FormItem><FormLabel>Compás</FormLabel><FormControl><Input placeholder="4/4" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                
                <div className="space-y-2">
                   <FormLabel>Archivos de Pistas</FormLabel>
                    <FormControl>
                    <Input
                        type="file"
                        accept={ACCEPTED_AUDIO_TYPES.join(',')}
                        multiple
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    </FormControl>
                </div>

                {fields.length > 0 && (
                  <div className="space-y-2">
                    <FormLabel>Pistas a subir</FormLabel>
                    {fields.map((field, index) => (
                      <div key={field.id}>
                        <div className="flex items-center gap-2 p-2 border rounded-md">
                          <StatusIcon status={trackStatuses[index] || 'pending'} />
                          <FormField
                            control={form.control}
                            name={`tracks.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-grow">
                                <FormControl>
                                  <Input {...field} className="h-8" disabled={isUploading}/>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                           <div className="w-24 text-sm text-muted-foreground truncate">
                              {form.getValues(`tracks.${index}.file.name`)}
                           </div>
                          <Button type="button" variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => remove(index)} disabled={isUploading}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                         {trackStatuses[index] === 'error' && (
                            <p className="text-xs text-destructive mt-1 ml-2">{trackErrorMessages[index]}</p>
                         )}
                         <FormField
                              control={form.control}
                              name={`tracks.${index}.name`}
                              render={() => <FormMessage />}
                          />
                      </div>
                    ))}
                  </div>
                )}
                 <FormField
                    control={form.control}
                    name="tracks"
                    render={() => (
                        <FormItem>
                             {form.formState.errors.tracks && !form.formState.errors.tracks.root && fields.length === 0 && (
                                <FormMessage>{form.formState.errors.tracks.message}</FormMessage>
                            )}
                             {form.formState.errors.tracks?.root?.message && (
                                <FormMessage>{form.formState.errors.tracks.root.message}</FormMessage>
                            )}
                        </FormItem>
                    )}
                 />
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isUploading}>Cancelar</Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? 'Subiendo...' : 'Subir canción'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSongDialog;
