
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import { getSetlists, Setlist, SetlistSong } from '@/actions/setlists';
import { Song } from '@/actions/songs';
import { SongStructure } from '@/ai/flows/song-structure';
import LyricsDisplay from '@/components/LyricsDisplay';
import YouTubePlayerDialog from '@/components/YouTubePlayerDialog';
import type { LyricsSyncOutput } from '@/ai/flows/lyrics-synchronization';
import TeleprompterDialog from '@/components/TeleprompterDialog';
import { getCachedArrayBuffer, cacheArrayBuffer } from '@/lib/audiocache';

const eqFrequencies = [60, 250, 1000, 4000, 8000];
const MAX_EQ_GAIN = 12;

type ToneModule = typeof import('tone');
type PlaybackMode = 'online' | 'cache';
type TrackNodes = Record<string, {
    player: import('tone').Player;
    panner: import('tone').Panner;
    analyser: import('tone').Analyser;
    pitchShift: import('tone').PitchShift;
}>;


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

  const activeSong = songs.find(s => s.id === activeSongId);
  const audioContextStarted = useRef(false);
  const trackNodesRef = useRef<TrackNodes>({});
  
  const toneRef = useRef<ToneModule | null>(null);
  const eqNodesRef = useRef<import('tone').Filter[]>([]);
  const [vuData, setVuData] = useState<Record<string, number>>({});
  const [loadingTracks, setLoadingTracks] = useState(new Set<string>());
  const [loadedFrom, setLoadedFrom] = useState<Record<string, 'cache' | 'network'>>({});
  const [loadedTracksCount, setLoadedTracksCount] = useState(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('cache');

  const [pans, setPans] = useState<{ [key: string]: number }>({});
  const [eqBands, setEqBands] = useState([50, 50, 50, 50, 50]);
  const [fadeOutDuration, setFadeOutDuration] = useState(0.5);
  const [isPanVisible, setIsPanVisible] = useState(true);
  
  const [isYouTubePlayerOpen, setIsYouTubePlayerOpen] = useState(false);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  
  const initAudio = useCallback(async () => {
    if (!toneRef.current) {
        const Tone = await import('tone');
        toneRef.current = Tone;
    }
    if (!audioContextStarted.current && toneRef.current) {
        await toneRef.current.start();
        audioContextStarted.current = true;
        console.log("Audio context started with Tone.js");

        if (eqNodesRef.current.length === 0) {
            const Tone = toneRef.current;
            
            const eqChain = eqFrequencies.map((freq) => {
                const filter = new Tone.Filter(freq, 'peaking');
                filter.Q.value = 1.5;
                return filter;
            });

            if (eqChain.length > 0) {
              Tone.connectSeries(...eqChain, Tone.getDestination());
            }

            eqNodesRef.current = eqChain;
        }
    }
  }, []);

  useEffect(() => {
    initAudio();
  }, [initAudio]);

  useEffect(() => {
    if (!toneRef.current || eqNodesRef.current.length === 0) return;
    eqNodesRef.current.forEach((filter, i) => {
      const gainValue = (eqBands[i] / 100) * (MAX_EQ_GAIN * 2) - MAX_EQ_GAIN;
      filter.gain.value = gainValue;
    });
  }, [eqBands]);

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

  const stopAllTracks = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;
    
    Tone.Transport.stop();
    // Stop and unsync all players
    Object.values(trackNodesRef.current).forEach(node => {
      if (node.player.state === 'started') {
        node.player.stop();
      }
      node.player.unsync();
    });

    setIsPlaying(false);
    setCurrentTime(0);
  }, []);


  useEffect(() => {
    if (!activeSongId) {
        stopAllTracks();
        setLoadingTracks(new Set());
        setLoadedTracksCount(0);
        return;
    }

    const loadAudioData = async () => {
        await initAudio();
        const Tone = toneRef.current;
        if (!Tone || !eqNodesRef.current.length) return;

        const tracksForCurrentSong = tracks.filter(t => t.songId === activeSongId);
        const tracksToLoad = tracksForCurrentSong.filter(track => !trackNodesRef.current[track.id]);

        if (tracksToLoad.length === 0) {
            setLoadingTracks(new Set());
            setLoadedTracksCount(tracksForCurrentSong.length);
            return;
        }

        setLoadingTracks(new Set(tracksToLoad.map(t => t.id)));
        setLoadedTracksCount(tracksForCurrentSong.length - tracksToLoad.length);

        const loadPromises = tracksToLoad.map(async (track) => {
            let buffer;
            let loadedFromSource: 'cache' | 'network' = 'network';
            try {
                if (playbackMode === 'cache') {
                    const cachedBuffer = await getCachedArrayBuffer(track.url);
                    if (cachedBuffer) {
                        buffer = cachedBuffer;
                        loadedFromSource = 'cache';
                    }
                }
                
                if (!buffer) {
                    const proxyUrl = `/api/download?url=${encodeURIComponent(track.url)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error(`Failed to fetch ${track.url}: ${response.statusText}`);
                    buffer = await response.arrayBuffer();
                    loadedFromSource = 'network';
                    if (playbackMode === 'cache') {
                        await cacheArrayBuffer(track.url, buffer);
                    }
                }

                const audioBuffer = await Tone.context.decodeAudioData(buffer.slice(0));

                const player = new Tone.Player(audioBuffer);
                player.loop = true;
                const pitchShift = new Tone.PitchShift({ pitch: pitch });
                const panner = new Tone.Panner(0);
                const analyser = new Tone.Analyser('waveform', 256);
                
                player.chain(panner, pitchShift, analyser);
                
                if (eqNodesRef.current.length > 0) {
                  pitchShift.connect(eqNodesRef.current[0]);
                } else {
                  pitchShift.toDestination();
                }
                
                trackNodesRef.current[track.id] = { player, panner, analyser, pitchShift };
                setLoadedFrom(prev => ({...prev, [track.id]: loadedFromSource}));
                setLoadedTracksCount(prev => prev + 1);

            } catch (error) {
                console.error(`Error loading track ${track.name}:`, error);
            }
        });
    
        await Promise.all(loadPromises);
        setLoadingTracks(new Set());
    };

    loadAudioData();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongId, playbackMode, tracks, initAudio]);

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
    const newPans: { [key: string]: number } = {};
    activeTracks.forEach(track => {
      newPans[track.id] = pans[track.id] ?? 0;
    });
    setPans(newPans);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongId]);


  const updateVuMeters = useCallback(() => {
    if (!isPlaying) {
      setVuData({});
      return;
    }

    const newVuData: Record<string, number> = {};
    let activeNodes = false;
    
    Object.keys(trackNodesRef.current).forEach(trackId => {
      const node = trackNodesRef.current[trackId];
      // Check if the track belongs to the active song
      if (node && tracks.some(t => t.id === trackId && t.songId === activeSongId)) {
        activeNodes = true;
        if (node.analyser) {
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
      }
    });

    setVuData(newVuData);
    
    if (activeNodes) {
      requestAnimationFrame(updateVuMeters);
    }
  }, [isPlaying, activeSongId, tracks]);

  useEffect(() => {
    let animationFrameId: number;
    const Tone = toneRef.current;
    if (isPlaying && Tone) {
      const update = () => {
        setCurrentTime(Tone.Transport.seconds);
        animationFrameId = requestAnimationFrame(update);
      };
      update();
    } else {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    }
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  const getIsMuted = useCallback((trackId: string) => {
    const isMuted = mutedTracks.includes(trackId);
    const isSoloActive = soloTracks.length > 0;
    const isThisTrackSolo = soloTracks.includes(trackId);

    if (isMuted) return true;
    if (isSoloActive) return !isThisTrackSolo;
    return false;
  }, [mutedTracks, soloTracks]);

  useEffect(() => {
    const Tone = toneRef.current;
    if (!Tone) return;

    Object.keys(trackNodesRef.current).forEach(trackId => {
        const node = trackNodesRef.current[trackId];
        if (node?.player) {
            node.player.mute = getIsMuted(trackId);
        }
        if (node?.panner) {
            const panValue = pans[trackId] ?? 0;
            node.panner.pan.value = panValue;
        }
        if (node?.pitchShift) {
            node.pitchShift.pitch = pitch;
        }
    });
  }, [mutedTracks, soloTracks, getIsMuted, pans, pitch]);
  
   useEffect(() => {
      const Tone = toneRef.current;
      if (!Tone || !activeSong) return;
      Object.values(trackNodesRef.current).forEach(({ player }) => {
        player.playbackRate = playbackRate;
      });
      Tone.Transport.bpm.value = activeSong.tempo * playbackRate;
      
  }, [playbackRate, activeSong]);


  const handlePlay = useCallback(async () => {
    const Tone = toneRef.current;
    if (!Tone || loadingTracks.size > 0 || !activeSong) return;

    await initAudio();
    
    if (Tone.context.state === 'suspended') {
      await Tone.context.resume();
    }

    if (Tone.Transport.state !== 'started') {
      // UNSYNC all players first to be safe
      Object.values(trackNodesRef.current).forEach(node => {
        if (node.player) {
          node.player.unsync();
        }
      });
      // SYNC and START only the players for the currently active song
      activeTracks.forEach(track => {
        const node = trackNodesRef.current[track.id];
        if (node && node.player) {
          node.player.sync().start(0);
        }
      });

      Tone.Transport.start();
      setIsPlaying(true);
      requestAnimationFrame(updateVuMeters);
    }
  }, [loadingTracks.size, activeSong, initAudio, updateVuMeters, activeTracks]);


  const handlePause = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;
    
    Tone.Transport.pause();
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    stopAllTracks();
  }, [stopAllTracks]);

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
        stopAllTracks();
        setTracks([]);
        setActiveSongId(null);
    }
  };
  
  const handleSongSelected = (songId: string) => {
      if (songId === activeSongId) return;
      stopAllTracks();
      setActiveSongId(songId);
      setPlaybackRate(1);
      setPitch(0);
  }
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
  
  const handleSeek = (newTime: number) => {
    const Tone = toneRef.current;
    if (!Tone || !activeSong) return;
    
    Tone.Transport.seconds = newTime;
    setCurrentTime(newTime);
  };
  
  const totalTracksForCurrentSong = tracks.filter(t => t.songId === activeSongId).length;
  const loadingProgress = totalTracksForCurrentSong > 0 ? (loadedTracksCount / totalTracksForCurrentSong) * 100 : 100;
  const showLoadingBar = loadingTracks.size > 0 || (activeSongId && totalTracksForCurrentSong > 0 && loadedTracksCount < totalTracksForCurrentSong);


  return (
    <div className="grid grid-cols-[1fr_384px] grid-rows-[auto_auto_1fr] h-screen w-screen p-4 gap-4">
      <div className="col-span-2 row-start-1">
        <Header 
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            currentTime={currentTime}
            duration={activeSong?.tracks.length ? (trackNodesRef.current[activeTracks[0]?.id]?.player.buffer.duration || 0) : 0}
            onSeek={handleSeek}
            isReadyToPlay={loadingTracks.size === 0 && !!activeSong}
            loadingProgress={loadingProgress}
            showLoadingBar={showLoadingBar}
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
            playbackMode={playbackMode}
            onPlaybackModeChange={setPlaybackMode}
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
              pans={pans}
              loadingTracks={loadingTracks}
              onMuteToggle={handleMuteToggle}
              onSoloToggle={handleSoloToggle}
              onPanChange={handlePanChange}
              vuData={vuData}
              isPanVisible={isPanVisible}
              isPlaying={isPlaying}
              loadedFrom={loadedFrom}
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

    