
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
  const [clickTempo, setClickTempo] = useState(120);
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
    // All non-click tracks loaded
    const allTracksLoaded = loadingTracks.filter(id => !id.endsWith('_CLICK')).length === 0 && activeTracksForSong.length > 0;
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
      }
    } else {
      setTracks([]);
      setActiveSongId(null);
      setSongStructure(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSetlist]);
  
  const clickScheduler = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || !isPlayingRef.current) return;

    while (nextClickTimeRef.current < context.currentTime + 0.1) {
        if (nextClickTimeRef.current >= playbackStartTimeRef.current + playbackStartOffsetRef.current) {
            const timeRelativeToStart = nextClickTimeRef.current - (playbackStartTimeRef.current + playbackStartOffsetRef.current);
            const playbackTime = context.currentTime - timeRelativeToStart;
            
            const osc = context.createOscillator();
            const clickGain = context.createGain();
            
            osc.connect(clickGain);
            clickGain.connect(clickGainNodeRef.current!);
            
            osc.frequency.setValueAtTime(1000, playbackTime);
            clickGain.gain.setValueAtTime(1, playbackTime);
            clickGain.gain.exponentialRampToValueAtTime(0.001, playbackTime + 0.05);

            osc.start(playbackTime);
            osc.stop(playbackTime + 0.05);
        }
        const secondsPerBeat = 60.0 / clickTempo;
        nextClickTimeRef.current += secondsPerBeat;
    }
    clickSchedulerRef.current = window.setTimeout(clickScheduler, 25);
  }, [clickTempo]);
  
  useEffect(() => {
    if (isPlaying && isClickEnabled) {
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
  }, [isPlaying, isClickEnabled, clickScheduler]);

  useEffect(() => {
    if (clickGainNodeRef.current) {
        const isMuted = mutedTracks.includes(`${activeSongId}_CLICK`);
        const finalVolume = isClickEnabled && !isMuted ? (clickVolume / 100) * (masterVolume / 100) : 0;
        clickGainNodeRef.current.gain.setValueAtTime(finalVolume, audioContextRef.current!.currentTime);
    }
  }, [clickVolume, isClickEnabled, mutedTracks, activeSongId, masterVolume]);


  // Lógica de carga de canciones y preparación de audios
  useEffect(() => {
    if (!activeSongId || !audioContextRef.current) {
      return;
    }

    const currentSong = songs.find(s => s.id === activeSongId);
    setSongStructure(currentSong?.structure || null);
    if (currentSong?.tempo) {
        setClickTempo(currentSong.tempo);
    }
    
    handleStop();
    const tracksForSong = tracks.filter(t => t.songId === activeSongId && t.name.toUpperCase() !== 'CLICK');
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

  useEffect(() => {
    if (isPlaying) {
      isPlayingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(updateVuMeters);
    } else {
      isPlayingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
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
    Object.values(trackNodesRef.current).forEach(node => {
        if (node && node.gainNode && audioContextRef.current) {
            const trackId = Object.keys(trackNodesRef.current).find(key => trackNodesRef.current[key] === node)!;
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
            node.gainNode.gain.setValueAtTime(finalVolume, audioContextRef.current.currentTime);
        }
    });
  }, [volumes, masterVolume, mutedTracks, soloTracks]);


  const handlePlay = useCallback(() => {
    if (!isReadyToPlay || isPlaying || !audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    
    const context = audioContextRef.current;
    const newTrackNodes: typeof trackNodesRef.current = {};

    playbackStartTimeRef.current = context.currentTime;
    playbackStartOffsetRef.current = playbackPosition;

    activeTracks.forEach(track => {
      if (track.name.toUpperCase() === 'CLICK') return;
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
        
        source.start(0, playbackPosition);

        newTrackNodes[track.id] = { source, gainNode, analyserNode };
      }
    });

    trackNodesRef.current = newTrackNodes;
    setIsPlaying(true);
  }, [isReadyToPlay, isPlaying, activeTracks, audioBuffers, playbackPosition]);

  const handlePause = () => {
    if (!isPlaying || !audioContextRef.current) return;
    
    Object.values(trackNodesRef.current).forEach(node => {
        node.source?.stop();
    });

    const elapsedTime = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    playbackStartOffsetRef.current += elapsedTime;
    setPlaybackPosition(playbackStartOffsetRef.current);
    
    setIsPlaying(false);
    trackNodesRef.current = {};
  };
  
  const handleStop = () => {
    if (isPlaying) {
      Object.values(trackNodesRef.current).forEach(node => {
          node.source?.stop();
      });
    }
    setIsPlaying(false);
    setPlaybackPosition(0);
    playbackStartOffsetRef.current = 0;
    trackNodesRef.current = {};
  };
  
  const handleSeek = (newPosition: number) => {
    if (!isReadyToPlay || newPosition < 0 || newPosition > duration) return;

    const wasPlaying = isPlaying;
    if (wasPlaying) {
      handlePause();
    }
    playbackStartOffsetRef.current = newPosition;
    setPlaybackPosition(newPosition);

    if (wasPlaying) {
       setTimeout(handlePlay, 50); 
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

  // --- Render ---
  const totalTracksForSong = activeTracks.filter(t => t.name.toUpperCase() !== 'CLICK').length;
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
            isClickEnabled={isClickEnabled}
            onToggleClick={() => setIsClickEnabled(prev => !prev)}
            clickVolume={clickVolume}
            onClickVolumeChange={setClickVolume}
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
