'use client';
import React from 'react';
import TrackPad from './TrackPad';

interface TrackInfo {
  name: string;
  color?: 'primary' | 'destructive';
}

interface MixerGridProps {
  tracks: TrackInfo[];
  activeTracks: string[];
  soloTracks: string[];
  mutedTracks: string[];
  onMuteToggle: (trackName: string) => void;
  onSoloToggle: (trackName: string) => void;
}

const MixerGrid: React.FC<MixerGridProps> = ({ tracks, activeTracks, soloTracks, mutedTracks, onMuteToggle, onSoloToggle }) => {
  return (
    <div className="grid grid-cols-6 gap-2">
      {tracks.map(track => (
        <TrackPad
          key={track.name}
          name={track.name}
          color={track.color}
          isActive={activeTracks.includes(track.name)}
          isMuted={mutedTracks.includes(track.name)}
          isSolo={soloTracks.includes(track.name)}
          onMuteToggle={() => onMuteToggle(track.name)}
          onSoloToggle={() => onSoloToggle(track.name)}
          progress={Math.random() * 85 + 5} // Random progress for visual variety
        />
      ))}
    </div>
  );
};

export default MixerGrid;
