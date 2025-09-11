
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
export type ClickSound = 'beep' | 'click';

const DawPage = () => {
  const [tracks, setTracks] = useState<SetlistSong[]>([]);
  const [soloTracks, setSoloTracks] = useState<string[]>([]);
  const [mutedTracks, setMutedTracks] = useState<string[]>([]);
  const [initialSetlist, setInitialSetlist] = useState<Setlist | null>(null);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songStructure, setSongStructure] = useState<SongStructure | null>(null);
  const [songTempo, setSongTempo] = useState<number | null>(null);

  // --- Web Audio API State ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackNodesRef = useRef<Record<string, {
    source: AudioBufferSourceNode;
    gainNode: GainNode;
    analyserNode: AnalyserNode;
  }>>({});
  const [vuData, setVuData] = useState<Record<string, number>>({});
  const [audioBuffers, setAudioBuffers] = useState<Record<string, AudioBuffer>>({});
  const [loadingTracks, setLoadingTracks] = useState<string[]>([]);

  // --- Metronome State ---
  const [isClickEnabled, setIsClickEnabled] = useState(false);
  const [clickVolume, setClickVolume] = useState(75);
  const [clickTempo, setClickTempo] = useState(150);
  const [clickSound, setClickSound] = useState<ClickSound>('beep');
  const isClickEnabledRef = useRef(isClickEnabled);
  const clickSchedulerRef = useRef<number | null>(null);
  const nextClickTimeRef = useRef(0);
  const clickGainNodeRef = useRef<GainNode | null>(null);

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

  // --- Settings State ---
  const [fadeOutDuration, setFadeOutDuration] = useState(0.5); // Duración en segundos

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;
            clickGainNodeRef.current = context.createGain();
            clickGainNodeRef.current.connect(context.destination);
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
    }
  }, []);

  // Set readiness to play
  useEffect(() => {
    const activeTracksForSong = tracks.filter(t => t.songId === activeSongId);
    // All tracks loaded
    const allTracksLoaded = loadingTracks.length === 0 && activeTracksForSong.length > 0;
    setIsReadyToPlay(allTracksLoaded);
  }, [loadingTracks, tracks, activeSongId]);


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
        setSongTempo(null);
      }
    } else {
      setTracks([]);
      setActiveSongId(null);
      setSongStructure(null);
      setSongTempo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSetlist]);
  
  const clickScheduler = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || !isClickEnabledRef.current) return;

    while (nextClickTimeRef.current < context.currentTime + 0.1) {
        const osc = context.createOscillator();
        const clickGain = context.createGain();
        
        osc.connect(clickGain);
        clickGain.connect(clickGainNodeRef.current!);
        
        if (clickSound === 'beep') {
            osc.frequency.setValueAtTime(1000, nextClickTimeRef.current);
            clickGain.gain.setValueAtTime(1, nextClickTimeRef.current);
            clickGain.gain.exponentialRampToValueAtTime(0.001, nextClickTimeRef.current + 0.05);
        } else { // click
            osc.frequency.setValueAtTime(1500, nextClickTimeRef.current);
            clickGain.gain.setValueAtTime(1, nextClickTimeRef.current);
            clickGain.gain.exponentialRampToValueAtTime(0.001, nextClickTimeRef.current + 0.02);
        }

        osc.start(nextClickTimeRef.current);
        osc.stop(nextClickTimeRef.current + 0.05);

        const secondsPerBeat = 60.0 / clickTempo;
        nextClickTimeRef.current += secondsPerBeat;
    }
    clickSchedulerRef.current = window.setTimeout(clickScheduler, 25);
  }, [clickTempo, clickSound]);
  
  useEffect(() => {
    isClickEnabledRef.current = isClickEnabled;

    if (isClickEnabled) {
        if (audioContextRef.current) {
            const context = audioContextRef.current;
            if (context.state === 'suspended') {
                context.resume();
            }
            nextClickTimeRef.current = context.currentTime;
            clickSchedulerRef.current = window.setTimeout(clickScheduler, 0);
        }
    } else {
        if (clickSchedulerRef.current) {
            clearTimeout(clickSchedulerRef.current);
            clickSchedulerRef.current = null;
        }
    }

    return () => {
        if (clickSchedulerRef.current) {
            clearTimeout(clickSchedulerRef.current);
        }
    };
  }, [isClickEnabled, clickScheduler]);

  useEffect(() => {
    if (clickGainNodeRef.current && audioContextRef.current) {
        const finalVolume = (clickVolume / 100) * (masterVolume / 100);
        clickGainNodeRef.current.gain.setValueAtTime(finalVolume, audioContextRef.current.currentTime);
    }
  }, [clickVolume, masterVolume]);


  // Lógica de carga de canciones y preparación de audios
  useEffect(() => {
    if (!activeSongId || !audioContextRef.current) {
      return;
    }

    const currentSong = songs.find(s => s.id === activeSongId);
    setSongStructure(currentSong?.structure || null);
    setSongTempo(currentSong?.tempo || null);
    
    handleStop(true); // Stop without fade on song change
    const tracksForSong = tracks.filter(t => t.songId === activeSongId);
    setLoadingTracks(tracksForSong.map(t => t.id));

    const loadAudioData = async () => {
      const newAudioBuffers: Record<string, AudioBuffer> = {};
      let maxDuration = 0;
      
      await Promise.all(tracksForSong.map(async (track) => {
        try {
          let audioData: ArrayBuffer;
          let blob = await getCachedAudio(track.url);
          
          if (!blob) {
            const proxyUrl = `/api/download?url=${encodeURIComponent(track.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${track.url}`);
            blob = await response.blob();
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
          const value = Math.abs(dataArray[i] - 128);
          if (value > peak) {
            peak = value;
          }
        }
        
        const normalizedPeak = (peak / 128) * 100;
        newVuData[trackId] = Math.min(100, normalizedPeak * 1.5);
      }
    });
    setVuData(newVuData);
    
    const elapsedTime = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    const newPosition = playbackStartOffsetRef.current + elapsedTime;
    if (newPosition <= duration) {
      setPlaybackPosition(newPosition);
    } else {
      handleStop();
    }

    animationFrameRef.current = requestAnimationFrame(updateVuMeters);
  }, [duration]); // eslint-disable-line react-hooks/exhaustive-deps

  const getGainValue = useCallback((trackId: string) => {
    const isMuted = mutedTracks.includes(trackId);
    const isSoloActive = soloTracks.length > 0;
    const isThisTrackSolo = soloTracks.includes(trackId);
    const trackVolume = volumes[trackId] ?? 75;

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
    return finalVolume;
  }, [masterVolume, mutedTracks, soloTracks, volumes]);

  useEffect(() => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    Object.keys(trackNodesRef.current).forEach(trackId => {
        const node = trackNodesRef.current[trackId];
        if (node && node.gainNode) {
            const finalVolume = getGainValue(trackId);
            // No usamos ramp aquí para cambios de volumen instantáneos durante la reproducción
            node.gainNode.gain.setValueAtTime(finalVolume, context.currentTime);
        }
    });
  }, [volumes, masterVolume, mutedTracks, soloTracks, getGainValue]);


  const handlePlay = useCallback(() => {
    if (!isReadyToPlay || isPlaying || !audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    
    const context = audioContextRef.current;
    const newTrackNodes: typeof trackNodesRef.current = {};
    const now = context.currentTime;

    playbackStartTimeRef.current = now;
    playbackStartOffsetRef.current = playbackPosition;

    activeTracks.forEach(track => {
      const buffer = audioBuffers[track.id];
      if (buffer) {
        const source = context.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = context.createGain();
        const analyserNode = context.createAnalyser();
        analyserNode.fftSize = 256;
        
        source.connect(gainNode);
        gainNode.connect(analyserNode);
        analyserNode.connect(context.destination);
        
        const finalVolume = getGainValue(track.id);
        gainNode.gain.setValueAtTime(0, now); // Empezar en silencio
        gainNode.gain.linearRampToValueAtTime(finalVolume, now + fadeOutDuration); // Fade in
        
        source.start(now, playbackPosition);

        newTrackNodes[track.id] = { source, gainNode, analyserNode };
      }
    });

    trackNodesRef.current = newTrackNodes;
    setIsPlaying(true);
  }, [isReadyToPlay, isPlaying, activeTracks, audioBuffers, playbackPosition, fadeOutDuration, getGainValue]);

  const handleFadeOutAndStop = useCallback((onStopComplete?: () => void) => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    const now = context.currentTime;
    
    Object.values(trackNodesRef.current).forEach(node => {
        if (node.source) {
            // Empezar el fade out desde el valor actual
            node.gainNode.gain.cancelScheduledValues(now);
            node.gainNode.gain.setValueAtTime(node.gainNode.gain.value, now);
            node.gainNode.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
            node.source.stop(now + fadeOutDuration);
        }
    });

    // Esperar a que termine el fade out para limpiar
    setTimeout(() => {
        setIsPlaying(false);
        trackNodesRef.current = {};
        if (onStopComplete) {
            onStopComplete();
        }
    }, fadeOutDuration * 1000);

  }, [fadeOutDuration]);

  const handlePause = () => {
    if (!isPlaying || !audioContextRef.current) return;
    
    const context = audioContextRef.current;
    const elapsedTime = context.currentTime - playbackStartTimeRef.current;
    const newPosition = playbackStartOffsetRef.current + elapsedTime;

    handleFadeOutAndStop(() => {
      setPlaybackPosition(newPosition);
    });
  };
  
  const handleStop = (immediate = false) => {
    if (immediate) {
        if (isPlaying) {
            Object.values(trackNodesRef.current).forEach(node => {
                node.source?.stop();
            });
        }
        setIsPlaying(false);
        setPlaybackPosition(0);
        trackNodesRef.current = {};
    } else if (isPlaying) {
        handleFadeOutAndStop(() => {
            setPlaybackPosition(0);
        });
    } else { // Si no está sonando, simplemente resetea la posición
        setPlaybackPosition(0);
    }
  };
  
  const handleSeek = (newPosition: number) => {
    if (!isReadyToPlay || newPosition < 0 || newPosition > duration) return;

    const wasPlaying = isPlaying;
    if (wasPlaying) {
      // Detener con fade out antes de buscar una nueva posición
      handleFadeOutAndStop(() => {
        setPlaybackPosition(newPosition);
        // Volver a reproducir con fade in desde la nueva posición
        setTimeout(() => {
            if (audioContextRef.current) { // Comprobar que el contexto sigue ahí
                const context = audioContextRef.current;
                if (context.state === 'suspended') {
                    context.resume();
                }
                
                const newTrackNodes: typeof trackNodesRef.current = {};
                const now = context.currentTime;
    
                playbackStartTimeRef.current = now;
                playbackStartOffsetRef.current = newPosition;
    
                activeTracks.forEach(track => {
                  const buffer = audioBuffers[track.id];
                  if (buffer) {
                    const source = context.createBufferSource();
                    source.buffer = buffer;
                    const gainNode = context.createGain();
                    const analyserNode = context.createAnalyser();
                    analyserNode.fftSize = 256;
                    source.connect(gainNode).connect(analyserNode).connect(context.destination);
                    
                    const finalVolume = getGainValue(track.id);
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(finalVolume, now + fadeOutDuration);
                    
                    source.start(now, newPosition);
                    newTrackNodes[track.id] = { source, gainNode, analyserNode };
                  }
                });
    
                trackNodesRef.current = newTrackNodes;
                setIsPlaying(true);
            }
        }, 50); // Pequeño delay para asegurar que todo se ha limpiado
      });
    } else {
        // Si no estaba sonando, simplemente actualiza la posición
        setPlaybackPosition(newPosition);
    }
  };

  const handleRewind = () => handleSeek(Math.max(0, playbackPosition - 5));
  const handleFastForward = () => handleSeek(Math.min(duration, playbackPosition + 5));

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
        handleStop(true);
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

  const handleToggleClick = () => {
    const context = audioContextRef.current;
    if (context && context.state === 'suspended') {
        context.resume();
    }
    setIsClickEnabled(prev => !prev);
  }

  // --- Render ---
  const totalTracksForSong = activeTracks.length;
  const loadedTracksCount = totalTracksForSong - loadingTracks.length;
  const loadingProgress = totalTracksForSong > 0 ? (loadedTracksCount / totalTracksForSong) * 100 : 0;
  const showLoadingBar = loadingTracks.length > 0 && totalTracksForSong > 0;
  
  return (
    <div className="grid grid-cols-[1fr_320px] grid-rows-[auto_1fr] h-screen w-screen p-4 gap-4">
      <div className="col-span-2 row-start-1">
        <Header 
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={() => handleStop()}
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
            isClickEnabled={isClickEnabled}
            onToggleClick={handleToggleClick}
            clickVolume={clickVolume}
            onClickVolumeChange={setClickVolume}
            clickTempo={clickTempo}
            onTempoChange={setClickTempo}
            songTempo={songTempo}
            clickSound={clickSound}
            onClickSoundChange={setClickSound}
            fadeOutDuration={fadeOutDuration}
            onFadeOutDurationChange={setFadeOutDuration}
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

    