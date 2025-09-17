
'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import { getSetlists, Setlist, SetlistSong } from '@/actions/setlists';
import { Song, TrackFile } from '@/actions/songs';
import { SongStructure } from '@/ai/flows/song-structure';
import LyricsDisplay from '@/components/LyricsDisplay';
import YouTubePlayerDialog from '@/components/YouTubePlayerDialog';
import type { LyricsSyncOutput } from '@/ai/flows/lyrics-synchronization';
import TeleprompterDialog from '@/components/TeleprompterDialog';
import { getCachedArrayBuffer, cacheArrayBuffer } from '@/lib/audiocache';

const eqFrequencies = [60, 250, 1000, 4000, 8000];
const MAX_EQ_GAIN = 12;

type ToneModule = typeof import('tone');
type TrackNodes = Record<string, {
    player: import('tone').Player;
    panner: import('tone').Panner;
    pitchShift: import('tone').PitchShift;
    volume: import('tone').Volume;
    waveform: import('tone').Waveform;
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
  const masterMeterRef = useRef<import('tone').Meter | null>(null);

  const [loadingTracks, setLoadingTracks] = useState(new Set<string>());
  const [loadedTracksCount, setLoadedTracksCount] = useState(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitch, setPitch] = useState(0);

  const [vuLevels, setVuLevels] = useState<Record<string, number>>({});
  const [masterVuLevel, setMasterVuLevel] = useState(-Infinity);
  const [fadeOutDuration, setFadeOutDuration] = useState(0.5);
  const [isPanVisible, setIsPanVisible] = useState(false);
  
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

            masterMeterRef.current = new Tone.Meter();
            const masterVol = Tone.Destination;
            
            if (eqChain.length > 0) {
              Tone.connectSeries(...eqChain, masterVol);
            }
            masterVol.connect(masterMeterRef.current);

            eqNodesRef.current = eqChain;
        }
    }
  }, []);

  useEffect(() => {
    initAudio();
  }, [initAudio]);

  const activeTracks = useMemo(() => {
    const getPrio = (trackName: string) => {
      const upperCaseName = trackName.trim().toUpperCase();
      if (upperCaseName === 'CLICK') return 1;
      if (upperCaseName === 'CUES') return 2;
      return 3;
    };
    
    return tracks
      .filter(t => t.songId === activeSongId)
      .sort((a, b) => {
          const prioA = getPrio(a.name);
          const prioB = getPrio(b.name);
          if (prioA !== prioB) {
              return prioA - prioB;
          }
          return a.name.localeCompare(b.name);
      });
  }, [tracks, activeSongId]);

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
        if (!Tone || !eqNodesRef.current.length || !activeSong) return;

        const tracksForCurrentSong = activeSong.tracks;
        const tracksToLoad = tracksForCurrentSong.filter(track => !trackNodesRef.current[track.fileKey]);

        if (tracksToLoad.length === 0) {
            setLoadingTracks(new Set());
            setLoadedTracksCount(tracksForCurrentSong.length);
            return;
        }

        setLoadingTracks(new Set(tracksToLoad.map(t => t.fileKey)));
        setLoadedTracksCount(tracksForCurrentSong.length - tracksToLoad.length);

        const loadPromises = tracksToLoad.map(async (track) => {
            let buffer: ArrayBuffer | undefined;
            try {
                const cachedBuffer = await getCachedArrayBuffer(track.url);
                if (cachedBuffer) buffer = cachedBuffer;
                
                if (!buffer) {
                    console.log(`Cache MISS for: ${track.name}. Fetching from B2.`);
                    const proxyUrl = `/api/download?url=${encodeURIComponent(track.url)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error(`Failed to fetch ${track.url}: ${response.statusText}`);
                    buffer = await response.arrayBuffer();
                    await cacheArrayBuffer(track.url, buffer.slice(0));
                }

                const audioBuffer = await Tone.context.decodeAudioData(buffer.slice(0));
                
                const player = new Tone.Player(audioBuffer);
                player.loop = true;
                const volume = new Tone.Volume(0);
                const pitchShift = new Tone.PitchShift({ pitch: pitch });
                const panner = new Tone.Panner(0);
                const waveform = new Tone.Waveform(256);
                
                player.chain(volume, panner, pitchShift, waveform);
                
                if (eqNodesRef.current.length > 0) {
                  pitchShift.connect(eqNodesRef.current[0]);
                } else {
                  pitchShift.toDestination();
                }
                
                const trackIdInSetlist = tracks.find(t => t.songId === activeSongId && t.fileKey === track.fileKey)?.id;
                if (trackIdInSetlist) {
                    trackNodesRef.current[trackIdInSetlist] = { player, panner, pitchShift, volume, waveform };
                }
                
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
  }, [activeSongId, tracks, activeSong]);

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
    let animationFrameId: number;
    const Tone = toneRef.current;

    if (isPlaying && Tone) {
        const update = () => {
            setCurrentTime(Tone.Transport.seconds);

            const newVuLevels: Record<string, number> = {};
            activeTracks.forEach(track => {
                const node = trackNodesRef.current[track.id];
                if (node && node.waveform) {
                    const values = node.waveform.getValue();
                    let peak = 0;
                    if (values instanceof Float32Array) {
                        for (let i = 0; i < values.length; i++) {
                            const absValue = Math.abs(values[i]);
                            if (absValue > peak) {
                                peak = absValue;
                            }
                        }
                    }
                    const db = 20 * Math.log10(peak);
                    newVuLevels[track.id] = db;
                }
            });
            setVuLevels(newVuLevels);

            if (masterMeterRef.current) {
                setMasterVuLevel(masterMeterRef.current.getValue() as number);
            }

            animationFrameId = requestAnimationFrame(update);
        };
        update();
    } else {
        const decay = () => {
            setVuLevels(prevLevels => {
                const newLevels: Record<string, number> = {};
                let hasActiveLevels = false;
                for (const trackId in prevLevels) {
                    const currentLevel = prevLevels[trackId];
                    if (currentLevel > -60) {
                        newLevels[trackId] = currentLevel - 2; // Decay rate
                        hasActiveLevels = true;
                    } else {
                        newLevels[trackId] = -Infinity;
                    }
                }
                if (hasActiveLevels) {
                    animationFrameId = requestAnimationFrame(decay);
                }
                return newLevels;
            });
            setMasterVuLevel(prev => prev > -60 ? prev -2 : -Infinity);
        };
        decay();
    }

    return () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    };
}, [isPlaying, activeTracks]);


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
        if (node?.volume) {
          const isMuted = getIsMuted(trackId);
          node.volume.mute = isMuted;
        }
        if (node?.pitchShift) {
            node.pitchShift.pitch = pitch;
        }
    });
  }, [mutedTracks, soloTracks, getIsMuted, pitch]);
  
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
      Object.values(trackNodesRef.current).forEach(node => {
        if (node.player) {
          node.player.unsync();
        }
      });
      activeTracks.forEach(track => {
        const node = trackNodesRef.current[track.id];
        if (node && node.player) {
          node.player.sync().start(0);
        }
      });

      Tone.Transport.start();
      setIsPlaying(true);
    }
  }, [loadingTracks.size, activeSong, initAudio, activeTracks]);


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
    <div className="grid grid-cols-[1fr_384px] grid-rows-[auto_1fr] h-screen w-screen p-4 gap-4">
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
        />
      </div>
      
      <main className="col-start-1 row-start-2 overflow-y-auto pr-2 no-scrollbar flex flex-col gap-4">
        <div className="h-28">
            <LyricsDisplay 
              lyrics={songLyrics}
              youtubeUrl={songYoutubeUrl}
              onOpenYouTube={() => setIsYouTubePlayerOpen(true)}
              onOpenTeleprompter={() => setIsTeleprompterOpen(true)}
            />
        </div>
        {activeSongId ? (
            <MixerGrid
              tracks={activeTracks}
              activeSong={activeSong}
              soloTracks={soloTracks}
              mutedTracks={mutedTracks}
              onMuteToggle={handleMuteToggle}
              onSoloToggle={handleSoloToggle}
              isPlaying={isPlaying}
              vuLevels={vuLevels}
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

    