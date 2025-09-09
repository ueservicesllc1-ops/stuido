'use client';
import React from 'react';
import { Power, Circle, Disc, SkipBack, SkipForward, Play, Square, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Fader from '@/components/Fader';

const faderLabels = ['PHISITE', 'NISKE', 'TWE', 'ME', 'MHI', 'TAU'];
const transportLabels = ['SMOG', 'BI', 'AM'];
const secondTransportLabels = ['LONT', 'JAG'];
const lastTransportLabels = ['SIHO', 'H'];

const MinimalistLab = () => {
  return (
    <div className="bg-neutral-300 p-3 rounded-lg shadow-2xl w-full max-w-5xl border-t border-white/40 border-l border-white/40">
      <div className="bg-neutral-800 text-neutral-300 p-2 rounded-md">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full border border-black"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full border border-black"></div>
          </div>
          <h1 className="text-lg font-bold font-mono tracking-widest">MINIMALIST LAB</h1>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-green-500 rounded-full border border-black"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full border border-black"></div>
          </div>
        </div>

        <Separator className="my-2 bg-neutral-700"/>

        {/* Main Content Area */}
        <div className="bg-neutral-900/70 p-4 rounded-md border border-black">
          <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
            
            {/* Faders section */}
            <div className="md:col-span-6">
                <div className="grid grid-cols-6 gap-4">
                    {faderLabels.map(label => <Fader key={label} label={label} />)}
                </div>
            </div>

            {/* Right side controls */}
            <div className="md:col-span-2 flex flex-col items-center justify-between">
                <div className="w-full bg-neutral-800 p-2 rounded-md">
                    <Button className="w-full bg-red-600 text-white hover:bg-red-700">GDH</Button>
                    <div className="flex justify-between my-2">
                        <Button variant="secondary" size="icon"><SkipBack /></Button>
                        <Button variant="secondary" size="icon"><SkipForward /></Button>
                    </div>
                     <Button variant="secondary" className="w-full">
                        <Power />
                     </Button>
                </div>
            </div>
          </div>
          
          <Separator className="my-4 bg-neutral-700"/>

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-2">
            {transportLabels.map(label => <Button key={label} variant="secondary" className="w-16 h-10 text-green-400 bg-neutral-700">{label}</Button>)}
            <Button variant="secondary" className="w-10 h-10 bg-neutral-700"><Disc className="text-green-400" /></Button>
            <Button variant="secondary" className="w-10 h-10 bg-neutral-700"><Repeat className="text-green-400" /></Button>
            {secondTransportLabels.map(label => <Button key={label} variant="secondary" className="w-16 h-10 text-green-400 bg-neutral-700">{label}</Button>)}
             <Button variant="secondary" className="w-10 h-10 bg-neutral-700"><Play className="text-green-400" /></Button>
             <Button variant="secondary" className="w-10 h-10 bg-neutral-700"><Square className="text-green-400" /></Button>
            {lastTransportLabels.map(label => <Button key={label} variant="secondary" className="w-16 h-10 text-green-400 bg-neutral-700">{label}</Button>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinimalistLab;
