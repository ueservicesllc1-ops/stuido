
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
import { Label } from '@/components/ui/label';
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
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const songFormSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  file: z
    .instanceof(File, { message: 'Se requiere un archivo.' })
    .refine((file) => file.size > 0, 'Se requiere un archivo.')
    .refine((file) => file.size <= MAX_FILE_SIZE, `El tamaño máximo es 50MB.`)
    .refine(
      (file) => ACCEPTED_AUDIO_TYPES.includes(file.type),
      'Formato de audio no soportado.'
    ),
});

type SongFormValues = z.infer<typeof songFormSchema>;

interface UploadSongDialogProps {
  onUploadFinished: () => void;
  // Make trigger a render prop
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
      file: undefined,
    },
  });

  async function onSubmit(data: SongFormValues) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('file', data.file);
      
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Subir nueva canción</DialogTitle>
          <DialogDescription>
            Añade una nueva pista a tu biblioteca. El archivo debe ser MP3, WAV, etc. (máx 50MB).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la canción</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Guitarras Eléctricas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Archivo de Audio</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept={ACCEPTED_AUDIO_TYPES.join(',')}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             onChange(file);
                             // Set name field if empty
                             if (!form.getValues('name')) {
                                form.setValue('name', file.name.split('.').slice(0, -1).join('.'));
                             }
                          }
                        }}
                        {...rest}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
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
