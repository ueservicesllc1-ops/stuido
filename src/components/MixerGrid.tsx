
'use client';
import React from 'react';
import TrackPad from './TrackPad';
import { SetlistSong } from '@/actions/setlists';

interface MixerGridProps {
  tracks: SetlistSong[];
  soloTracks: string[];
  mutedTracks: string[];
  pans: { [key: string]: number };
  volumes: { [key: string]: number };
  loadingTracks: Set<string>;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onPanChange: (trackId: string, newPan: number) => void;
  onVolumeChange: (trackId: string, newVolume: number) => void;
  vuData: Record<string, number>;
  isPanVisible: boolean;
  isPlaying: boolean;
  loadedFrom: Record<string, 'cache' | 'network'>;
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  soloTracks, 
  mutedTracks,
  pans,
  volumes,
  loadingTracks,
  onMuteToggle, 
  onSoloToggle,
  onPanChange,
  onVolumeChange,
  vuData,
  isPanVisible,
  isPlaying,
  loadedFrom,
}) => {
  const isSoloActive = soloTracks.length > 0;

  return (
    <div className="grid grid-cols-7 gap-2 items-start">
      {tracks.map(track => {
        const isMuted = mutedTracks.includes(track.id);
        const isSolo = soloTracks.includes(track.id);
        const isLoading = loadingTracks.has(track.id);
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
            volume={volumes[track.id] ?? 75}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            onPanChange={(newPan) => onPanChange(track.id, newPan)}
            onVolumeChange={(newVol) => onVolumeChange(track.id, newVol)}
            vuMeterLevel={vuData[track.id] || 0}
            isPanVisible={isPanVisible}
            loadedFrom={loadedFrom[track.id]}
          />
        );
      })}
    </div>
  );
};

export default MixerGrid;

    

    