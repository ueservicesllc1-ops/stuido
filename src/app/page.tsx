
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
      
      if (allTracks.length > 0 && allTracks[0].songId) {
        setActiveSongId(allTracks[0].songId);
      } else {
        setActiveSongId(null);
      }
      
      setTrackUrls({});
      setLoadingTracks([]);
      setCachedTracks(new Set()); // Reset cache status on setlist change
      
      allTracks.forEach(song => checkCacheStatus(song));

    } else {
      setTracks([]);
      setActiveSongId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSetlist]);
  
  // Re-evaluar y cargar pistas al cambiar el modo de reproducción
  useEffect(() => {
    handleStop(); // Detener reproducción al cambiar de modo
    if(tracks.length > 0) {
        tracks.forEach(track => {
            checkCacheStatus(track);
            if(playbackMode === 'offline' && !cachedTracks.has(track.id)) {
                loadTrack(track);
            } else {
                assignTrackUrl(track);
            }
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackMode, tracks]);

  // Chequea si las pistas de la canción activa están listas para reproducirse
  useEffect(() => {
      if (!activeSongId) {
          setIsReadyToPlay(false);
          return;
      }
      const currentTracks = tracks.filter(t => t.songId === activeSongId);
      if (currentTracks.length === 0) {
          setIsReadyToPlay(true);
          return;
      }

      setIsReadyToPlay(false);

      const readinessPromises = currentTracks.map(track => {
          return new Promise<void>((resolve, reject) => {
              const url = trackUrls[track.id];
              if (!url) {
                  // Si no hay URL, no podemos hacer nada. Esperar a que se asigne.
                  // Podríamos rechazar, pero eso detendría la comprobación de otras pistas.
                  // Es mejor esperar a que todas las URLs estén asignadas.
                  return;
              }
              const audio = audioRefs.current[track.id];
              if (!audio) {
                  reject(new Error(`Audio element not found for ${track.name}`));
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

      Promise.all(readinessPromises)
          .then(() => {
              setIsReadyToPlay(true);
          })
          .catch((error) => {
              console.error("One or more tracks failed to become ready:", error);
              setIsReadyToPlay(false);
          });

  }, [activeSongId, tracks, trackUrls]);


  // Inicializa volúmenes y refs de audio cuando cambian las pistas
  useEffect(() => {
    const newVolumes: { [key: string]: number } = {};
    const newAudioRefs: {[key:string]: HTMLAudioElement | null} = {};

    tracks.forEach(track => {
      newVolumes[track.id] = volumes[track.id] ?? 75;
      if (!audioRefs.current[track.id]) {
          const audio = new Audio();
          audio.preload = 'metadata';
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
            audio.load();
        }
    });
  }, [trackUrls]);


  // --- Lógica de Carga y Caché ---
  const checkCacheStatus = async (track: SetlistSong) => {
    const blob = await getCachedAudio(track.url);
    if(blob) {
      setCachedTracks(prev => new Set(prev).add(track.id));
      assignTrackUrl(track, blob); // Pre-asignar la URL si ya está en caché
    } else {
      assignTrackUrl(track); // Asignar URL remota si no está en caché
    }
  }

  const assignTrackUrl = async (track: SetlistSong, cachedBlob: Blob | null = null) => {
      let blob = cachedBlob;
      if (playbackMode === 'offline') {
          if (!blob) blob = await getCachedAudio(track.url);

          if (blob) {
            const localUrl = URL.createObjectURL(blob);
            setTrackUrls(prev => ({...prev, [track.id]: localUrl}));
          } else {
            // Si estamos en modo offline y no está en caché, no asignamos URL
            setTrackUrls(prev => ({...prev, [track.id]: ''}));
          }
      } else {
          // En modo online, siempre usamos la URL del proxy (que es la misma que la original por ahora)
          setTrackUrls(prev => ({...prev, [track.id]: `/api/download?url=${encodeURIComponent(track.url)}`}));
      }
  }

  const loadTrack = async (track: SetlistSong) => {
    if (loadingTracks.includes(track.id) || cachedTracks.has(track.id)) return;
    setLoadingTracks(prev => [...prev, track.id]);
    try {
        let blob = await getCachedAudio(track.url);
        if (!blob) {
          blob = await cacheAudio(track.url);
        }
        setCachedTracks(prev => new Set(prev).add(track.id));
        const localUrl = URL.createObjectURL(blob);
        setTrackUrls(prev => ({...prev, [track.id]: localUrl}));
      
    } catch (error) {
      console.error(`Error loading track ${track.name}:`, error);
      // No hacemos fallback a la URL original, en modo offline estricto
    } finally {
      setLoadingTracks(prev => prev.filter(id => id !== track.id));
    }
  };
  
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
        if (audio) {
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
             const newAudio = new Audio(trackUrls[firstTrackOfSong.id]);
             newAudio.addEventListener('loadedmetadata', () => {
                if(isFinite(newAudio.duration)) setDuration(newAudio.duration);
             })
          }
      } else {
        setDuration(0);
      }
  }


  // --- Render ---
  const totalTracks = tracks.length;
  const loadedCount = cachedTracks.size;
  const loadingProgress = totalTracks > 0 ? (loadedCount / totalTracks) * 100 : 0;
  const showLoadingBar = playbackMode === 'offline' && loadingProgress < 100;
  
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
            cachedTracks={cachedTracks}
        />
        <TonicPad />
      </div>
    </div>
  );
};

export default DawPage;
