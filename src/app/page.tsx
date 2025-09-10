
'use client';
import React, { useState, useEffect, useRef } from 'react';
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
      setTracks(initialSetlist.songs);
      // Reiniciar las URLs y el estado de carga al cambiar de setlist
      setTrackUrls({});
      setLoadingTracks([]);
      
      // Cuando cambia el setlist, cargar todas sus pistas según el modo actual
      initialSetlist.songs.forEach(song => loadTrack(song));
    } else {
      setTracks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSetlist, playbackMode]);


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
  const loadTrack = async (track: SetlistSong) => {
    setLoadingTracks(prev => [...prev, track.id]);
    try {
      if (playbackMode === 'offline') {
        let blob = await getCachedAudio(track.url);
        if (!blob) {
          blob = await cacheAudio(track.url);
        }
        const localUrl = URL.createObjectURL(blob);
        setTrackUrls(prev => ({...prev, [track.id]: localUrl}));
      } else {
        // En modo online, usar la URL directa
        setTrackUrls(prev => ({...prev, [track.id]: track.url}));
      }
    } catch (error) {
      console.error(`Error loading track ${track.name}:`, error);
      // Si hay un error, por ejemplo, al cargar offline, podemos intentar usar la url online como fallback
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

  const handlePlay = () => {
    setIsPlaying(true);
    const playPromises = Object.values(audioRefs.current).map(audio => audio?.play());
    Promise.all(playPromises).catch(e => {
      // Un solo error puede ser reportado si el usuario no ha interactuado
      console.error("Play error:", e.message);
      setIsPlaying(false);
    });
    animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
  };

  const handlePause = () => {
    setIsPlaying(false);
    Object.values(audioRefs.current).forEach(audio => audio?.pause());
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  const handleStop = () => {
    handlePause();
    setPlaybackPosition(0);
    Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.currentTime = 0;
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

  const handleVolumeChange = (trackId: string, newVolume: number) => {
    setVolumes(prev => ({ ...prev, [trackId]: newVolume }));
    const audio = audioRefs.current[trackId];
    if (audio) {
      audio.volume = newVolume / 100;
    }
  };

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
  
  // Filtra las pistas para mostrar solo las que están listas.
  // En modo offline, solo se muestran las cacheadas.
  // En modo online, se muestran todas.
  const visibleTracks = playbackMode === 'offline' 
    ? tracks.filter(t => trackUrls[t.id]?.startsWith('blob:'))
    : tracks;


  return (
    <div className="flex flex-col h-screen bg-background font-sans text-sm">
      {/* Hidden Audio Elements */}
      {tracks.map(track => (
          <audio
              key={track.id}
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
      
      <div className="relative flex-grow p-4 min-h-0">
        <div className="absolute top-0 left-4 right-4 h-24">
            <Image src="https://i.imgur.com/kP4MS2H.png" alt="Waveform" fill style={{objectFit: 'contain'}} data-ai-hint="waveform audio" priority />
        </div>
      </div>

      <main className="flex-grow grid grid-cols-12 gap-4 px-4 pb-4 pt-20">
        <div className="col-span-12 lg:col-span-7">
          <MixerGrid 
            tracks={visibleTracks}
            soloTracks={soloTracks}
            mutedTracks={mutedTracks}
            volumes={volumes}
            onMuteToggle={toggleMute}
            onSoloToggle={toggleSolo}
            onVolumeChange={handleVolumeChange}
            isPlaying={isPlaying}
            playbackPosition={playbackPosition}
            duration={duration}
            playbackMode={playbackMode}
          />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <SongList 
            initialSetlist={initialSetlist} 
            onSetlistSelected={handleSetlistUpdate}
            onLoadTrack={loadTrack}
          />
        </div>
        <div className="col-span-12 lg:col-span-2">
          <TonicPad />
        </div>
      </main>
    </div>
  );
};

export default DawPage;
