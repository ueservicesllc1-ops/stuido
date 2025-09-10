
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import Image from 'next/image';
import { getSetlists, Setlist, SetlistSong } from '@/actions/setlists';
import { cacheAudio, getCachedAudio } from '@/lib/audiocache';

export type PlaybackMode = 'online' | 'hybrid' | 'offline';

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
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('hybrid');
  const [cachedTracks, setCachedTracks] = useState(new Set<string>());
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

  // Estado para descargas en segundo plano en modo híbrido
  const [hybridDownloadingTracks, setHybridDownloadingTracks] = useState<Set<string>>(new Set());


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
        const firstSongId = allTracks[0].songId;
        if (firstSongId) {
            handleSongSelected(firstSongId);
        }
      } else {
        setActiveSongId(null);
      }
      setTrackUrls({});
      setLoadingTracks([]);
      setCachedTracks(new Set());
    } else {
      setTracks([]);
      setActiveSongId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSetlist]);

  // Se detiene la reproducción al cambiar de modo
  useEffect(() => {
    handleStop();
    if(activeSongId) {
       prepareTracksForSong(activeSongId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackMode]);


  // Lógica de carga de canciones y preparación de audios
  useEffect(() => {
    if (!activeSongId) {
      setIsReadyToPlay(false);
      return;
    }
    
    handleStop();
    setIsReadyToPlay(false);
    
    const tracksForSong = tracks.filter(t => t.songId === activeSongId);
    
    if (tracksForSong.length === 0) {
      setIsReadyToPlay(true);
      return;
    }

    const prepareAndVerifyTracks = async () => {
      const preparationPromises = tracksForSong.map(async (track): Promise<{ id: string; url: string }> => {
        let assignedUrl = '';
        const cachedBlob = await getCachedAudio(track.url);

        if (cachedBlob) {
          setCachedTracks(prev => new Set(prev).add(track.id));
          assignedUrl = URL.createObjectURL(cachedBlob);
        } else {
          setCachedTracks(prev => {
            const newSet = new Set(prev);
            newSet.delete(track.id);
            return newSet;
          });

          switch (playbackMode) {
            case 'online':
              assignedUrl = `/api/download?url=${encodeURIComponent(track.url)}`;
              break;
            case 'hybrid':
              assignedUrl = `/api/download?url=${encodeURIComponent(track.url)}`;
              setHybridDownloadingTracks(prev => new Set(prev).add(track.id));
              cacheAudio(track.url)
                .then(() => setCachedTracks(prev => new Set(prev).add(track.id)))
                .catch(err => console.error(`Hybrid download failed for ${track.name}`, err))
                .finally(() => {
                  setHybridDownloadingTracks(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(track.id);
                    return newSet;
                  });
                });
              break;
            case 'offline':
              setLoadingTracks(prev => [...prev, track.id]);
              try {
                const blob = await cacheAudio(track.url);
                setCachedTracks(prev => new Set(prev).add(track.id));
                assignedUrl = URL.createObjectURL(blob);
              } catch (error) {
                console.error(`Error loading track ${track.name} for offline:`, error);
                throw new Error(`Failed to load ${track.name} for offline mode.`);
              } finally {
                setLoadingTracks(prev => prev.filter(id => id !== track.id));
              }
              break;
          }
        }
        
        if (!assignedUrl) {
          throw new Error(`No URL for track ${track.name}`);
        }

        return new Promise<{ id: string; url: string }>((resolve, reject) => {
          const audio = audioRefs.current[track.id];
          if (!audio) return reject(new Error(`No audio element for track ${track.name}`));

          const onCanPlayThrough = () => {
            cleanup();
            resolve({ id: track.id, url: assignedUrl });
          };
          const onError = () => {
            cleanup();
            reject(new Error(`Audio element failed to load source for ${track.name}`));
          };
          const cleanup = () => {
            audio.removeEventListener('canplaythrough', onCanPlayThrough);
            audio.removeEventListener('error', onError);
          };
          
          audio.src = assignedUrl;
          audio.load();

          if (audio.readyState >= 4) { // HAVE_ENOUGH_DATA
              onCanPlayThrough();
          } else {
              audio.addEventListener('canplaythrough', onCanPlayThrough);
              audio.addEventListener('error', onError);
          }
        });
      });

      try {
        const results = await Promise.all(preparationPromises);
        const finalTrackUrls = results.reduce((acc, { id, url }) => {
          acc[id] = url;
          return acc;
        }, {} as { [key: string]: string });

        setTrackUrls(finalTrackUrls);

        const firstTrackId = tracksForSong[0]?.id;
        const referenceAudio = firstTrackId ? audioRefs.current[firstTrackId] : null;

        const setDurationFromAudio = () => {
          if (referenceAudio && isFinite(referenceAudio.duration)) {
              setDuration(referenceAudio.duration);
              setIsReadyToPlay(true);
          } else if(referenceAudio) {
              // Si no está lista la duración, esperar a que se carguen los metadatos
              const onMetadataLoaded = () => {
                  setDuration(referenceAudio.duration);
                  setIsReadyToPlay(true);
                  referenceAudio.removeEventListener('loadedmetadata', onMetadataLoaded);
              }
              referenceAudio.addEventListener('loadedmetadata', onMetadataLoaded);
          } else {
              setIsReadyToPlay(true); // No hay pistas, así que está "listo"
          }
        };

        setDurationFromAudio();

      } catch (error: any) {
        console.error("One or more tracks failed to become ready, playback disabled.", error.message);
        setIsReadyToPlay(false);
      }
    };

    prepareAndVerifyTracks();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongId]);


  // Inicializa volúmenes y refs de audio cuando cambian las pistas
  useEffect(() => {
    const newVolumes: { [key: string]: number } = {};
    const newAudioRefs: {[key:string]: HTMLAudioElement | null} = {};
    const localTrackUrls = { ...trackUrls };

    tracks.forEach(track => {
      newVolumes[track.id] = volumes[track.id] ?? 75;
      if (!audioRefs.current[track.id]) {
          const audio = new Audio();
          audio.preload = 'auto'; 
          newAudioRefs[track.id] = audio;
      } else {
          newAudioRefs[track.id] = audioRefs.current[track.id];
      }
      // Limpiar URLs que no corresponden a las pistas actuales
       if (!tracks.find(t => t.id === track.id)) {
           delete localTrackUrls[track.id];
       }
    });

    setVolumes(newVolumes);
    audioRefs.current = newAudioRefs;
    setTrackUrls(localTrackUrls);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  // --- Lógica de Carga y Caché ---
  const prepareTracksForSong = (songId: string) => {
      // Esta función ahora es un disparador, la lógica principal está en el useEffect de activeSongId
      setActiveSongId(songId);
  }

  const loadTrackForOffline = async (track: SetlistSong) => {
    if (loadingTracks.includes(track.id) || cachedTracks.has(track.id)) return;
    setLoadingTracks(prev => [...prev, track.id]);
    try {
        await cacheAudio(track.url);
        setCachedTracks(prev => new Set(prev).add(track.id));
        // La URL se asignará cuando la canción se active en modo offline
    } catch (error) {
      console.error(`Error pre-caching track ${track.name} for offline:`, error);
    } finally {
      setLoadingTracks(prev => prev.filter(id => id !== track.id));
    }
  };
  

  // --- Audio Control Handlers ---
  const updatePlaybackPosition = useCallback(() => {
    const referenceTrack = activeTracks.find(t => audioRefs.current[t.id]);
    if (referenceTrack) {
        const audio = audioRefs.current[referenceTrack.id];
        if (audio && isPlaying) {
          setPlaybackPosition(audio.currentTime);
          animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
        }
    }
  }, [activeTracks, isPlaying]);
    
  const handleVolumeChange = useCallback((trackId: string, newVolume: number) => {
    setVolumes(prevVolumes => {
      if (prevVolumes[trackId] === newVolume) return prevVolumes;
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

        if (isMuted) audio.volume = 0;
        else if (isSoloActive) audio.volume = isThisTrackSolo ? volume / 100 : 0;
        else audio.volume = volume / 100;
      }
    });
  }, [volumes, mutedTracks, soloTracks, activeTracks]);

  const handlePlay = useCallback(() => {
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

    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
  }, [isReadyToPlay, activeTracks, trackUrls, playbackPosition, updatePlaybackPosition]);


  const handlePause = () => {
    setIsPlaying(false);
    activeTracks.forEach(track => { audioRefs.current[track.id]?.pause() });
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
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
        animationFrameRef.current = undefined;
    }
  };
  
  const handleRewind = () => {
    const newPosition = Math.max(0, playbackPosition - 5);
    setPlaybackPosition(newPosition);
    activeTracks.forEach(track => {
      if (audioRefs.current[track.id]) audioRefs.current[track.id]!.currentTime = newPosition;
    });
  };

  const handleFastForward = () => {
    const newPosition = Math.min(duration, playbackPosition + 5);
    setPlaybackPosition(newPosition);
     activeTracks.forEach(track => {
      if (audioRefs.current[track.id]) audioRefs.current[track.id]!.currentTime = newPosition;
    });
  };

  const handleMuteToggle = (trackId: string) => {
    setMutedTracks(prev => prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]);
    if (!mutedTracks.includes(trackId)) setSoloTracks(prev => prev.filter(id => id !== trackId));
  };

  const handleSoloToggle = (trackId: string) => {
    setSoloTracks(prev => prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]);
  };
  
  const handleSetlistSelected = (setlist: Setlist | null) => {
    setInitialSetlist(setlist);
    if (!setlist) {
        handleStop();
        setTracks([]);
        setActiveSongId(null);
    }
  };
  
  const handleSongSelected = (songId: string) => {
      if (songId === activeSongId) return;
      setActiveSongId(songId); // Esto disparará el useEffect principal de carga
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
              hybridDownloadingTracks={hybridDownloadingTracks}
            />
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-muted-foreground">
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
            onLoadTrack={loadTrackForOffline}
        />
        <TonicPad />
      </div>
    </div>
  );
};

export default DawPage;

    