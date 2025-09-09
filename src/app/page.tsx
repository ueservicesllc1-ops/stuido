
'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import Image from 'next/image';
import { getSetlists, Setlist } from '@/actions/setlists';

const DawPage = () => {
  const [activeTracks, setActiveTracks] = useState<string[]>([]);
  const [soloTracks, setSoloTracks] = useState<string[]>([]);
  const [mutedTracks, setMutedTracks] = useState<string[]>([]);
  const [initialSetlist, setInitialSetlist] = useState<Setlist | null>(null);

  useEffect(() => {
    const fetchLastSetlist = async () => {
      // NOTA: El userId está hardcodeado. Se deberá reemplazar con el del usuario autenticado.
      const userId = 'user_placeholder_id';
      const result = await getSetlists(userId);
      if (result.success && result.setlists && result.setlists.length > 0) {
        setInitialSetlist(result.setlists[0]); // El primero es el más reciente
      }
    };

    fetchLastSetlist();
  }, []);


  const initialTracks: { name: string, color?: 'primary' | 'destructive' }[] = [];

  // Initialize volumes for each track
  const [volumes, setVolumes] = useState<{ [key: string]: number }>(() => {
    const initialVolumes: { [key: string]: number } = {};
    initialTracks.forEach(track => {
      // Set a default volume, e.g., 75%. Maybe active tracks start higher?
      initialVolumes[track.name] = activeTracks.includes(track.name) ? 75 : 50;
    });
    return initialVolumes;
  });

  const handleVolumeChange = (trackName: string, newVolume: number) => {
    setVolumes(prev => ({ ...prev, [trackName]: newVolume }));
  };

  const toggleMute = (trackName: string) => {
    setMutedTracks(prev =>
      prev.includes(trackName)
        ? prev.filter(t => t !== trackName)
        : [...prev, trackName]
    );
  };

  const toggleSolo = (trackName: string) => {
    setSoloTracks(prev =>
      prev.includes(trackName)
        ? prev.filter(t => t !== trackName)
        : [...prev, trackName]
    );
  };


  return (
    <div className="flex flex-col h-screen bg-background font-sans text-sm">
      <Header />
      
      <div className="relative flex-grow p-4 min-h-0">
        <div className="absolute top-0 left-4 right-4 h-24">
            <Image src="https://i.imgur.com/kP4MS2H.png" alt="Waveform" fill style={{objectFit: 'contain'}} data-ai-hint="waveform audio" />
        </div>
      </div>

      <main className="flex-grow grid grid-cols-12 gap-4 px-4 pb-4 pt-20">
        <div className="col-span-12 lg:col-span-7">
          <MixerGrid 
            tracks={initialTracks}
            activeTracks={activeTracks}
            soloTracks={soloTracks}
            mutedTracks={mutedTracks}
            volumes={volumes}
            onMuteToggle={toggleMute}
            onSoloToggle={toggleSolo}
            onVolumeChange={handleVolumeChange}
          />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <SongList initialSetlist={initialSetlist} />
        </div>
        <div className="col-span-12 lg:col-span-2">
          <TonicPad />
        </div>
      </main>
    </div>
  );
};

export default DawPage;
