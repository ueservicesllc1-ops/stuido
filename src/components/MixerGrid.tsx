
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
  pans: { [key: string]: number };
  loadingTracks: string[];
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onVolumeChange: (trackId: string, newVolume: number) => void;
  onPanChange: (trackId: string, newPan: number) => void;
  isPlaying: boolean;
  vuData: Record<string, number>;
  playbackMode: PlaybackMode;
  isPanVisible: boolean;
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  soloTracks, 
  mutedTracks, 
  volumes,
  pans,
  loadingTracks,
  onMuteToggle, 
  onSoloToggle,
  onVolumeChange,
  onPanChange,
  isPlaying,
  vuData,
  playbackMode,
  isPanVisible,
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
        
        return (
          <TrackPad
            key={track.id}
            track={track}
            isLoading={isLoading}
            isMuted={isMuted}
            isSolo={isSolo}
            isAudible={isAudible}
            volume={volumes[track.id] ?? 75}
            pan={pans[track.id] ?? 0}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            onVolumeChange={(newVolume) => onVolumeChange(track.id, newVolume)}
            onPanChange={(newPan) => onPanChange(track.id, newPan)}
            vuMeterLevel={vuData[track.id] || 0}
            playbackMode={playbackMode}
            isPanVisible={isPanVisible}
          />
        );
      })}
    </div>
  );
};

export default MixerGrid;

    