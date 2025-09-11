
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
  isClickEnabled: boolean;
  onToggleClick: () => void;
  clickVolume: number;
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
  isClickEnabled,
  onToggleClick,
  clickVolume,
}) => {
  const isSoloActive = soloTracks.length > 0;

  return (
    <div className="grid grid-cols-7 gap-4 items-start">
      {tracks.map(track => {
        const isClickTrack = track.name.trim().toUpperCase() === 'CLICK';
        
        if (isClickTrack) {
          const clickTrackId = `${track.songId}_CLICK`;
          return (
            <TrackPad
              key={clickTrackId}
              track={track}
              isClickTrack={true}
              isClickEnabled={isClickEnabled}
              onToggleClick={onToggleClick}
              isLoading={false}
              isMuted={mutedTracks.includes(clickTrackId)}
              isSolo={false}
              isAudible={isPlaying && isClickEnabled && !mutedTracks.includes(clickTrackId)}
              volume={clickVolume}
              onMuteToggle={() => onMuteToggle(clickTrackId)}
              onSoloToggle={() => {}}
              onVolumeChange={(newVolume) => onVolumeChange(clickTrackId, newVolume)}
              vuMeterLevel={0}
              playbackMode={playbackMode}
            />
          );
        }
        
        const isMuted = mutedTracks.includes(track.id);
        const isSolo = soloTracks.includes(track.id);
        const isLoading = loadingTracks.includes(track.id);
        const isDisabled = isLoading;

        const isAudible = isPlaying && !isDisabled && !isMuted && (!isSoloActive || isSolo);

        return (
          <TrackPad
            key={track.id}
            track={track}
            isLoading={isLoading}
            isMuted={isMuted}
            isSolo={isSolo}
            isAudible={isAudible}
            volume={volumes[track.id] ?? 75}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            onVolumeChange={(newVolume) => onVolumeChange(track.id, newVolume)}
            vuMeterLevel={vuData[track.id] || 0}
            playbackMode={playbackMode}
          />
        );
      })}
    </div>
  );
};

export default MixerGrid;
