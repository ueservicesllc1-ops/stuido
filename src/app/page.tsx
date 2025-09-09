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
import { Play, Pause, Music, Database, Server } from 'lucide-react';
import { checkB2Connection } from '@/actions/b2';
import { db } from '@/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';

export default function AudioPlayerPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [b2Status, setB2Status] = useState<'pending' | 'success' | 'error'>('pending');

  // URL de ejemplo. Más adelante podemos hacerla dinámica.
  const audioSrc = 'https://storage.googleapis.com/studiopublic/boom-bap-hip-hop.mp3';

  useEffect(() => {
    // Check Firebase connection
    const checkFirebase = async () => {
      try {
        // A simple read operation to a non-existent doc to check permissions and connectivity
        await getDoc(doc(db, 'health-check', 'status'));
        setFirebaseStatus('success');
      } catch (error: any) {
        // Firestore throws permission-denied if rules are set, but that still means connection is ok.
        // We'll count it as success if it's a permission error, otherwise as a failure.
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
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
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
      </main>
    </>
  );
}
