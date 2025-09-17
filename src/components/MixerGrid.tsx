
'use client';
import React from 'react';
import TrackPad from './TrackPad';
import { SetlistSong } from '@/actions/setlists';

interface MixerGridProps {
  tracks: SetlistSong[];
  soloTracks: string[];
  mutedTracks: string[];
  volumes: { [key: string]: number };
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onVolumeChange: (trackId: string, newVolume: number) => void;
  vuLevels: Record<string, number>;
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  soloTracks, 
  mutedTracks,
  volumes,
  onMuteToggle, 
  onSoloToggle,
  onVolumeChange,
  vuLevels,
}) => {
  const isSoloActive = soloTracks.length > 0;

  return (
    <div className="grid grid-cols-7 gap-2 items-start">
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
            volume={volumes[track.id] ?? 75}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            onVolumeChange={(newVol) => onVolumeChange(track.id, newVol)}
            vuLevel={vuLevel}
          />
        );
      })}
    </div>
  );
};

export default MixerGrid;
