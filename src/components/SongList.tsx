'use client';
import React from 'react';
import { Button } from './ui/button';
import { AlignJustify, Library, MoreHorizontal, Music, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const songs: { title: string; key: string; bpm: string | number }[] = [];

const SongList = () => {
  return (
    <div className="bg-card/50 rounded-lg p-3 flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-foreground">Nuevas betel</h2>
        <Button variant="ghost" size="sm" className="gap-2 text-primary">
          <AlignJustify className="w-4 h-4" />
          Setlists
        </Button>
      </div>
      <div className="flex-grow space-y-1 overflow-y-auto">
        {songs.map((song, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer',
              index === 0 ? 'bg-primary/20' : 'hover:bg-accent'
            )}
          >
            <span className="text-muted-foreground font-mono text-sm">{index + 1}</span>
            <Music className="w-5 h-5 text-muted-foreground" />
            <div className="flex-grow">
              <p className="font-semibold text-foreground">{song.title}</p>
              <p className="text-xs text-muted-foreground">Original</p>
            </div>
            <Button variant="ghost" size="icon" className="w-6 h-6"><MoreHorizontal className="w-4 h-4" /></Button>
            <span className="w-6 text-center font-mono text-xs text-muted-foreground">{song.key}</span>
            <span className="w-8 text-right font-mono text-xs text-muted-foreground">{song.bpm}</span>
            <div className="w-4 h-4 border-2 border-muted-foreground rounded-sm"></div>
          </div>
        ))}
      </div>
      <div className="pt-3 mt-auto border-t border-border/50 flex justify-between items-center">
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
            <Library className="w-4 h-4" />
            Library
        </Button>
         <Button variant="ghost" size="sm" className="text-muted-foreground">
            Edit setlist
        </Button>
      </div>
    </div>
  );
};

export default SongList;
