
'use client';
import React from 'react';
import TrackPad from './TrackPad';
import { SetlistSong } from '@/actions/setlists';
import { Song } from '@/actions/songs';

interface MixerGridProps {
  tracks: SetlistSong[];
  activeSong: Song | undefined;
  soloTracks: string[];
  mutedTracks: string[];
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  vuLevels: Record<string, number>;
  isPlaying: boolean;
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  activeSong,
  soloTracks, 
  mutedTracks,
  onMuteToggle, 
  onSoloToggle,
  vuLevels,
  isPlaying
}) => {
  const isSoloActive = soloTracks.length > 0;
  const tempo = activeSong?.tempo ?? 120;

  return (
    <div className="grid grid-cols-8 gap-4 items-start">
      {tracks.map(track => {
        const isMuted = mutedTracks.includes(track.id);
        const isSolo = soloTracks.includes(track.id);
        const vuLevel = vuLevels[track.id] ?? -Infinity;
        
        return (
          <TrackPad
            key={track.id}
            track={track}
            isMuted={isMuted}
            isSolo={isSolo}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            vuLevel={vuLevel}
            tempo={tempo}
            isPlaying={isPlaying}
          />
        );
      })}
    </div>
  );
};

export default MixerGrid;

    