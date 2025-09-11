
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import { getSetlists, Setlist, SetlistSong } from '@/actions/setlists';
import { cacheAudio, getCachedAudio } from '@/lib/audiocache';
import { Song } from '@/actions/songs';
import { SongStructure } from '@/ai/flows/song-structure';

export type PlaybackMode = 'online' | 'hybrid' | 'offline';

const DawPage = () => {
  const [tracks, setTracks] = useState<SetlistSong[]>([]);
  const [soloTracks, setSoloTracks] = useState<string[]>([]);
  const [mutedTracks, setMutedTracks] = useState<string[]>([]);
  const [initialSetlist, setInitialSetlist] = useState<Setlist | null>(null);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songStructure, setSongStructure] = useState<SongStructure | null>(null);

  // --- Web Audio API State ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackNodesRef = useRef<Record<string, {
    buffer: AudioBuffer;
    source?: AudioBufferSourceNode;
    gainNode: GainNode;
    analyserNode: AnalyserNode;
  }>>({});
  const [vuData, setVuData] = useState<Record<string, number>>({});
  const [audioBuffers, setAudioBuffers] = useState<Record<string, AudioBuffer>>({});
  const [loadingTracks, setLoadingTracks] = useState<string[]>([]);

  // --- Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const animationFrameRef = useRef<number>();
  const playbackStartTimeRef = useRef(0);
  const playbackStartOffsetRef = useRef(0);
  
  const [volumes, setVolumes] = useState<{ [key: string]: number }>({});
  const [masterVolume, setMasterVolume] = useState(100);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('hybrid');
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);
  const [transpose, setTranspose] = useState(0); // Estado para la transposición

  // Estado para descargas en segundo plano en modo híbrido
  const [hybridDownloadingTracks, setHybridDownloadingTracks] = useState<Set<string>>(new Set());

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
    }
    return () => {
        audioContextRef.current?.close();
    }
  }, []);

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
      setTracks(initialSetlist.songs);
      if (initialSetlist.songs.length > 0) {
        const firstSongId = initialSetlist.songs[0].songId;
        if (firstSongId) {
            handleSongSelected(firstSongId);
        }
      } else {
        setActiveSongId(null);
        setSongStructure(null);
      }
    } else {
      setTracks([]);
      setActiveSongId(null);
      setSongStructure(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSetlist]);

  // Lógica de carga de canciones y preparación de audios (Refactorizado para Web Audio API)
  useEffect(() => {
    if (!activeSongId || !audioContextRef.current) {
      setIsReadyToPlay(false);
      return;
    }

    const currentSong = songs.find(s => s.id === activeSongId);
    setSongStructure(currentSong?.structure || null);
    
    handleStop();
    setIsReadyToPlay(false);
    setLoadingTracks(activeTracks.map(t => t.id));

    const loadAudioData = async () => {
      const newAudioBuffers: Record<string, AudioBuffer> = {};
      let maxDuration = 0;
      
      await Promise.all(activeTracks.map(async (track) => {
        try {
          let audioData: ArrayBuffer;
          let blob = await getCachedAudio(track.url);
          
          if (!blob) {
            const proxyUrl = `/api/download?url=${encodeURIComponent(track.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${track.url}`);
            blob = await response.blob();
            // Cache in background
            if (playbackMode !== 'online') {
              cacheAudio(track.url, blob);
            }
          }
          
          audioData = await blob.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(audioData);
          newAudioBuffers[track.id] = audioBuffer;
          if (audioBuffer.duration > maxDuration) {
            maxDuration = audioBuffer.duration;
          }
        } catch (error) {
          console.error(`Error loading track ${track.name}:`, error);
        } finally {
           setLoadingTracks(prev => prev.filter(id => id !== track.id));
        }
      }));
      
      setAudioBuffers(newAudioBuffers);
      setDuration(maxDuration);
      setIsReadyToPlay(true);
    };

    loadAudioData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongId, songs]);

  // Inicializa volúmenes
  useEffect(() => {
    const newVolumes: { [key: string]: number } = {};
    tracks.forEach(track => {
      newVolumes[track.id] = volumes[track.id] ?? 75;
    });
    setVolumes(newVolumes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  // --- Audio Control & VU Meter ---
  const updateVuMeters = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current) return;

    const newVuData: Record<string, number> = {};
    Object.keys(trackNodesRef.current).forEach(trackId => {
      const node = trackNodesRef.current[trackId];
      if (node && node.analyserNode) {
        const dataArray = new Uint8Array(node.analyserNode.frequencyBinCount);
        node.analyserNode.getByteTimeDomainData(dataArray);
        
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = Math.abs(dataArray[i] - 128); // Amplitud de -128 a 127, centrado en 0
          if (value > peak) {
            peak = value;
          }
        }
        
        // Convertir el pico (0-128) a una escala de 0-100
        const normalizedPeak = (peak / 128) * 100;
        newVuData[trackId] = Math.min(100, normalizedPeak * 1.5); // Multiplicador para sensibilidad
      }
    });
    setVuData(newVuData);
    
    // Update playback position
    const elapsedTime = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    const newPosition = playbackStartOffsetRef.current + elapsedTime;
    if (newPosition <= duration) {
      setPlaybackPosition(newPosition);
    } else {
      // La canción terminó
      handleStop();
    }

    animationFrameRef.current = requestAnimationFrame(updateVuMeters);
  }, [duration]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isPlaying) {
      isPlayingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(updateVuMeters);
    } else {
      isPlayingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Limpiar los vúmetros al detener
      setVuData({});
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateVuMeters]);

  // Apply volumes
  useEffect(() => {
    activeTracks.forEach(track => {
      const node = trackNodesRef.current[track.id];
      if (node && node.gainNode && audioContextRef.current) {
        const isMuted = mutedTracks.includes(track.id);
        const isSoloActive = soloTracks.length > 0;
        const isThisTrackSolo = soloTracks.includes(track.id);
        const trackVolume = volumes[track.id] ?? 75;

        const masterVol = masterVolume / 100;
        const trackVol = trackVolume / 100;
        
        let finalVolume = 0;
        if (isMuted) {
            finalVolume = 0;
        } else if (isSoloActive) {
            finalVolume = isThisTrackSolo ? trackVol * masterVol : 0;
        } else {
            finalVolume = trackVol * masterVol;
        }

        // Usar setValueAtTime para un cambio suave
        node.gainNode.gain.setValueAtTime(finalVolume, audioContextRef.current.currentTime);
      }
    });
  }, [volumes, masterVolume, mutedTracks, soloTracks, activeTracks]);


  const handlePlay = useCallback(() => {
    if (!isReadyToPlay || isPlaying || !audioContextRef.current) return;

    const context = audioContextRef.current;
    const newTrackNodes: typeof trackNodesRef.current = {};

    // Sincronizar el tiempo de inicio
    playbackStartTimeRef.current = context.currentTime;
    playbackStartOffsetRef.current = playbackPosition;
    
    // Calcular el playbackRate basado en la transposición
    const playbackRate = Math.pow(2, transpose / 12);

    activeTracks.forEach(track => {
      const buffer = audioBuffers[track.id];
      if (buffer) {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;

        const gainNode = context.createGain();
        const analyserNode = context.createAnalyser();
        analyserNode.fftSize = 256; // Tamaño para el análisis de VU

        source.connect(analyserNode).connect(gainNode).connect(context.destination);
        
        // Iniciar la reproducción desde la posición actual
        source.start(0, playbackPosition);

        newTrackNodes[track.id] = { buffer, source, gainNode, analyserNode };
      }
    });

    trackNodesRef.current = newTrackNodes;
    setIsPlaying(true);
  }, [isReadyToPlay, isPlaying, activeTracks, audioBuffers, playbackPosition, transpose]);

  const handlePause = () => {
    if (!isPlaying || !audioContextRef.current) return;
    
    // Detener todas las fuentes de audio
    Object.values(trackNodesRef.current).forEach(node => node.source?.stop());

    // Calcular y guardar la nueva posición de reproducción
    const elapsedTime = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    playbackStartOffsetRef.current += elapsedTime;
    setPlaybackPosition(playbackStartOffsetRef.current);
    
    setIsPlaying(false);
    trackNodesRef.current = {}; // Limpiar los nodos
  };
  
  const handleStop = () => {
    if (isPlaying) {
      Object.values(trackNodesRef.current).forEach(node => node.source?.stop());
    }
    setIsPlaying(false);
    setPlaybackPosition(0);
    playbackStartOffsetRef.current = 0;
    trackNodesRef.current = {};
  };
  
  const handleSeek = (newPosition: number) => {
    if (!isReadyToPlay || newPosition < 0 || newPosition > duration) return;

    if (isPlaying) {
      handlePause(); // Pausar primero
      playbackStartOffsetRef.current = newPosition; // Actualizar el offset
      setPlaybackPosition(newPosition);
      // Usar un pequeño retardo para asegurar que el estado se actualice antes de volver a reproducir
      setTimeout(handlePlay, 50); 
    } else {
      // Si está pausado, solo actualiza la posición
      setPlaybackPosition(newPosition);
      playbackStartOffsetRef.current = newPosition;
    }
  };

  const handleRewind = () => handleSeek(Math.max(0, playbackPosition - 5));
  const handleFastForward = () => handleSeek(Math.min(duration, playbackPosition + 5));

  const handleMuteToggle = (trackId: string) => {
    setMutedTracks(prev => prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]);
    // Si se mutea una pista, también se quita del modo solo si estaba activado
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
      setActiveSongId(songId);
  }
  const handleMasterVolumeChange = (newVolume: number) => {
      setMasterVolume(newVolume);
  };
  const handleVolumeChange = useCallback((trackId: string, newVolume: number) => {
    setVolumes(prevVolumes => ({ ...prevVolumes, [trackId]: newVolume }));
  }, []);
  
  const handleTransposeChange = (newTranspose: number) => {
    setTranspose(newTranspose);
    // Si está reproduciendo, necesita reaplicar el cambio
    if(isPlaying) {
      Object.values(trackNodesRef.current).forEach(node => {
        if(node.source) {
          const newPlaybackRate = Math.pow(2, newTranspose / 12);
          node.source.playbackRate.setValueAtTime(newPlaybackRate, audioContextRef.current!.currentTime);
        }
      });
    }
  }

  // --- Render ---
  const totalTracksForSong = activeTracks.length;
  const loadingProgress = totalTracksForSong > 0 ? ((totalTracksForSong - loadingTracks.length) / totalTracksForSong) * 100 : 0;
  const showLoadingBar = loadingTracks.length > 0 && totalTracksForSong > 0;
  
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
            onSeek={handleSeek}
            currentTime={playbackPosition}
            duration={duration}
            playbackMode={playbackMode}
            onPlaybackModeChange={setPlaybackMode}
            loadingProgress={loadingProgress}
            showLoadingBar={showLoadingBar}
            isReadyToPlay={isReadyToPlay}
            songStructure={songStructure}
            masterVolume={masterVolume}
            onMasterVolumeChange={handleMasterVolumeChange}
            transpose={transpose}
            onTransposeChange={handleTransposeChange}
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
              vuData={vuData}
              playbackMode={playbackMode}
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
            onSongsFetched={setSongs}
        />
        <TonicPad />
      </div>
    </div>
  );
};

export default DawPage;

    