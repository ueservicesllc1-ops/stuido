
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import Image from 'next/image';
import { getSetlists, Setlist, SetlistSong } from '@/actions/setlists';
import { cacheAudio, getCachedAudio } from '@/lib/audiocache';

export type PlaybackMode = 'online' | 'offline';

const DawPage = () => {
  const [tracks, setTracks] = useState<SetlistSong[]>([]);
  const [soloTracks, setSoloTracks] = useState<string[]>([]);
  const [mutedTracks, setMutedTracks] = useState<string[]>([]);
  const [initialSetlist, setInitialSetlist] = useState<Setlist | null>(null);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);

  // --- Audio State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement | null}>({});
  const animationFrameRef = useRef<number>();

  const [volumes, setVolumes] = useState<{ [key: string]: number }>({});
  const [trackUrls, setTrackUrls] = useState<{[key: string]: string}>({});
  const [loadingTracks, setLoadingTracks] = useState<string[]>([]);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('online');
  const [cachedTracks, setCachedTracks] = useState<Set<string>>(new Set());
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

  const getPrio = (trackName: string) => {
    const upperCaseName = trackName.trim().toUpperCase();
    if (upperCaseName === 'CLICK') return 1;
    if (upperCaseName === 'CUES') return 2;
    return 3;
  };
  
  const activeTracks = tracks
    .filter(t => t.songId === activeSongId)
    .sort((a, b) => {
        const prioA = getPrio(a.name);
        const prioB = getPrio(b.name);
        if (prioA !== prioB) {
            return prioA - prioB;
        }
        return a.name.localeCompare(b.name);
    });

  // Carga el último setlist usado al iniciar
  useEffect(() => {
    const fetchLastSetlist = async () => {
      const userId = 'user_placeholder_id';
      const result = await getSetlists(userId);
      if (result.success && result.setlists && result.setlists.length > 0) {
        setInitialSetlist(result.setlists[0]);
      }
    };
    fetchLastSetlist();
  }, []);

  // Actualiza las pistas cuando cambia el setlist inicial
  useEffect(() => {
    if (initialSetlist && initialSetlist.songs) {
      const allTracks = initialSetlist.songs;
      setTracks(allTracks);
      
      if (allTracks.length > 0) {
        // Seleccionar la primera canción del setlist por defecto
        const firstSongId = allTracks[0].songId;
        if (firstSongId) {
            setActiveSongId(firstSongId);
        }
      } else {
        setActiveSongId(null);
      }
      
      setTrackUrls({});
      setLoadingTracks([]);
      setCachedTracks(new Set()); // Reset cache status on setlist change
      
    } else {
      setTracks([]);
      setActiveSongId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSetlist]);

  // Se detiene la reproducción al cambiar de modo
  useEffect(() => {
    handleStop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackMode]);


  // Prepara las pistas cuando cambia la canción activa
  useEffect(() => {
    if (activeSongId) {
      const tracksForSong = tracks.filter(t => t.songId === activeSongId);
      tracksForSong.forEach(prepareAndAssignUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongId, playbackMode]);
  
  // Chequea si las pistas de la canción activa están listas para reproducirse
  useEffect(() => {
      if (!activeSongId) {
          setIsReadyToPlay(false);
          return;
      }
      if (activeTracks.length === 0) {
          setIsReadyToPlay(true);
          return;
      }

      const readinessPromises = activeTracks.map(track => {
          return new Promise<void>((resolve, reject) => {
              const url = trackUrls[track.id];
              // Si no hay URL (p.ej. offline y no cacheado), no puede estar listo.
              if (!url) {
                   reject(new Error(`No URL for track ${track.name}`));
                   return;
              }

              const audio = audioRefs.current[track.id];
              // Si el audio no existe aún, tampoco está listo.
              if (!audio) {
                  reject(new Error(`No audio element for track ${track.name}`));
                  return;
              }
              
              const onCanPlayThrough = () => {
                  cleanup();
                  resolve();
              };

              const onError = (e: Event) => {
                  cleanup();
                  const errorDetails = (e.target as HTMLAudioElement).error;
                  console.error(`Error loading audio source for ${track.name}:`, errorDetails?.message || 'Unknown error', e);
                  // Rechazamos la promesa para que el Promise.all falle
                  reject(new Error(`Failed to load ${track.name}`));
              };
              
              const cleanup = () => {
                  audio.removeEventListener('canplaythrough', onCanPlayThrough);
                  audio.removeEventListener('error', onError);
              }

              // Si ya está listo, resolver de inmediato
              if (audio.readyState >= 4) { // HAVE_ENOUGH_DATA
                  resolve();
                  return;
              }

              audio.addEventListener('canplaythrough', onCanPlayThrough);
              audio.addEventListener('error', onError);
          });
      });

      // Se considera listo para reproducir si TODAS las promesas se resuelven
      Promise.all(readinessPromises).then(() => {
          setIsReadyToPlay(true);
      }).catch(error => {
          console.error("One or more tracks failed to become ready, playback disabled.", error.message);
          setIsReadyToPlay(false);
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackUrls, activeSongId]); // Depende de que las URLs se hayan asignado y de la canción activa


  // Inicializa volúmenes y refs de audio cuando cambian las pistas
  useEffect(() => {
    const newVolumes: { [key: string]: number } = {};
    const newAudioRefs: {[key:string]: HTMLAudioElement | null} = {};

    tracks.forEach(track => {
      newVolumes[track.id] = volumes[track.id] ?? 75;
      if (!audioRefs.current[track.id]) {
          const audio = new Audio();
          audio.preload = 'auto'; // Cambiado a auto para que el navegador decida
          audio.addEventListener('loadedmetadata', () => {
              if (isFinite(audio.duration)) {
                setDuration(prev => Math.max(prev, audio.duration));
              }
          });
          newAudioRefs[track.id] = audio;
      } else {
          newAudioRefs[track.id] = audioRefs.current[track.id];
      }
    });

    setVolumes(newVolumes);
    audioRefs.current = newAudioRefs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  // Forzar la carga del audio cuando la URL cambia
   useEffect(() => {
    Object.keys(trackUrls).forEach(trackId => {
        const audio = audioRefs.current[trackId];
        const url = trackUrls[trackId];
        if (audio && url && audio.src !== url) {
            audio.src = url;
            audio.load(); // Llama a load explícitamente
        }
    });
  }, [trackUrls]);


  // --- Lógica de Carga y Caché ---
  
  const prepareAndAssignUrl = async (track: SetlistSong) => {
    const cachedBlob = await getCachedAudio(track.url);
    if(cachedBlob) {
      setCachedTracks(prev => new Set(prev).add(track.id));
      const localUrl = URL.createObjectURL(cachedBlob);
      setTrackUrls(prev => ({...prev, [track.id]: localUrl}));
    } else {
      // No está en caché
      setCachedTracks(prev => {
        const newSet = new Set(prev);
        newSet.delete(track.id);
        return newSet;
      });

      if (playbackMode === 'online') {
        // En modo online, usamos la URL del proxy
        setTrackUrls(prev => ({...prev, [track.id]: `/api/download?url=${encodeURIComponent(track.url)}`}));
      } else {
        // En modo offline, la URL queda vacía inicialmente y se inicia la descarga
        setTrackUrls(prev => ({...prev, [track.id]: ''}));
        loadTrack(track); // Inicia la descarga
      }
    }
  };

  const loadTrack = async (track: SetlistSong) => {
    if (loadingTracks.includes(track.id) || cachedTracks.has(track.id)) return;
    
    setLoadingTracks(prev => [...prev, track.id]);

    try {
        const blob = await cacheAudio(track.url);
        setCachedTracks(prev => new Set(prev).add(track.id));
        const localUrl = URL.createObjectURL(blob);
        // Una vez descargado, se asigna la URL, lo que disparará el useEffect de 'isReadyToPlay'
        setTrackUrls(prev => ({...prev, [track.id]: localUrl}));
      
    } catch (error) {
      console.error(`Error loading track ${track.name}:`, error);
      setTrackUrls(prev => ({...prev, [track.id]: ''})); // Asegurarse de que la URL quede vacía si falla
    } finally {
      setLoadingTracks(prev => prev.filter(id => id !== track.id));
    }
  };
  

  // --- Audio Control Handlers ---

  const updatePlaybackPosition = () => {
    const referenceTrack = activeTracks.find(t => audioRefs.current[t.id]);
    if (referenceTrack) {
        const audio = audioRefs.current[referenceTrack.id];
        if (audio && isPlaying) {
          setPlaybackPosition(audio.currentTime);
          animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
        }
    }
  };
    
  const handleVolumeChange = useCallback((trackId: string, newVolume: number) => {
    setVolumes(prevVolumes => {
      if (prevVolumes[trackId] === newVolume) {
        return prevVolumes;
      }
      return { ...prevVolumes, [trackId]: newVolume };
    });
  }, []);

  useEffect(() => {
    activeTracks.forEach(track => {
      const audio = audioRefs.current[track.id];
      if (audio) {
        const isMuted = mutedTracks.includes(track.id);
        const isSoloActive = soloTracks.length > 0;
        const isThisTrackSolo = soloTracks.includes(track.id);
        const volume = volumes[track.id] ?? 75;

        if (isMuted) {
          audio.volume = 0;
        } else if (isSoloActive) {
          audio.volume = isThisTrackSolo ? volume / 100 : 0;
        } else {
          audio.volume = volume / 100;
        }
      }
    });
  }, [volumes, mutedTracks, soloTracks, activeTracks]);

  const handlePlay = () => {
    if (!isReadyToPlay) return;

    setIsPlaying(true);
    const playPromises = activeTracks.map(track => {
        const audio = audioRefs.current[track.id];
        if (audio && trackUrls[track.id]) {
            audio.currentTime = playbackPosition;
            return audio.play();
        }
        return null;
    }).filter(p => p);
    
    Promise.all(playPromises).catch(e => {
      console.error("Play error:", e.message);
      setIsPlaying(false);
    });
    animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
  };

  const handlePause = () => {
    setIsPlaying(false);
    activeTracks.forEach(track => {
        const audio = audioRefs.current[track.id];
        if (audio) {
            audio.pause();
        }
    });

    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  const handleStop = () => {
    setIsPlaying(false);
    setPlaybackPosition(0);

    activeTracks.forEach(track => {
        const audio = audioRefs.current[track.id];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    });

    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  const handleRewind = () => {
    const newPosition = Math.max(0, playbackPosition - 5);
    setPlaybackPosition(newPosition);
    activeTracks.forEach(track => {
      const audio = audioRefs.current[track.id];
      if (audio) {
        audio.currentTime = newPosition;
      }
    });
  };

  const handleFastForward = () => {
    const newPosition = Math.min(duration, playbackPosition + 5);
    setPlaybackPosition(newPosition);
     activeTracks.forEach(track => {
      const audio = audioRefs.current[track.id];
      if (audio) {
        audio.currentTime = newPosition;
      }
    });
  };

  const handleMuteToggle = (trackId: string) => {
    const newMutedTracks = mutedTracks.includes(trackId)
      ? mutedTracks.filter(id => id !== trackId)
      : [...mutedTracks, trackId];
    setMutedTracks(newMutedTracks);

    if (newMutedTracks.includes(trackId)) {
        setSoloTracks(prevSolo => prevSolo.filter(id => id !== trackId));
    }
  };

  const handleSoloToggle = (trackId: string) => {
    const newSoloTracks = soloTracks.includes(trackId)
      ? soloTracks.filter(id => id !== trackId)
      : [...soloTracks, trackId];
    setSoloTracks(newSoloTracks);
  };
  
  const handleSetlistSelected = (setlist: Setlist | null) => {
    setInitialSetlist(setlist);
    if (!setlist) {
        handleStop(); // Detener todo si se limpia el setlist
        setTracks([]);
        setActiveSongId(null);
    }
  };
  
  const handleSongSelected = (songId: string) => {
      handleStop();
      setActiveSongId(songId);
      setPlaybackPosition(0);
      
      const firstTrackOfSong = tracks.find(t => t.songId === songId);
      if (firstTrackOfSong) {
          const audio = audioRefs.current[firstTrackOfSong.id];
          if(audio && isFinite(audio.duration)) {
            setDuration(audio.duration);
          } else {
            // Reset duration if not available
            setDuration(0);
            if (trackUrls[firstTrackOfSong.id]) {
                const newAudio = new Audio(trackUrls[firstTrackOfSong.id]);
                newAudio.addEventListener('loadedmetadata', () => {
                    if(isFinite(newAudio.duration)) setDuration(newAudio.duration);
                });
            }
          }
      } else {
        setDuration(0);
      }
  }


  // --- Render ---
  const totalTracksForSong = activeTracks.length;
  const loadedCountForSong = activeTracks.filter(t => cachedTracks.has(t.id)).length;
  const loadingProgress = totalTracksForSong > 0 ? (loadedCountForSong / totalTracksForSong) * 100 : 0;
  const showLoadingBar = playbackMode === 'offline' && loadingProgress < 100 && totalTracksForSong > 0;
  
  return (
    <div className="grid grid-cols-[1fr_320px] grid-rows-[auto_1fr] h-screen w-screen p-4 gap-4">
      <div className="col-span-2 row-start-1">
        <Header 
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onRewind={handleRewind}
            onFastForward={handleFastForward}
            currentTime={playbackPosition}
            duration={duration}
            playbackMode={playbackMode}
            onPlaybackModeChange={setPlaybackMode}
            loadingProgress={loadingProgress}
            showLoadingBar={showLoadingBar}
            isReadyToPlay={isReadyToPlay}
        />
      </div>
      
      <main className="col-start-1 row-start-2 overflow-y-auto pr-2 no-scrollbar">
        {activeSongId ? (
            <MixerGrid
              tracks={activeTracks}
              soloTracks={soloTracks}
              mutedTracks={mutedTracks}
              volumes={volumes}
              loadingTracks={loadingTracks}
              onMuteToggle={handleMuteToggle}
              onSoloToggle={handleSoloToggle}
              onVolumeChange={handleVolumeChange}
              isPlaying={isPlaying}
              playbackPosition={playbackPosition}
              duration={duration}
              playbackMode={playbackMode}
              cachedTracks={cachedTracks}
            />
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-muted-foreground">
                <Image src="/logo.png" alt="Multitrack Player" width={200} height={200} className="mx-auto opacity-20"/>
                <p className="mt-4">Selecciona o crea un setlist para empezar.</p>
            </div>
         </div>
        )}
      </main>

       <div className="col-start-2 row-start-2 flex flex-col gap-4">
        <SongList 
            initialSetlist={initialSetlist}
            activeSongId={activeSongId}
            onSetlistSelected={handleSetlistSelected}
            onSongSelected={handleSongSelected}
            onLoadTrack={loadTrack}
        />
        <TonicPad />
      </div>
    </div>
  );
};

export default DawPage;

    