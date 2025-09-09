'use client';
import React, { useState } from 'react';
import Header from '@/components/Header';
import Waveform from '@/components/Waveform';
import MixerGrid from '@/components/MixerGrid';
import SongList from '@/components/SongList';
import TonicPad from '@/components/TonicPad';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Mock data for songs
const mockSongs = [
  { id: 1, title: 'ECO', original: 'Original', key: 'D', bpm: 104 },
  { id: 2, title: 'YAWEH', original: 'Original', key: 'C', bpm: 138 },
  { id: 3, title: 'ESTAR CONTIGO', original: 'Original', key: 'G', bpm: 130 },
  { id: 4, title: 'ALABARE', original: 'Original', key: 'G', bpm: 134 },
  { id: 5, title: 'SOCORRO', original: 'Original', key: 'D', bpm: '1...' },
  { id: 6, title: 'GRACIA SUBLIME', original: 'Original', key: 'B', bpm: 101 },
  { id: 7, title: 'REY DE MI CORAZON', original: 'Original', key: '...', bpm: 68 },
];

export default function DawPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const handleUploadClick = () => {
    toast({
      title: "Función no implementada",
      description: "La subida de archivos se conectará en el siguiente paso.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <Header isPlaying={isPlaying} onPlayPause={() => setIsPlaying(!isPlaying)} />

      <main className="flex flex-col flex-grow overflow-hidden">
        <Waveform />
        
        <div className="flex flex-grow bg-[#0c132b] p-2 gap-2 overflow-hidden">
          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-2 flex-grow">
            
            {/* Mixer Grid Section (8 columns) */}
            <div className="col-span-12 md:col-span-7 lg:col-span-8">
               <MixerGrid />
            </div>

            {/* Song List & Tonic Pad Section (4 columns) */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 flex flex-col gap-2">
              <div className="bg-card p-2 rounded-lg flex-grow flex flex-col">
                <SongList songs={mockSongs} />
                <div className="flex justify-between items-center mt-2">
                   <Button variant="ghost" size="sm" className="flex items-center gap-2 text-primary" onClick={handleUploadClick}>
                    <PlusCircle size={16} /> Library
                  </Button>
                  <Button variant="ghost" size="sm" className="text-primary">
                    Edit setlist
                  </Button>
                </div>
              </div>
              <TonicPad />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
