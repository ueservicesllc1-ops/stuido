'use client';
import React from 'react';
import TrackPad from '@/components/TrackPad';

const trackNames = [
    'CLICK', 'CUES', 'AG', 'BASS', 'BGVS', 'DRUMS',
    'EG 1', 'EG 2', 'EG 3', 'EG 4', 'KEYS1', 'KEYS2',
    'KEYS3', 'KEYS4', 'ORGAN', 'PERC', 'PIANO', 'SYNTH B...'
];

const MixerGrid = () => {
    return (
        <div className="grid grid-cols-6 gap-2 h-full">
            {trackNames.map((name, index) => {
                const isRed = name === 'CLICK' || name === 'CUES';
                const isMuted = name === 'BGVS' || name === 'DRUMS' || name === 'KEYS2' || name === 'SYNTH B...';
                return (
                    <TrackPad 
                        key={name}
                        name={name}
                        color={isRed ? 'red' : 'cyan'}
                        hasSong={!isMuted} // Simulate some tracks not having a song
                        isMuted={name === 'BGVS' || name === 'DRUMS'} // Simulate mute state
                    />
                );
            })}
        </div>
    );
}

export default MixerGrid;
