'use client';
import React from 'react';
import TrackPad from './TrackPad';
import { SetlistSong } from '@/actions/setlists';

interface MixerGridProps {
  tracks: SetlistSong[];
  activeTracks: string[];
  soloTracks: string[];
  mutedTracks: string[];
  volumes: { [key: string]: number };
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  isPlaying: boolean;
  playbackPosition: number;
  audioRefs: React.MutableRefObject<{[key: string]: HTMLAudioElement | null} >
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  activeTracks, 
  soloTracks, 
  mutedTracks, 
  volumes,
  onMuteToggle, 
  onSoloToggle,
  onVolumeChange,
  isPlaying,
  playbackPosition,
  audioRefs
}) => {
  return (
    <div className="grid grid-cols-6 gap-4">
      {tracks.map(track => (
        <TrackPad
          key={track.id}
          track={track}
          isActive={activeTracks.includes(track.id)}
          isMuted={mutedTracks.includes(track.id)}
          isSolo={soloTracks.includes(track.id)}
          volume={volumes[track.id] ?? 75}
          onMuteToggle={() => onMuteToggle(track.id)}
          onSoloToggle={() => onSoloToggle(track.id)}
          onVolumeChange={(newVolume) => onVolumeChange(track.id, newVolume)}
        />
      ))}
    </div>
  );
};

export default MixerGrid;
