'use client';

import React from 'react';
import { Music2, MoreHorizontal } from 'lucide-react';
import { Checkbox } from './ui/checkbox';

interface Song {
    id: number;
    title: string;
    original: string;
    key: string;
    bpm: string | number;
}

interface SongListProps {
    songs: Song[];
}

const SongList: React.FC<SongListProps> = ({ songs }) => {
    return (
        <div className="flex-grow overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Nuevas betel</h2>
                <button className="text-sm text-primary hover:underline">Setlists</button>
            </div>
            <div className="space-y-1 pr-2">
                {songs.map((song, index) => (
                    <div key={song.id} className="flex items-center gap-3 p-1.5 rounded-md hover:bg-secondary/50 cursor-pointer">
                        <span className="text-sm text-muted-foreground w-4 text-center">{index + 1}</span>
                        <Music2 className="text-muted-foreground" size={24} />
                        <div className="flex-grow">
                            <p className="font-semibold leading-tight">{song.title}</p>
                            <p className="text-xs text-muted-foreground">{song.original}</p>
                        </div>
                        <MoreHorizontal className="text-muted-foreground" size={20}/>
                        <span className="text-sm w-6 text-center">{song.key}</span>
                        <span className="text-sm w-8 text-center">{song.bpm}</span>
                        <Checkbox id={`song-${song.id}`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SongList;
