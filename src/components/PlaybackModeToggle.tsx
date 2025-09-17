
'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cloud, Database } from 'lucide-react';

type PlaybackMode = 'online' | 'cache';

interface PlaybackModeToggleProps {
  mode: PlaybackMode;
  onModeChange: (mode: PlaybackMode) => void;
}

const PlaybackModeToggle: React.FC<PlaybackModeToggleProps> = ({ mode, onModeChange }) => {
  const isOnline = mode === 'online';

  const handleToggle = (checked: boolean) => {
    onModeChange(checked ? 'online' : 'cache');
  };

  return (
    <div className="flex items-center space-x-2 bg-background/50 p-1.5 rounded-lg border border-border">
      <Label htmlFor="playback-mode-toggle" className="flex items-center gap-2 cursor-pointer">
        <Database className={`w-4 h-4 transition-colors ${!isOnline ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={`text-xs font-medium transition-colors ${!isOnline ? 'text-primary' : 'text-muted-foreground'}`}>
          Cache
        </span>
      </Label>
      <Switch
        id="playback-mode-toggle"
        checked={isOnline}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="playback-mode-toggle" className="flex items-center gap-2 cursor-pointer">
        <Cloud className={`w-4 h-4 transition-colors ${isOnline ? 'text-primary' : 'text-muted-foreground'}`} />
         <span className={`text-xs font-medium transition-colors ${isOnline ? 'text-primary' : 'text-muted-foreground'}`}>
          Online
        </span>
      </Label>
    </div>
  );
};

export default PlaybackModeToggle;

    