
'use client';

import React from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import type { PlaybackMode } from '@/app/page';
import { Wifi, WifiOff, CloudCog } from 'lucide-react';

interface PlaybackModeToggleProps {
  value: PlaybackMode;
  onChange: (mode: PlaybackMode) => void;
}

const PlaybackModeToggle: React.FC<PlaybackModeToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-md">
      <Button
        variant={value === 'online' ? 'ghost' : 'ghost'}
        size="sm"
        onClick={() => onChange('online')}
        className={cn(
          "h-auto px-2 py-1 text-xs gap-2",
          value === 'online' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
        )}
      >
        <Wifi className="w-4 h-4" />
        Online
      </Button>
       <Button
        variant={value === 'hybrid' ? 'ghost' : 'ghost'}
        size="sm"
        onClick={() => onChange('hybrid')}
        className={cn(
          "h-auto px-2 py-1 text-xs gap-2",
          value === 'hybrid' ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground'
        )}
      >
        <CloudCog className="w-4 h-4" />
        Híbrido
      </Button>
      <Button
        variant={value === 'offline' ? 'ghost' : 'ghost'}
        size="sm"
        onClick={() => onChange('offline')}
        className={cn(
          "h-auto px-2 py-1 text-xs gap-2",
          value === 'offline' ? 'bg-yellow-500/20 text-yellow-400' : 'text-muted-foreground'
        )}
      >
        <WifiOff className="w-4 h-4" />
        Offline
      </Button>
    </div>
  );
};

export default PlaybackModeToggle;
