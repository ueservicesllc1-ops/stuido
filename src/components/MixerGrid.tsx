
'use client';
import React from 'react';
import TrackPad from './TrackPad';
import { SetlistSong } from '@/actions/setlists';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaybackMode } from '@/app/page';


interface MixerGridProps {
  tracks: SetlistSong[];
  soloTracks: string[];
  mutedTracks: string[];
  volumes: { [key: string]: number };
  loadingTracks: string[];
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  isPlaying: boolean;
  playbackPosition: number;
  duration: number;
  playbackMode: PlaybackMode;
  cachedTracks: Set<string>;
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  soloTracks, 
  mutedTracks, 
  volumes,
  loadingTracks,
  onMuteToggle, 
  onSoloToggle,
  onVolumeChange,
  isPlaying,
  playbackPosition,
  duration,
  playbackMode,
  cachedTracks
}) => {
  return (
    <div className="grid grid-cols-6 gap-4">
      {tracks.map(track => (
        <TrackPad
          key={track.id}
          track={track}
          isLoading={loadingTracks.includes(track.id)}
          isMuted={mutedTracks.includes(track.id)}
          isSolo={soloTracks.includes(track.id)}
          volume={volumes[track.id] ?? 75}
          onMuteToggle={() => onMuteToggle(track.id)}
          onSoloToggle={() => onSoloToggle(track.id)}
          onVolumeChange={(newVolume) => onVolumeChange(track.id, newVolume)}
          isPlaying={isPlaying}
          playbackPosition={playbackPosition}
          duration={duration}
          playbackMode={playbackMode}
          isCached={cachedTracks.has(track.id)}
        />
      ))}
    </div>
  );
};

export default MixerGrid;

    
