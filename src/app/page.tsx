
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import Image from 'next/image';
import { getSetlists, Setlist, SetlistSong } from '@/actions/setlists';
import { cacheAudio, getCachedAudio } from '@/lib/audiocache';
import { Progress } from '@/components/ui/progress';

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
    if(tracks.length > 0) {
        tracks.forEach(track => {
            checkCacheStatus(track);
            // Si estamos en modo offline y no está cacheado, iniciamos la carga
            if(playbackMode === 'offline' && !cachedTracks.has(track.id)) {
                loadTrack(track);
            } else {
                // En cualquier otro caso, asignamos la URL correcta
                assignTrackUrl(track);
            }
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackMode, tracks]);


  // Inicializa volúmenes y refs de audio cuando cambian las pistas
  useEffect(() => {
    const newVolumes: { [key: string]: number } = {};
    const newAudioRefs: {[key: string]: HTMLAudioElement | null} = {};

    tracks.forEach(track => {
      newVolumes[track.id] = volumes[track.id] ?? 75;
      newAudioRefs[track.id] = audioRefs.current[track.id] || null;
    });

    setVolumes(newVolumes);
    audioRefs.current = newAudioRefs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  // Forzar la carga del audio cuando la URL cambia
   useEffect(() => {
    Object.keys(trackUrls).forEach(trackId => {
        const audio = audioRefs.current[trackId];
        if (audio && audio.src !== trackUrls[trackId]) {
            audio.src = trackUrls[trackId];
            audio.load();
        }
    });
  }, [trackUrls]);


  // --- Lógica de Carga y Caché ---
  const checkCacheStatus = async (track: SetlistSong) => {
    const blob = await getCachedAudio(track.url);
    if(blob) {
      setCachedTracks(prev => new Set(prev).add(track.id));
    }
  }

  const assignTrackUrl = async (track: SetlistSong) => {
      if (playbackMode === 'offline') {
          const blob = await getCachedAudio(track.url);
          if (blob) {
            const localUrl = URL.createObjectURL(blob);
            setTrackUrls(prev => ({...prev, [track.id]: localUrl}));
          }
      } else {
          setTrackUrls(prev => ({...prev, [track.id]: track.url}));
      }
  }

  const loadTrack = async (track: SetlistSong) => {
    if (loadingTracks.includes(track.id)) return;
    setLoadingTracks(prev => [...prev, track.id]);
    try {
      if (playbackMode === 'offline') {
        let blob = await getCachedAudio(track.url);
        if (!blob) {
          blob = await cacheAudio(track.url);
        }
        setCachedTracks(prev => new Set(prev).add(track.id));
        const localUrl = URL.createObjectURL(blob);
        setTrackUrls(prev => ({...prev, [track.id]: localUrl}));
      } else {
        // En modo online, usar la URL directa
        setTrackUrls(prev => ({...prev, [track.id]: track.url}));
      }
    } catch (error) {
      console.error(`Error loading track ${track.name}:`, error);
      // Fallback a la URL original si la caché falla
      setTrackUrls(prev => ({...prev, [track.id]: track.url}));
    } finally {
      setLoadingTracks(prev => prev.filter(id => id !== track.id));
    }
  };


  // --- Audio Control Handlers ---

  const updatePlaybackPosition = () => {
    const firstAudio = Object.values(audioRefs.current).find(a => a);
    if (firstAudio && isPlaying) {
      setPlaybackPosition(firstAudio.currentTime);
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };
  
  const getPrio = (trackName: string) => {
    const upperCaseName = trackName.toUpperCase();
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

  const handlePlay = () => {
    setIsPlaying(true);
    const playPromises = activeTracks.map(track => {
        if(audioRefs.current[track.id]) {
            return audioRefs.current[track.id]!.play();
        }
        return null;
    }).filter(p => p);
    
    Promise.all(playPromises).catch(e => {
      // Un solo error puede ser reportado si el usuario no ha interactuado
      console.error("Play error:", e.message);
      setIsPlaying(false);
    });
    animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
  };

  const handlePause = () => {
    setIsPlaying(false);
    Object.keys(audioRefs.current).forEach(trackId => {
        const audio = audioRefs.current[trackId];
        // Solo pausamos las pistas que pertenecen a la canción activa
        if (audio && tracks.find(t => t.id === trackId && t.songId === activeSongId)) {
            audio.pause();
        }
    });

    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  const handleStop = () => {
    handlePause();
    setPlaybackPosition(0);
    Object.keys(audioRefs.current).forEach(trackId => {
        const audio = audioRefs.current[trackId];
         // Solo reiniciamos las pistas que pertenecen a la canción activa
        if (audio && tracks.find(t => t.id === trackId && t.songId === activeSongId)) {
            audio.currentTime = 0;
        }
    });
  };

  const handleSeek = (time: number) => {
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) audio.currentTime = time;
    });
    setPlaybackPosition(time);
  };

  const handleRewind = () => {
    handleSeek(Math.max(0, playbackPosition - 5));
  };
  
  const handleFastForward = () => {
    handleSeek(Math.min(duration, playbackPosition + 5));
  };

  const handleVolumeChange = useCallback((trackId: string, newVolume: number) => {
    setVolumes(prev => {
      if (prev[trackId] === newVolume) return prev;
      const newVolumes = { ...prev, [trackId]: newVolume };
      const audio = audioRefs.current[trackId];
      if (audio) {
        audio.volume = newVolume / 100;
      }
      return newVolumes;
    });
  }, []);

  const toggleMute = (trackId: string) => {
    setMutedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(t => t !== trackId)
        : [...prev, trackId]
    );
  };

  const toggleSolo = (trackId: string) => {
    setSoloTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(t => t !== trackId)
        : [...prev, trackId]
    );
  };
  
  // Effect to update audio elements when tracks change
  useEffect(() => {
    tracks.forEach(track => {
        const audio = audioRefs.current[track.id];
        if (audio) {
            const isMuted = mutedTracks.includes(track.id);
            const isSoloActive = soloTracks.length > 0;
            const isSoloed = soloTracks.includes(track.id);

            audio.muted = isMuted || (isSoloActive && !isSoloed);
        }
    });
  }, [mutedTracks, soloTracks, tracks]);

  // Effect to handle metadata loading for duration
  const onLoadedMetadata = (trackId: string) => {
      const audio = audioRefs.current[trackId];
      if (audio) {
          // Set initial volume
          audio.volume = (volumes[trackId] ?? 75) / 100;
          // Set max duration
          if (audio.duration > duration) {
            setDuration(audio.duration);
          }
      }
  }

  const handleSetlistUpdate = (setlist: Setlist | null) => {
    setInitialSetlist(setlist);
  };
  
  const handleSongSelect = (songId: string) => {
    handleStop();
    setActiveSongId(songId);
    setDuration(0); // Reset duration when changing song
  };

  
  const progress = duration > 0 ? (playbackPosition / duration) * 100 : 0;

  return (
    <div className="flex flex-col h-screen bg-background font-sans text-sm">
      {/* Hidden Audio Elements */}
      {tracks.map((track, index) => (
          <audio
              key={`${track.id}-${index}`}
              ref={el => audioRefs.current[track.id] = el}
              src={trackUrls[track.id]}
              onLoadedMetadata={() => onLoadedMetadata(track.id)}
              onEnded={handlePause}
              preload="auto"
          />
      ))}
      
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
      />
      
      <div className="p-4 pt-0">
        <div className="relative h-24">
            <div className="relative h-full">
                <Progress value={progress} className="absolute bottom-0 w-full h-1 bg-black/20" indicatorClassName="bg-primary/80" />
            </div>
        </div>
      </div>

      <main className="flex-grow grid grid-cols-12 gap-4 px-4 pb-4">
        <div className="col-span-12 lg:col-span-8">
          <MixerGrid 
            tracks={activeTracks}
            soloTracks={soloTracks}
            mutedTracks={mutedTracks}
            volumes={volumes}
            loadingTracks={loadingTracks}
            onMuteToggle={toggleMute}
            onSoloToggle={toggleSolo}
            onVolumeChange={handleVolumeChange}
            isPlaying={isPlaying}
            playbackPosition={playbackPosition}
            duration={duration}
            playbackMode={playbackMode}
            cachedTracks={cachedTracks}
          />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0">
          <div className="flex-grow min-h-0">
            <SongList 
              initialSetlist={initialSetlist}
              activeSongId={activeSongId}
              onSetlistSelected={handleSetlistUpdate}
              onSongSelected={handleSongSelect}
              onLoadTrack={loadTrack}
            />
          </div>
          <TonicPad />
        </div>
      </main>
    </div>
  );
};

export default DawPage;

    