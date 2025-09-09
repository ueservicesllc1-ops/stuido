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
  volumes: { [key: string]: number };
  onMuteToggle: (trackName: string) => void;
  onSoloToggle: (trackName: string) => void;
  onVolumeChange: (trackName: string, volume: number) => void;
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  activeTracks, 
  soloTracks, 
  mutedTracks, 
  volumes,
  onMuteToggle, 
  onSoloToggle,
  onVolumeChange
}) => {
  return (
    <div className="grid grid-cols-6 gap-4">
      {tracks.map(track => (
        <TrackPad
          key={track.name}
          name={track.name}
          color={track.color}
          isActive={activeTracks.includes(track.name)}
          isMuted={mutedTracks.includes(track.name)}
          isSolo={soloTracks.includes(track.name)}
          volume={volumes[track.name] ?? 75}
          onMuteToggle={() => onMuteToggle(track.name)}
          onSoloToggle={() => onSoloToggle(track.name)}
          onVolumeChange={(newVolume) => onVolumeChange(track.name, newVolume)}
        />
      ))}
    </div>
  );
};

export default MixerGrid;
