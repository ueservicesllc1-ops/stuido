
'use client';
import React from 'react';
import TrackPad from './TrackPad';
import { SetlistSong } from '@/actions/setlists';

interface MixerGridProps {
  tracks: SetlistSong[];
  soloTracks: string[];
  mutedTracks: string[];
  playingTracks: Set<string>;
  pans: { [key: string]: number };
  loadingTracks: Set<string>;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onPanChange: (trackId: string, newPan: number) => void;
  onTrackPlayToggle: (trackId: string) => void;
  vuData: Record<string, number>;
  isPanVisible: boolean;
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  soloTracks, 
  mutedTracks,
  playingTracks,
  pans,
  loadingTracks,
  onMuteToggle, 
  onSoloToggle,
  onPanChange,
  onTrackPlayToggle,
  vuData,
  isPanVisible,
}) => {
  const isSoloActive = soloTracks.length > 0;

  return (
    <div className="grid grid-cols-7 gap-2 items-start">
      {tracks.map(track => {
        const isMuted = mutedTracks.includes(track.id);
        const isSolo = soloTracks.includes(track.id);
        const isLoading = loadingTracks.has(track.id);
        const isPlaying = playingTracks.has(track.id);
        const isDisabled = isLoading;

        const isAudible = isPlaying && !isDisabled && !isMuted && (!isSoloActive || isSolo);
        
        return (
          <TrackPad
            key={track.id}
            track={track}
            isLoading={isLoading}
            isPlaying={isPlaying}
            isMuted={isMuted}
            isSolo={isSolo}
            isAudible={isAudible}
            pan={pans[track.id] ?? 0}
            onPlayToggle={() => onTrackPlayToggle(track.id)}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            onPanChange={(newPan) => onPanChange(track.id, newPan)}
            vuMeterLevel={vuData[track.id] || 0}
            isPanVisible={isPanVisible}
          />
        );
      })}
    </div>
  );
};

export default MixerGrid;
