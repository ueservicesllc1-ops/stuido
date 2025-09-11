
'use client';
import React from 'react';
import TrackPad from './TrackPad';
import { SetlistSong } from '@/actions/setlists';
import { PlaybackMode } from '@/app/page';

interface MixerGridProps {
  tracks: SetlistSong[];
  soloTracks: string[];
  mutedTracks: string[];
  volumes: { [key: string]: number };
  loadingTracks: string[];
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onVolumeChange: (trackId: string, newVolume: number) => void;
  isPlaying: boolean;
  vuData: Record<string, number>;
  playbackMode: PlaybackMode;
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
  vuData,
  playbackMode,
}) => {
  const isSoloActive = soloTracks.length > 0;

  return (
    <div className="grid grid-cols-7 gap-4 items-start">
      {tracks.map(track => {
        const isMuted = mutedTracks.includes(track.id);
        const isSolo = soloTracks.includes(track.id);
        const isLoading = loadingTracks.includes(track.id);
        const isDisabled = isLoading;

        const isAudible = isPlaying && !isDisabled && !isMuted && (!isSoloActive || isSolo);
        
        // Asignar ID para la pista de click si existe
        const isClickTrack = track.name.trim().toUpperCase() === 'CLICK';
        const trackId = isClickTrack ? `${track.songId}_CLICK` : track.id;
        
        const effectiveVolume = isClickTrack 
            ? volumes[`${track.songId}_CLICK`] ?? 75
            : volumes[track.id] ?? 75;

        return (
          <TrackPad
            key={trackId}
            track={track}
            isLoading={isLoading}
            isMuted={mutedTracks.includes(trackId)}
            isSolo={soloTracks.includes(trackId)}
            isAudible={isAudible}
            volume={effectiveVolume}
            onMuteToggle={() => onMuteToggle(trackId)}
            onSoloToggle={() => onSoloToggle(trackId)}
            onVolumeChange={(newVolume) => onVolumeChange(trackId, newVolume)}
            vuMeterLevel={vuData[track.id] || 0}
            playbackMode={playbackMode}
          />
        );
      })}
    </div>
  );
};

export default MixerGrid;
