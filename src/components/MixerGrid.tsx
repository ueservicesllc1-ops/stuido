
'use client';
import React from 'react';
import TrackPad from './TrackPad';
import { SetlistSong } from '@/actions/setlists';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


interface MixerGridProps {
  tracks: SetlistSong[];
  soloTracks: string[];
  mutedTracks: string[];
  volumes: { [key: string]: number };
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  isPlaying: boolean;
  playbackPosition: number;
  duration: number;
  loadingTracks: string[];
}

const MixerGrid: React.FC<MixerGridProps> = ({ 
  tracks, 
  soloTracks, 
  mutedTracks, 
  volumes,
  onMuteToggle, 
  onSoloToggle,
  onVolumeChange,
  isPlaying,
  playbackPosition,
  duration,
  loadingTracks,
}) => {
  return (
    <div className="grid grid-cols-6 gap-4">
      {tracks.map(track => (
        <TrackPad
          key={track.id}
          track={track}
          isMuted={mutedTracks.includes(track.id)}
          isSolo={soloTracks.includes(track.id)}
          volume={volumes[track.id] ?? 75}
          onMuteToggle={() => onMuteToggle(track.id)}
          onSoloToggle={() => onSoloToggle(track.id)}
          onVolumeChange={(newVolume) => onVolumeChange(track.id, newVolume)}
          isPlaying={isPlaying}
          playbackPosition={playbackPosition}
          duration={duration}
        />
      ))}
      {loadingTracks.map(loadingId => {
        // Find the track name from the original tracks list if available
        // This part is tricky if the track isn't in the visible `tracks` prop
        // We'll just show a generic loader for now.
        return (
          <div key={`loading-${loadingId}`} className="flex flex-col items-center justify-center gap-2 h-[268px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className={cn(
                "text-xs font-semibold uppercase text-muted-foreground tracking-wider"
              )}>Cargando...</span>
          </div>
        )
      })}
    </div>
  );
};

export default MixerGrid;
