
'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LyricsDisplayProps {
  // Props se mantienen por si se reutiliza para otra cosa, pero el texto ya no se usa.
  text: string;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ text }) => {
  const imagePlaceholders = [
    { seed: "pads", hint: "abstract texture" },
    { seed: "loops", hint: "music studio" },
    { seed: "effects", hint: "sound waves" },
    { seed: "samples", hint: "audio waveform" },
  ]

  return (
    <div className="bg-black/80 border border-amber-400/20 rounded-lg p-2 h-full">
      <div className="grid grid-cols-4 gap-2 h-full">
        {imagePlaceholders.map((img, index) => (
            <div 
              key={index}
              className="relative w-full h-full rounded-md overflow-hidden group cursor-pointer"
            >
              <Image 
                  src={`https://picsum.photos/seed/${img.seed}/400/200`}
                  alt={`Image button ${index + 1}`}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-300 group-hover:scale-105"
                  data-ai-hint={img.hint}
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-2 left-2">
                <span className="font-mono text-lg text-white/90 font-bold tracking-wider uppercase [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]">
                  {img.seed}
                </span>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default LyricsDisplay;
