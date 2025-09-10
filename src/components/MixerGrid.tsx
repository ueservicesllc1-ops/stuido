
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
  hybridDownloadingTracks: Set<string>;
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
  cachedTracks,
  hybridDownloadingTracks
}) => {
  const isSoloActive = soloTracks.length > 0;

  return (
    <div className="grid grid-cols-7 gap-4 items-start">
      {tracks.map(track => {
        const isMuted = mutedTracks.includes(track.id);
        const isSolo = soloTracks.includes(track.id);
        const isDownloadingForOffline = playbackMode === 'offline' && !cachedTracks.has(track.id);
        const isDisabled = loadingTracks.includes(track.id) || isDownloadingForOffline;

        const isAudible = isPlaying && !isDisabled && !isMuted && (!isSoloActive || isSolo);

        return (
          <TrackPad
            key={track.id}
            track={track}
            isLoading={loadingTracks.includes(track.id)}
            isMuted={isMuted}
            isSolo={isSolo}
            isAudible={isAudible}
            volume={volumes[track.id] ?? 75}
            onMuteToggle={() => onMuteToggle(track.id)}
            onSoloToggle={() => onSoloToggle(track.id)}
            onVolumeChange={(newVolume) => onVolumeChange(track.id, newVolume)}
            isPlaying={isPlaying}
            playbackPosition={playbackPosition}
            duration={duration}
            playbackMode={playbackMode}
            isCached={cachedTracks.has(track.id)}
            isHybridDownloading={hybridDownloadingTracks.has(track.id)}
          />
        );
      })}
    </div>
  );
};

export default MixerGrid;
