
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
import * as Tone from 'tone';

export type PlaybackMode = 'online' | 'hybrid' | 'offline';

const eqFrequencies = [60, 250, 1000, 4000, 8000];
const MAX_EQ_GAIN = 12;

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

  const audioContextStarted = useRef(false);
  const trackNodesRef = useRef<Record<string, {
    player: Tone.Player;
    panner: Tone.Panner;
    volume: Tone.Volume;
    analyser: Tone.Analyser;
    pitchShift: Tone.PitchShift;
  }>>({});
  
  const masterVolumeNodeRef = useRef<Tone.Volume | null>(null);
  const eqNodesRef = useRef<Tone.Filter[]>([]);
  const [vuData, setVuData] = useState<Record<string, number>>({});
  const [loadingTracks, setLoadingTracks] = useState<string[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const animationFrameRef = useRef<number>();
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitch, setPitch] = useState(0); // New state for pitch shifting in semitones

  const [volumes, setVolumes] = useState<{ [key: string]: number }>({});
  const [pans, setPans] = useState<{ [key: string]: number }>({});
  const [masterVolume, setMasterVolume] = useState(100);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('hybrid');
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

  const [eqBands, setEqBands] = useState([50, 50, 50, 50, 50]);
  const [fadeOutDuration, setFadeOutDuration] = useState(0.5);
  const [isPanVisible, setIsPanVisible] = useState(true);
  
  const [isYouTubePlayerOpen, setIsYouTubePlayerOpen] = useState(false);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);

  const activeSong = songs.find(s => s.id === activeSongId);

  const initAudioContext = async () => {
    if (!audioContextStarted.current) {
        await Tone.start();
        audioContextStarted.current = true;
        console.log("Audio context started with Tone.js");
    }
  };

  useEffect(() => {
    if (Tone.context.state !== 'running') {
      initAudioContext();
    }

    if (!masterVolumeNodeRef.current) {
        masterVolumeNodeRef.current = new Tone.Volume(0).toDestination();
        
        let lastNode: Tone.InputNode = masterVolumeNodeRef.current;
        eqNodesRef.current = eqFrequencies.map((freq) => {
            const filter = new Tone.Filter(freq, 'peaking');
            filter.Q.value = 1.5;
            lastNode.connect(filter);
            lastNode = filter;
            return filter;
        });
        
        lastNode.connect(Tone.getDestination());
    }

    // Set master volume
    if (masterVolumeNodeRef.current) {
        masterVolumeNodeRef.current.volume.value = Tone.gainToDb(masterVolume / 100);
    }
  }, [masterVolume]);

  useEffect(() => {
    eqNodesRef.current.forEach((filter, i) => {
      const gainValue = (eqBands[i] / 100) * (MAX_EQ_GAIN * 2) - MAX_EQ_GAIN;
      filter.gain.value = gainValue;
    });
  }, [eqBands]);

  useEffect(() => {
    const activeTracksForSong = tracks.filter(t => t.songId === activeSongId);
    const allTracksLoaded = activeTracksForSong.length > 0 && activeTracksForSong.every(t => trackNodesRef.current[t.id]?.player.loaded);
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
  }, [initialSetlist]);

  useEffect(() => {
    if (!activeSongId) return;

    handleStop(true);

    const tracksForCurrentSong = tracks.filter(t => t.songId === activeSongId);
    if (tracksForCurrentSong.length === 0) {
      setIsReadyToPlay(false);
      setLoadingTracks([]);
      setDuration(0);
      return;
    }

    setLoadingTracks(tracksForCurrentSong.map(t => t.id));
    setIsReadyToPlay(false);

    const loadAudioData = async () => {
      await initAudioContext();
      let maxDuration = 0;

      const loadPromises = tracksForCurrentSong.map(async (track) => {
        try {
          if (trackNodesRef.current[track.id]) {
            trackNodesRef.current[track.id].player.dispose();
          }

          let audioBuffer: ArrayBuffer | null = null;
          
          if (playbackMode === 'hybrid' || playbackMode === 'offline') {
              audioBuffer = await getCachedArrayBuffer(track.url);
          }

          if (!audioBuffer) {
              const response = await fetch(`/api/download?url=${encodeURIComponent(track.url)}`);
              if (!response.ok) throw new Error(`Failed to download ${track.name}`);
              audioBuffer = await response.arrayBuffer();
              if (playbackMode === 'hybrid' || playbackMode === 'offline') {
                  await cacheArrayBuffer(track.url, audioBuffer.slice(0)); 
              }
          }

          const player = await new Promise<Tone.Player>((resolve, reject) => {
              const p = new Tone.Player(audioBuffer as AudioBuffer, () => resolve(p));
              p.onerror = (e) => reject(e);
          });
          
          if (player.buffer.duration > maxDuration) {
            maxDuration = player.buffer.duration;
          }

          const pitchShift = new Tone.PitchShift({ pitch: pitch }).toDestination();
          const panner = new Tone.Panner(0).connect(pitchShift);
          const volume = new Tone.Volume(0).connect(panner);
          const analyser = new Tone.Analyser('waveform', 256);
          player.connect(volume);
          player.connect(analyser);

          trackNodesRef.current[track.id] = { player, panner, volume, analyser, pitchShift };
        
        } catch (error) {
          console.error(`Error loading track ${track.name}:`, error);
          if(playbackMode === 'offline') {
            // Handle offline error - maybe show a toast
          }
        } finally {
           setLoadingTracks(prev => prev.filter(id => id !== track.id));
        }
      });

      await Promise.all(loadPromises);
      setDuration(maxDuration);
    };

    loadAudioData();

    return () => {
      Object.values(trackNodesRef.current).forEach(node => {
        node.player.dispose();
        node.panner.dispose();
        node.volume.dispose();
        node.analyser.dispose();
        node.pitchShift.dispose();
      });
      trackNodesRef.current = {};
    }
  }, [activeSongId, tracks, playbackMode]);

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

  useEffect(() => {
    const newVolumes: { [key: string]: number } = {};
    const newPans: { [key: string]: number } = {};
    tracks.forEach(track => {
      newVolumes[track.id] = volumes[track.id] ?? 75;
      newPans[track.id] = pans[track.id] ?? 0;
    });
    setVolumes(newVolumes);
    setPans(newPans);
  }, [tracks]);

  const updateVuMeters = useCallback(() => {
    if (!isPlayingRef.current) return;

    const newVuData: Record<string, number> = {};
    Object.keys(trackNodesRef.current).forEach(trackId => {
      const node = trackNodesRef.current[trackId];
      if (node && node.analyser) {
        const values = node.analyser.getValue();
        if(values instanceof Float32Array) {
            let peak = 0;
            for (let i = 0; i < values.length; i++) {
                peak = Math.max(peak, Math.abs(values[i]));
            }
            const dbfs = peak > 0 ? 20 * Math.log10(peak) : -60;
            const meterScale = (dbfs + 60) / 60 * 100;
            newVuData[trackId] = Math.max(0, meterScale);
        }
      }
    });
    setVuData(newVuData);
    
    const newPosition = Tone.Transport.seconds;
    if (newPosition <= duration) {
      setPlaybackPosition(newPosition);
    } else {
      handleStop();
    }

    animationFrameRef.current = requestAnimationFrame(updateVuMeters);
  }, [duration]);

  const getGainValue = useCallback((trackId: string) => {
    const isMuted = mutedTracks.includes(trackId);
    const isSoloActive = soloTracks.length > 0;
    const isThisTrackSolo = soloTracks.includes(trackId);
    const trackVolume = volumes[trackId] ?? 75;

    const trackVol = trackVolume / 100;

    if (isMuted) return 0;
    if (isSoloActive) return isThisTrackSolo ? trackVol : 0;
    return trackVol;
  }, [mutedTracks, soloTracks, volumes]);

  useEffect(() => {
    Object.keys(trackNodesRef.current).forEach(trackId => {
        const node = trackNodesRef.current[trackId];
        if (node?.volume) {
            const finalVolume = getGainValue(trackId);
            node.volume.volume.value = Tone.gainToDb(finalVolume);
        }
        if (node?.panner) {
            const panValue = pans[trackId] ?? 0;
            node.panner.pan.value = panValue;
        }
        if (node?.pitchShift) {
            node.pitchShift.pitch = pitch;
        }
    });
  }, [volumes, mutedTracks, soloTracks, getGainValue, pans, pitch]);
  
   useEffect(() => {
      Object.values(trackNodesRef.current).forEach(({ player }) => {
        player.playbackRate = playbackRate;
      });
      if(activeSong) {
        Tone.Transport.bpm.value = activeSong.tempo * playbackRate;
      }
  }, [playbackRate, activeSong]);


  const handlePlay = useCallback(async () => {
    if (!isReadyToPlay || isPlaying) return;

    await initAudioContext();
    if (Tone.context.state === 'suspended') {
      await Tone.context.resume();
    }
    
    Object.values(trackNodesRef.current).forEach(({player}) => {
        player.sync().start(0, playbackPosition);
    });

    Tone.Transport.seconds = playbackPosition;
    Tone.Transport.start();

    setIsPlaying(true);
    isPlayingRef.current = true;
    animationFrameRef.current = requestAnimationFrame(updateVuMeters);

  }, [isReadyToPlay, isPlaying, playbackPosition, updateVuMeters]);

  const handleFadeOutAndStop = useCallback((onStopComplete?: () => void) => {
    if (!isPlayingRef.current) {
        if(onStopComplete) onStopComplete();
        return;
    };
    
    Object.values(trackNodesRef.current).forEach(node => {
        node.volume.volume.rampTo(-Infinity, fadeOutDuration);
    });

    setTimeout(() => {
        Tone.Transport.stop();
        Object.values(trackNodesRef.current).forEach(node => node.player.unsync().stop());
        setIsPlaying(false);
        isPlayingRef.current = false;
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setVuData({});
        if (onStopComplete) {
            onStopComplete();
        }
    }, fadeOutDuration * 1000);

  }, [fadeOutDuration]);

  const handlePause = () => {
    if (!isPlaying) return;
    const newPosition = Tone.Transport.seconds;

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
            Tone.Transport.stop();
            Object.values(trackNodesRef.current).forEach(node => node.player.unsync().stop());
        }
        setIsPlaying(false);
        isPlayingRef.current = false;
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setPlaybackPosition(0);
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
      setPlaybackRate(1);
      setPitch(0);
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
  
  const handleBpmChange = (newBpm: number) => {
      if (!activeSong || !activeSong.tempo) return;
      const newRate = newBpm / activeSong.tempo;
      const clampedRate = Math.max(0.5, Math.min(2, newRate));
      setPlaybackRate(clampedRate);
  };

  const totalTracksForSong = tracks.filter(t => t.songId === activeSongId).length;
  const loadedTracksCount = totalTracksForSong - loadingTracks.length;
  const loadingProgress = totalTracksForSong > 0 ? (loadedTracksCount / totalTracksForSong) * 100 : 0;
  const showLoadingBar = loadingTracks.length > 0 && totalTracksForSong > 0;
  
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
            onBpmChange={handleBpmChange}
            pitch={pitch}
            onPitchChange={setPitch}
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
