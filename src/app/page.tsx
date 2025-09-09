'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Music, Database, Server, Upload, Loader } from 'lucide-react';
import { checkB2Connection } from '@/actions/b2';
import { db } from '@/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSignedUploadUrl } from '@/actions/upload';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from "@/components/ui/toaster"

export default function AudioPlayerPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [b2Status, setB2Status] = useState<'pending' | 'success' | 'error'>('pending');
  const [songName, setSongName] = useState('');
  const [songFile, setSongFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // URL de ejemplo. Más adelante podemos hacerla dinámica.
  const audioSrc = 'https://storage.googleapis.com/studiopublic/boom-bap-hip-hop.mp3';

  useEffect(() => {
    // Check Firebase connection
    const checkFirebase = async () => {
      try {
        await getDoc(doc(db, 'health-check', 'status'));
        setFirebaseStatus('success');
      } catch (error: any) {
        if (error.code === 'permission-denied') {
            setFirebaseStatus('success');
        } else {
            console.error('Firebase connection error:', error);
            setFirebaseStatus('error');
        }
      }
    };

    // Check Backblaze B2 connection
    const checkB2 = async () => {
      const { success } = await checkB2Connection();
      if (success) {
        setB2Status('success');
      } else {
        setB2Status('error');
      }
    };

    checkFirebase();
    checkB2();
  }, []);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!songFile || !songName) {
      toast({
        variant: 'destructive',
        title: 'Faltan campos',
        description: 'Por favor, proporciona un nombre y un archivo de canción.',
      });
      return;
    }

    setIsUploading(true);

    try {
      // 1. Get a signed URL from our server
      const { success, url, error } = await getSignedUploadUrl(songFile.name, songFile.type);

      if (!success || !url) {
        throw new Error(error || 'No se pudo obtener la URL de subida.');
      }
      
      // 2. Upload the file to B2 using the signed URL
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: songFile,
        headers: {
          'Content-Type': songFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Error al subir el archivo: ${uploadResponse.statusText}`);
      }

      toast({
        title: '¡Subida exitosa!',
        description: `"${songName}" se ha subido correctamente.`,
      });

      // TODO: Here we should save the song metadata (name, B2 URL) to Firestore.

      // Reset form
      setSongName('');
      setSongFile(null);
      const fileInput = document.getElementById('song-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';


    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error en la subida',
        description: err.message || 'Ocurrió un problema al intentar subir la canción.',
      });
    } finally {
      setIsUploading(false);
    }
  };


  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    if (status === 'success') return 'text-green-500';
    if (status === 'error') return 'text-red-500';
    return 'text-gray-500';
  }

  return (
    <>
      <Toaster />
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <div className="flex items-center gap-2" title={`Firebase: ${firebaseStatus}`}>
            <Database className={getStatusColor(firebaseStatus)} />
            <span className="sr-only">Firebase Status: {firebaseStatus}</span>
        </div>
        <div className="flex items-center gap-2" title={`Backblaze B2: ${b2Status}`}>
            <Server className={getStatusColor(b2Status)} />
            <span className="sr-only">Backblaze B2 Status: {b2Status}</span>
        </div>
      </div>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 gap-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music />
              Reproductor de Audio
            </CardTitle>
            <CardDescription>
              Reproduce la pista de audio cargada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <audio
              ref={audioRef}
              src={audioSrc}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="flex items-center gap-4">
              <Button onClick={togglePlayPause} size="icon" disabled={!duration}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex w-full items-center gap-2">
                  <span className="text-xs font-mono">{formatTime(currentTime)}</span>
                  <Slider
                      value={[currentTime]}
                      max={duration || 1}
                      step={1}
                      onValueChange={handleSliderChange}
                      disabled={!duration}
                  />
                  <span className="text-xs font-mono">{formatTime(duration)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload />
                Subir Canción
              </CardTitle>
              <CardDescription>
                Añade una nueva canción a tu biblioteca.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="song-name">Nombre de la canción</Label>
                  <Input 
                    id="song-name" 
                    type="text" 
                    placeholder="Mi increíble canción" 
                    value={songName}
                    onChange={(e) => setSongName(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="song-file">Archivo de audio</Label>
                  <Input 
                    id="song-file" 
                    type="file" 
                    accept="audio/*" 
                    onChange={(e) => setSongFile(e.target.files ? e.target.files[0] : null)}
                    disabled={isUploading}
                  />
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isUploading ? 'Subiendo...' : 'Subir'}
                </Button>
              </form>
            </CardContent>
          </Card>
      </main>
    </>
  );
}
