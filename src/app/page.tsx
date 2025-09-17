
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

export type PlaybackMode = 'online' | 'offline';

const eqFrequencies = [60, 250, 1000, 4000, 8000];
const MAX_EQ_GAIN = 12;

type ToneModule = typeof import('tone');
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
  
  const [playingTracks, setPlayingTracks] = useState(new Set<string>());

  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitch, setPitch] = useState(0);

  const [pans, setPans] = useState<{ [key: string]: number }>({});
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('online');

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

    Object.keys(trackNodesRef.current).forEach(trackId => {
        const node = trackNodesRef.current[trackId];
        if (node?.player.state === 'started') {
            node.player.stop();
        }
    });
    setPlayingTracks(new Set());
    setVuData({});
  }, []);


  useEffect(() => {
      if (!activeSongId) {
          stopAllTracks();
          setLoadingTracks(new Set());
          return;
      }

      const loadAudioData = async () => {
          await initAudio();
          const Tone = toneRef.current;
          if (!Tone || !eqNodesRef.current.length) return;

          const tracksForCurrentSong = tracks.filter(t => t.songId === activeSongId);
          const tracksToLoad = tracksForCurrentSong.filter(t => !trackNodesRef.current[t.id]);
          const currentTrackIds = new Set(tracksForCurrentSong.map(t => t.id));

          Object.keys(trackNodesRef.current).forEach(trackId => {
              if (!currentTrackIds.has(trackId)) {
                  const node = trackNodesRef.current[trackId];
                  node.player.dispose();
                  node.panner.dispose();
                  node.analyser.dispose();
                  node.pitchShift.dispose();
                  delete trackNodesRef.current[trackId];
              }
          });

          if (tracksToLoad.length === 0) {
              setLoadingTracks(new Set());
              return;
          }

          setLoadingTracks(new Set(tracksToLoad.map(t => t.id)));

          const loadPromises = tracksToLoad.map(async (track) => {
              try {
                  let buffer;
                  if (playbackMode === 'offline') {
                      const cachedData = await getCachedArrayBuffer(track.url);
                      if (cachedData) {
                          buffer = await Tone.context.decodeAudioData(cachedData);
                      } else {
                          throw new Error(`Track ${track.name} not cached`);
                      }
                  } else {
                      const proxyUrl = `/api/download?url=${encodeURIComponent(track.url)}`;
                      const response = await fetch(proxyUrl);
                      if (!response.ok) throw new Error(`Failed to fetch ${track.url}: ${response.statusText}`);
                      const arrayBuffer = await response.arrayBuffer();
                      await cacheArrayBuffer(track.url, arrayBuffer.slice(0));
                      buffer = await Tone.context.decodeAudioData(arrayBuffer);
                  }

                  const player = new Tone.Player(buffer).toDestination();
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

              } catch (error) {
                  console.error(`Error loading track ${track.name}:`, error);
              }
          });
      
          await Promise.all(loadPromises);
          setLoadingTracks(new Set());
      };

      loadAudioData();

      return () => {
          stopAllTracks();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongId, playbackMode, pitch]);

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
    tracks.forEach(track => {
      newPans[track.id] = pans[track.id] ?? 0;
    });
    setPans(newPans);
  }, [tracks]);


  const updateVuMeters = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone || playingTracks.size === 0) return;

    const newVuData: Record<string, number> = {};
    let isAnyTrackPlaying = false;

    playingTracks.forEach(trackId => {
        const node = trackNodesRef.current[trackId];
        if (node?.player.state === 'started') {
            isAnyTrackPlaying = true;
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
    
    if (isAnyTrackPlaying) {
      requestAnimationFrame(updateVuMeters);
    } else {
      setVuData({}); // Clear meters if nothing is playing
    }
  }, [playingTracks]);

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


  const handleTrackPlayToggle = useCallback(async (trackId: string) => {
    const Tone = toneRef.current;
    if (!Tone) return;

    await initAudio();
    if (Tone.context.state === 'suspended') {
      await Tone.context.resume();
    }
    
    const node = trackNodesRef.current[trackId];
    if (!node) return;

    const newPlayingTracks = new Set(playingTracks);
    if (newPlayingTracks.has(trackId)) {
        node.player.stop();
        newPlayingTracks.delete(trackId);
    } else {
        node.player.start();
        newPlayingTracks.add(trackId);
    }
    
    setPlayingTracks(newPlayingTracks);

    // Start VU meter updates if any track is playing
    if (newPlayingTracks.size > 0 && playingTracks.size === 0) {
        requestAnimationFrame(updateVuMeters);
    }
  }, [playingTracks, updateVuMeters, initAudio]);

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
  
  return (
    <div className="grid grid-cols-[1fr_384px] grid-rows-[auto_auto_1fr] h-screen w-screen p-4 gap-4">
      <div className="col-span-2 row-start-1">
        <Header 
            playbackMode={playbackMode}
            onPlaybackModeChange={setPlaybackMode}
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
              playingTracks={playingTracks}
              pans={pans}
              loadingTracks={loadingTracks}
              onMuteToggle={handleMuteToggle}
              onSoloToggle={handleSoloToggle}
              onPanChange={handlePanChange}
              onTrackPlayToggle={handleTrackPlayToggle}
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

    