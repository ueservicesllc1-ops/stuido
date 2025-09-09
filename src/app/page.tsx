
'use client';
import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import Image from 'next/image';
import { getSetlists, Setlist, SetlistSong } from '@/actions/setlists';
import { getCachedAudio, cacheAudio } from '@/lib/audiocache';
import { Loader2 } from 'lucide-react';

const DawPage = () => {
  const [tracks, setTracks] = useState<SetlistSong[]>([]);
  const [trackUrls, setTrackUrls] = useState<{[key: string]: string}>({});
  const [loadingTracks, setLoadingTracks] = useState<{[key: string]: boolean}>({});
  
  const [activeTrackIds, setActiveTrackIds] = useState<string[]>([]);
  const [soloTracks, setSoloTracks] = useState<string[]>([]);
  const [mutedTracks, setMutedTracks] = useState<string[]>([]);
  const [initialSetlist, setInitialSetlist] = useState<Setlist | null>(null);

  // --- Audio State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement | null}>({});
  const animationFrameRef = useRef<number>();


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

  const loadTrack = async (track: SetlistSong) => {
    // Avoid reloading if already loaded or currently loading
    if (trackUrls[track.id] || loadingTracks[track.id]) {
      return;
    }

    setLoadingTracks(prev => ({ ...prev, [track.id]: true }));
    try {
      let audioBlob = await getCachedAudio(track.url);
      
      if (!audioBlob) {
        console.log(`Caching track: ${track.name}`);
        audioBlob = await cacheAudio(track.url);
      }

      if (audioBlob) {
        const objectUrl = URL.createObjectURL(audioBlob);
        setTrackUrls(prev => ({ ...prev, [track.id]: objectUrl }));
      } else {
         // Fallback to network URL if caching fails
        setTrackUrls(prev => ({ ...prev, [track.id]: track.url }));
      }
    } catch (error) {
      console.error(`Error loading track ${track.name}:`, error);
      // Fallback to network URL on error
      setTrackUrls(prev => ({ ...prev, [track.id]: track.url }));
    } finally {
      setLoadingTracks(prev => ({ ...prev, [track.id]: false }));
    }
  };

  useEffect(() => {
    if (initialSetlist && initialSetlist.songs) {
      setTracks(initialSetlist.songs);
      
      // Reset states but preserve already loaded URLs and active tracks
      setTrackUrls(prevUrls => {
        const newUrls: {[key: string]: string} = {};
        initialSetlist.songs.forEach(song => {
          if (prevUrls[song.id]) {
            newUrls[song.id] = prevUrls[song.id];
          }
        });
        return newUrls;
      });

      // Tracks that already have a URL are considered active
      setActiveTrackIds(initialSetlist.songs.filter(s => !!trackUrls[s.id]).map(s => s.id));
      
      setLoadingTracks({});

      // Load all tracks from the new setlist that are not already loaded
      initialSetlist.songs.forEach(track => {
        loadTrack(track);
      });

    } else {
      setTracks([]);
      setActiveTrackIds([]);
    }
  }, [initialSetlist]);


  // When a track's URL becomes available, add it to the active tracks
  useEffect(() => {
    const loadedTrackIds = Object.keys(trackUrls);
    setActiveTrackIds(prev => {
        const newIds = loadedTrackIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
    });
  }, [trackUrls]);


  const [volumes, setVolumes] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const newVolumes: { [key: string]: number } = {};
    const newAudioRefs: {[key: string]: HTMLAudioElement | null} = {};

    tracks.forEach(track => {
      newVolumes[track.id] = volumes[track.id] ?? 75;
      newAudioRefs[track.id] = audioRefs.current[track.id] || null;
    });
    setVolumes(newVolumes);
    audioRefs.current = newAudioRefs;

  }, [tracks]);

  // --- Audio Control Handlers ---

  const updatePlaybackPosition = () => {
    const firstAudio = Object.values(audioRefs.current).find(a => a);
    if (firstAudio && isPlaying) {
      setPlaybackPosition(firstAudio.currentTime);
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };

  const handlePlay = () => {
    const allTracksReady = tracks.every(t => trackUrls[t.id]);
    if (!allTracksReady) {
        console.log("Waiting for all tracks to be loaded...");
        return;
    }
    
    setIsPlaying(true);
    Object.values(audioRefs.current).forEach(audio => audio?.play().catch(e => console.error("Play error:", e)));
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

  // Effect to explicitly load audio when a URL becomes available
  useEffect(() => {
    Object.keys(trackUrls).forEach(trackId => {
      const audio = audioRefs.current[trackId];
      if (audio && audio.src !== trackUrls[trackId]) {
        // console.log(`Loading new src for track ${trackId}: ${trackUrls[trackId]}`);
        audio.src = trackUrls[trackId];
        audio.load(); // Explicitly load the new source
        if (isPlaying) {
          audio.currentTime = playbackPosition;
          audio.play().catch(e => console.error("Error playing newly loaded track:", e));
        }
      }
    });
  }, [trackUrls, isPlaying, playbackPosition]);
  
  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(trackUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
  }, [trackUrls]);

  const handleSetlistUpdate = (setlist: Setlist | null) => {
    setInitialSetlist(setlist);
  };

  const activeTracksData = tracks.filter(t => activeTrackIds.includes(t.id));

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
              crossOrigin="anonymous"
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
      />
      
      <div className="relative flex-grow p-4 min-h-0">
        <div className="absolute top-0 left-4 right-4 h-24">
            <Image src="https://i.imgur.com/kP4MS2H.png" alt="Waveform" fill style={{objectFit: 'contain'}} data-ai-hint="waveform audio" />
        </div>
      </div>

      <main className="flex-grow grid grid-cols-12 gap-4 px-4 pb-4 pt-20">
        <div className="col-span-12 lg:col-span-7">
          <MixerGrid 
            tracks={activeTracksData}
            soloTracks={soloTracks}
            mutedTracks={mutedTracks}
            volumes={volumes}
            onMuteToggle={toggleMute}
            onSoloToggle={toggleSolo}
            onVolumeChange={handleVolumeChange}
            isPlaying={isPlaying}
            playbackPosition={playbackPosition}
            duration={duration}
            loadingTracks={loadingTracks}
          />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <SongList 
            initialSetlist={initialSetlist} 
            onSetlistSelected={handleSetlistUpdate}
            onLoadTrack={loadTrack}
            loadingTracks={loadingTracks}
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
