'use client';
import React, { useState } from 'react';
import Header from '@/components/Header';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import Image from 'next/image';

const DawPage = () => {
  const [activeTracks, setActiveTracks] = useState<string[]>(['AG', 'BASS']);
  const [soloTracks, setSoloTracks] = useState<string[]>([]);
  const [mutedTracks, setMutedTracks] = useState<string[]>(['BGVS', 'DRUMS']);

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

  const initialTracks = [
    { name: 'CLICK', color: 'destructive' }, { name: 'CUES', color: 'destructive' }, { name: 'AG' }, { name: 'BASS' }, { name: 'BGVS' }, { name: 'DRUMS' },
    { name: 'EG 1' }, { name: 'EG 2' }, { name: 'EG 3' }, { name: 'EG 4' }, { name: 'KEYS1' }, { name: 'KEYS2' },
    { name: 'KEYS3' }, { name: 'KEYS4' }, { name: 'ORGAN' }, { name: 'PERC' }, { name: 'PIANO' }, { name: 'SYNTH B...' },
  ];

  return (
    <div className="flex flex-col h-screen bg-background font-sans text-sm">
      <Header />
      
      <div className="relative flex-grow p-4 min-h-0">
        <div className="absolute top-0 left-4 right-4 h-24">
            <Image src="https://i.imgur.com/kP4MS2H.png" alt="Waveform" layout="fill" objectFit="contain" data-ai-hint="waveform audio" />
        </div>
      </div>

      <main className="flex-grow grid grid-cols-12 gap-4 px-4 pb-4 pt-20">
        <div className="col-span-12 lg:col-span-7">
          <MixerGrid 
            tracks={initialTracks}
            activeTracks={activeTracks}
            soloTracks={soloTracks}
            mutedTracks={mutedTracks}
            onMuteToggle={toggleMute}
            onSoloToggle={toggleSolo}
          />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <SongList />
        </div>
        <div className="col-span-12 lg:col-span-2">
          <TonicPad />
        </div>
      </main>
    </div>
  );
};

export default DawPage;
