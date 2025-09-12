
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
    pannerNode: StereoPannerNode;
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
  const [pans, setPans] = useState<{ [key: string]: number }>({});
  const [masterVolume, setMasterVolume] = useState(100);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('hybrid');
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

  // --- Settings State ---
  const [fadeOutDuration, setFadeOutDuration] = useState(0.5); // Duración en segundos
  const [isPanVisible, setIsPanVisible] = useState(true);

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
            // Clear any existing timer to avoid duplicates
            if (clickSchedulerRef.current) {
                clearTimeout(clickSchedulerRef.current);
            }
            clickScheduler();
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

  // Inicializa volúmenes y paneos
  useEffect(() => {
    const newVolumes: { [key: string]: number } = {};
    const newPans: { [key: string]: number } = {};
    tracks.forEach(track => {
      newVolumes[track.id] = volumes[track.id] ?? 75;
      newPans[track.id] = pans[track.id] ?? 0;
    });
    setVolumes(newVolumes);
    setPans(newPans);
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
        // Use getByteFrequencyData for a better peak detection for VU meters
        node.analyserNode.getByteFrequencyData(dataArray);
        
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > peak) {
            peak = dataArray[i];
          }
        }
        
        // Normalize the peak (0-255) to a 0-100 scale.
        // A non-linear scale can make it feel more responsive.
        const normalizedPeak = (peak / 255) * 100;
        newVuData[trackId] = Math.min(100, normalizedPeak * 1.2); 
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
        if (node?.gainNode) {
            const finalVolume = getGainValue(trackId);
            node.gainNode.gain.setValueAtTime(finalVolume, context.currentTime);
        }
        if (node?.pannerNode) {
            const panValue = pans[trackId] ?? 0;
            node.pannerNode.pan.setValueAtTime(panValue, context.currentTime);
        }
    });
  }, [volumes, masterVolume, mutedTracks, soloTracks, getGainValue, pans]);


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
        
        const pannerNode = context.createStereoPanner();
        const gainNode = context.createGain();
        const analyserNode = context.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.1; // More responsive for peaks
        
        source.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(analyserNode);
        analyserNode.connect(context.destination);
        
        const finalVolume = getGainValue(track.id);
        const panValue = pans[track.id] ?? 0;

        pannerNode.pan.setValueAtTime(panValue, now);
        gainNode.gain.setValueAtTime(0, now); // Empezar en silencio
        gainNode.gain.linearRampToValueAtTime(finalVolume, now + fadeOutDuration); // Fade in
        
        source.start(now, playbackPosition);

        newTrackNodes[track.id] = { source, pannerNode, gainNode, analyserNode };
      }
    });

    trackNodesRef.current = newTrackNodes;
    setIsPlaying(true);
    isPlayingRef.current = true;
    animationFrameRef.current = requestAnimationFrame(updateVuMeters);

  }, [isReadyToPlay, isPlaying, activeTracks, audioBuffers, playbackPosition, fadeOutDuration, getGainValue, pans, updateVuMeters]);

  const handleFadeOutAndStop = useCallback((onStopComplete?: () => void) => {
    if (!audioContextRef.current || !isPlayingRef.current) {
        if(onStopComplete) onStopComplete();
        return;
    };
    const context = audioContextRef.current;
    const now = context.currentTime;
    
    Object.values(trackNodesRef.current).forEach(node => {
        if (node.source) {
            node.gainNode.gain.cancelScheduledValues(now);
            node.gainNode.gain.setValueAtTime(node.gainNode.gain.value, now);
            node.gainNode.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
            try {
              node.source.stop(now + fadeOutDuration);
            } catch(e) {
              console.warn("Audio source already stopped", e);
            }
        }
    });

    setTimeout(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        trackNodesRef.current = {};
        setVuData({});
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
      if (newPosition < duration) {
        setPlaybackPosition(newPosition);
      } else {
        setPlaybackPosition(0); // or duration, depending on desired behavior
      }
    });
  };
  
  const handleStop = (immediate = false) => {
    if (immediate) {
        if (isPlayingRef.current) {
            Object.values(trackNodesRef.current).forEach(node => {
                try {
                  node.source?.stop();
                } catch(e) {
                   console.warn("Audio source already stopped", e);
                }
            });
        }
        setIsPlaying(false);
        isPlayingRef.current = false;
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setPlaybackPosition(0);
        trackNodesRef.current = {};
        setVuData({});
    } else if (isPlaying) {
        handleFadeOutAndStop(() => {
            setPlaybackPosition(0);
        });
    } else {
        setPlaybackPosition(0);
    }
  };
  
  const handleSeek = (newPosition: number) => {
    if (!isReadyToPlay || newPosition < 0 || newPosition > duration) return;
  
    setPlaybackPosition(newPosition);
  
    if (isPlaying) {
      handleStop(true);
      // Use a timeout to ensure the state has updated before playing again
      setTimeout(() => {
        handlePlay();
      }, 50);
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

  const handlePanChange = useCallback((trackId: string, newPan: number) => {
    setPans(prevPans => ({ ...prevPans, [trackId]: newPan }));
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
    <div className="grid grid-cols-[1fr_480px] grid-rows-[auto_1fr] h-screen w-screen p-4 gap-4">
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
            isPanVisible={isPanVisible}
            onPanVisibilityChange={setIsPanVisible}
        />
      </div>
      
      <main className="col-start-1 row-start-2 overflow-y-auto pr-2 no-scrollbar">
        {activeSongId ? (
            <MixerGrid
              tracks={activeTracks}
              soloTracks={soloTracks}
              mutedTracks={mutedTracks}
              volumes={volumes}
              pans={pans}
              loadingTracks={loadingTracks}
              onMuteToggle={handleMuteToggle}
              onSoloToggle={handleSoloToggle}
              onVolumeChange={handleVolumeChange}
              onPanChange={handlePanChange}
              isPlaying={isPlaying}
              vuData={vuData}
              playbackMode={playbackMode}
              isPanVisible={isPanVisible}
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

    

    
