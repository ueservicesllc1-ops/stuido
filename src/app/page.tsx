
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import { getSetlists, Setlist, SetlistSong } from '@/actions/setlists';
import { cacheArrayBuffer, getCachedArrayBuffer } from '@/lib/audiocache';
import { Song } from '@/actions/songs';
import { SongStructure } from '@/ai/flows/song-structure';
import LyricsDisplay from '@/components/LyricsDisplay';
import YouTubePlayerDialog from '@/components/YouTubePlayerDialog';
import type { LyricsSyncOutput } from '@/ai/flows/lyrics-synchronization';
import TeleprompterDialog from '@/components/TeleprompterDialog';

export type PlaybackMode = 'online' | 'hybrid' | 'offline';

// Definir las frecuencias para cada banda del EQ
const eqFrequencies = [60, 250, 1000, 4000, 8000];
const MAX_EQ_GAIN = 12; // Ganancia máxima de +12dB

const DawPage = () => {
  const [tracks, setTracks] = useState<SetlistSong[]>([]);
  const [soloTracks, setSoloTracks] = useState<string[]>([]);
  const [mutedTracks, setMutedTracks] = useState<string[]>([]);
  const [initialSetlist, setInitialSetlist] = useState<Setlist | null>(null);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songStructure, setSongStructure] = useState<SongStructure | null>(null);
  const [songLyrics, setSongLyrics] = useState<string | null>(null);
  const [songSyncedLyrics, setSongSyncedLyrics] = useState<LyricsSyncOutput | null>(null);
  const [songYoutubeUrl, setSongYoutubeUrl] = useState<string | null>(null);
  const [songSyncOffset, setSongSyncOffset] = useState<number>(0);


  // --- Web Audio API State ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackNodesRef = useRef<Record<string, {
    source: AudioBufferSourceNode;
    pannerNode: StereoPannerNode;
    gainNode: GainNode;
    analyserNode: AnalyserNode;
  }>>({});
  const masterGainNodeRef = useRef<GainNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const [vuData, setVuData] = useState<Record<string, number>>({});
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const [loadingTracks, setLoadingTracks] = useState<string[]>([]);

  // --- Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const animationFrameRef = useRef<number>();
  const playbackStartTimeRef = useRef(0);
  const playbackStartOffsetRef = useRef(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const [volumes, setVolumes] = useState<{ [key: string]: number }>({});
  const [pans, setPans] = useState<{ [key: string]: number }>({});
  const [masterVolume, setMasterVolume] = useState(100);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('hybrid');
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

  // --- EQ State ---
  const [eqBands, setEqBands] = useState([50, 50, 50, 50, 50]); // 5 bands, 0-100 values

  // --- Settings State ---
  const [fadeOutDuration, setFadeOutDuration] = useState(0.5); // Duración en segundos
  const [isPanVisible, setIsPanVisible] = useState(true);
  
  // --- Dialogs State ---
  const [isYouTubePlayerOpen, setIsYouTubePlayerOpen] = useState(false);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);


  // Initialize AudioContext and Master Chain
  useEffect(() => {
    if (!audioContextRef.current) {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;

            // --- Set up Master Track Chain ---
            masterGainNodeRef.current = context.createGain();
            
            // Create and connect EQ nodes
            let lastNode: AudioNode = masterGainNodeRef.current;
            eqNodesRef.current = eqFrequencies.map((freq, i) => {
                const filter = context.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                const gain = (eqBands[i] / 100) * (MAX_EQ_GAIN * 2) - MAX_EQ_GAIN;
                filter.gain.value = gain;
                filter.Q.value = 1.5; // Un Q razonable para empezar
                
                lastNode.connect(filter);
                lastNode = filter;
                return filter;
            });
            
            // Connect the end of the EQ chain to the destination
            lastNode.connect(context.destination);

        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
    }
  }, [eqBands]);

  // Update EQ gains when sliders change
  useEffect(() => {
    if (!audioContextRef.current || eqNodesRef.current.length === 0) return;

    eqBands.forEach((bandValue, i) => {
        if (eqNodesRef.current[i]) {
            // Convert slider value (0-100) to gain value (-12dB to +12dB)
            const gainValue = (bandValue / 100) * (MAX_EQ_GAIN * 2) - MAX_EQ_GAIN;
            eqNodesRef.current[i].gain.setValueAtTime(gainValue, audioContextRef.current!.currentTime);
        }
    });
  }, [eqBands]);


  // Set readiness to play
  useEffect(() => {
    const activeTracksForSong = tracks.filter(t => t.songId === activeSongId);
    // All tracks for the current song are loaded if they are in the audioBuffersRef
    const allTracksLoaded = activeTracksForSong.length > 0 && activeTracksForSong.every(t => audioBuffersRef.current[t.url]);
    setIsReadyToPlay(allTracksLoaded && loadingTracks.length === 0);
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
        setSongLyrics(null);
        setSongSyncedLyrics(null);
        setSongYoutubeUrl(null);
        setSongSyncOffset(0);
      }
    } else {
      setTracks([]);
      setActiveSongId(null);
      setSongStructure(null);
      setSongLyrics(null);
      setSongSyncedLyrics(null);
      setSongYoutubeUrl(null);
      setSongSyncOffset(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSetlist]);
  
  // Handle Master Volume
  useEffect(() => {
    if (masterGainNodeRef.current && audioContextRef.current) {
        const finalVolume = masterVolume / 100;
        masterGainNodeRef.current.gain.setValueAtTime(finalVolume, audioContextRef.current.currentTime);
    }
  }, [masterVolume]);


  // Lógica de carga de canciones y preparación de audios
  useEffect(() => {
    if (!activeSongId || !audioContextRef.current) {
      return;
    }
  
    handleStop(true); // Detiene la reproducción actual
  
    const tracksForCurrentSong = tracks.filter(t => t.songId === activeSongId);
    if (tracksForCurrentSong.length === 0) {
      setIsReadyToPlay(false);
      setLoadingTracks([]);
      setDuration(0);
      return;
    }
  
    const allTracksInMemory = tracksForCurrentSong.every(t => audioBuffersRef.current[t.url]);
    if (allTracksInMemory) {
        const maxDuration = Math.max(0, ...tracksForCurrentSong.map(t => audioBuffersRef.current[t.url]?.duration || 0));
        setDuration(maxDuration);
        setLoadingTracks([]); 
        setIsReadyToPlay(true);
        return;
    }
  
    const tracksToLoad = tracksForCurrentSong.filter(t => !audioBuffersRef.current[t.url]);
    
    setLoadingTracks(tracksToLoad.map(t => t.id));
    setIsReadyToPlay(false);
  
    const loadAudioData = async () => {
      const context = audioContextRef.current!;
      let maxDuration = Math.max(0, ...tracksForCurrentSong
        .filter(t => audioBuffersRef.current[t.url])
        .map(t => audioBuffersRef.current[t.url].duration));
  
      await Promise.all(tracksToLoad.map(async (track) => {
        try {
          let audioData: ArrayBuffer | null = null;
          if (playbackMode !== 'online') {
            audioData = await getCachedArrayBuffer(track.url);
          }
  
          if (!audioData) {
            const proxyUrl = `/api/download?url=${encodeURIComponent(track.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${track.url}`);
            
            audioData = await response.arrayBuffer();
  
            if (playbackMode !== 'online') {
              cacheArrayBuffer(track.url, audioData.slice(0));
            }
          }
          
          const decodedBuffer = await context.decodeAudioData(audioData);
          audioBuffersRef.current[track.url] = decodedBuffer;
  
          if (decodedBuffer.duration > maxDuration) {
            maxDuration = decodedBuffer.duration;
          }
  
        } catch (error) {
          console.error(`Error loading track ${track.name}:`, error);
        } finally {
           setLoadingTracks(prev => prev.filter(id => id !== track.id));
        }
      }));
      
      setDuration(maxDuration);
    };
  
    loadAudioData();
  
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongId, tracks, playbackMode]);

  // This effect updates song metadata without triggering audio reloading
  useEffect(() => {
    if (activeSongId) {
        const currentSong = songs.find(s => s.id === activeSongId);
        setSongStructure(currentSong?.structure || null);
        setSongLyrics(currentSong?.lyrics || null);
        setSongSyncedLyrics(currentSong?.syncedLyrics || null);
        setSongYoutubeUrl(currentSong?.youtubeUrl || null);
        setSongSyncOffset(currentSong?.syncOffset || 0);
    }
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
    const analyserBuffers: Record<string, Float32Array> = {};

    // First, create all the data arrays to avoid re-allocation in loop
    Object.keys(trackNodesRef.current).forEach(trackId => {
        const node = trackNodesRef.current[trackId];
        if (node && node.analyserNode) {
            analyserBuffers[trackId] = new Float32Array(node.analyserNode.fftSize);
        }
    });

    Object.keys(trackNodesRef.current).forEach(trackId => {
      const node = trackNodesRef.current[trackId];
      if (node && node.analyserNode) {
        const dataArray = analyserBuffers[trackId];
        node.analyserNode.getFloatTimeDomainData(dataArray);
        
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
            peak = Math.max(peak, Math.abs(dataArray[i]));
        }

        const dbfs = peak > 0 ? 20 * Math.log10(peak) : -60;
        const meterScale = (dbfs + 60) / 60 * 100;
        newVuData[trackId] = Math.max(0, meterScale);
      }
    });
    setVuData(newVuData);
    
    const elapsedTime = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * playbackRate;
    const newPosition = playbackStartOffsetRef.current + elapsedTime;
    if (newPosition <= duration) {
      setPlaybackPosition(newPosition);
    } else {
      handleStop();
    }

    animationFrameRef.current = requestAnimationFrame(updateVuMeters);
  }, [duration, playbackRate]);

  const getGainValue = useCallback((trackId: string) => {
    const isMuted = mutedTracks.includes(trackId);
    const isSoloActive = soloTracks.length > 0;
    const isThisTrackSolo = soloTracks.includes(trackId);
    const trackVolume = volumes[trackId] ?? 75;

    const trackVol = trackVolume / 100;

    let finalVolume = 0;
    if (isMuted) {
      finalVolume = 0;
    } else if (isSoloActive) {
      finalVolume = isThisTrackSolo ? trackVol : 0;
    } else {
      finalVolume = trackVol;
    }
    return finalVolume;
  }, [mutedTracks, soloTracks, volumes]);

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
  }, [volumes, mutedTracks, soloTracks, getGainValue, pans]);

  useEffect(() => {
      if (!audioContextRef.current) return;
      const context = audioContextRef.current;
      Object.keys(trackNodesRef.current).forEach(trackId => {
          const node = trackNodesRef.current[trackId];
          if (node?.source) {
              node.source.playbackRate.setValueAtTime(playbackRate, context.currentTime);
          }
      });
  }, [playbackRate]);


  const handlePlay = useCallback(() => {
    if (!isReadyToPlay || isPlaying || !audioContextRef.current || !masterGainNodeRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    
    const context = audioContextRef.current;
    const newTrackNodes: typeof trackNodesRef.current = {};
    const now = context.currentTime;

    playbackStartTimeRef.current = now;
    playbackStartOffsetRef.current = playbackPosition;

    activeTracks.forEach(track => {
      const buffer = audioBuffersRef.current[track.url];
      if (buffer) {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        
        const pannerNode = context.createStereoPanner();
        const gainNode = context.createGain();
        const analyserNode = context.createAnalyser();
        
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.2;
        
        // Conectar la cadena de la pista
        source.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(analyserNode);
        // Conectar el analizador al nodo maestro en lugar del destino
        analyserNode.connect(masterGainNodeRef.current!);
        
        const finalVolume = getGainValue(track.id);
        const panValue = pans[track.id] ?? 0;

        pannerNode.pan.setValueAtTime(panValue, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(finalVolume, now + 0.01);
        
        source.start(now, playbackPosition);

        newTrackNodes[track.id] = { source, pannerNode, gainNode, analyserNode };
      }
    });

    trackNodesRef.current = newTrackNodes;
    setIsPlaying(true);
    isPlayingRef.current = true;
    animationFrameRef.current = requestAnimationFrame(updateVuMeters);

  }, [isReadyToPlay, isPlaying, activeTracks, playbackPosition, getGainValue, pans, updateVuMeters, playbackRate]);

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
    const elapsedTime = (context.currentTime - playbackStartTimeRef.current) * playbackRate;
    const newPosition = playbackStartOffsetRef.current + elapsedTime;

    handleFadeOutAndStop(() => {
      if (newPosition < duration) {
        setPlaybackPosition(newPosition);
      } else {
        setPlaybackPosition(0);
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
  
    const wasPlaying = isPlaying;
    if (wasPlaying) {
      handleStop(true);
    }
  
    setPlaybackPosition(newPosition);
  
    if (wasPlaying) {
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
      setPlaybackRate(1); // Reset playback rate on song change
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

  const handleEqChange = (bandIndex: number, newValue: number) => {
    setEqBands(prevBands => {
      const newBands = [...prevBands];
      newBands[bandIndex] = newValue;
      return newBands;
    });
  };

  const handleEqReset = () => {
    setEqBands([50, 50, 50, 50, 50]);
  };

  // --- Render ---
  const totalTracksForSong = tracks.filter(t => t.songId === activeSongId).length;
  const loadedTracksCount = totalTracksForSong - loadingTracks.length;
  const loadingProgress = totalTracksForSong > 0 ? (loadedTracksCount / totalTracksForSong) * 100 : 0;
  const showLoadingBar = loadingTracks.length > 0 && totalTracksForSong > 0;
  
  const activeSong = songs.find(s => s.id === activeSongId);
  
  return (
    <div className="grid grid-cols-[1fr_384px] grid-rows-[auto_auto_1fr] h-screen w-screen p-4 gap-4">
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
            fadeOutDuration={fadeOutDuration}
            onFadeOutDurationChange={setFadeOutDuration}
            isPanVisible={isPanVisible}
            onPanVisibilityChange={setIsPanVisible}
            activeSong={activeSong}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
        />
      </div>

      <div className="col-span-2 row-start-2 h-32">
        <LyricsDisplay 
            lyrics={songLyrics}
            youtubeUrl={songYoutubeUrl}
            onOpenYouTube={() => setIsYouTubePlayerOpen(true)}
            onOpenTeleprompter={() => setIsTeleprompterOpen(true)}
            eqBands={eqBands}
            onEqChange={handleEqChange}
            onReset={handleEqReset}
        />
      </div>
      
      <main className="col-start-1 row-start-3 overflow-y-auto pr-2 no-scrollbar">
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

       <div className="col-start-2 row-start-3 flex flex-col gap-4">
        <SongList 
            initialSetlist={initialSetlist}
            activeSongId={activeSongId}
            onSetlistSelected={handleSetlistSelected}
            onSongSelected={handleSongSelected}
            onSongsFetched={setSongs}
        />
        <TonicPad />
      </div>

      <YouTubePlayerDialog
        isOpen={isYouTubePlayerOpen}
        onClose={() => setIsYouTubePlayerOpen(false)}
        videoUrl={songYoutubeUrl}
        songTitle={activeSong?.name || 'Video de YouTube'}
       />
       <TeleprompterDialog
        isOpen={isTeleprompterOpen}
        onClose={() => setIsTeleprompterOpen(false)}
        songTitle={activeSong?.name || 'Teleprompter'}
        lyrics={songLyrics}
      />
    </div>
  );
};

export default DawPage;

    