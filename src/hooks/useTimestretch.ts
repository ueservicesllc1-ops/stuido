
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SimpleFilter, SoundTouch } from 'soundtouchjs';

const BUFFER_SIZE = 4096;

export const useTimestretch = (audioContext: AudioContext | null) => {
    const [isTimestretchReady, setIsTimestretchReady] = useState(false);
    const soundtouchRef = useRef<SoundTouch | null>(null);

    useEffect(() => {
        if (audioContext && !isTimestretchReady) {
            // SoundTouch is instantiated directly, no async loading needed for the library itself.
            soundtouchRef.current = new SoundTouch();
            setIsTimestretchReady(true);
        }
    }, [audioContext, isTimestretchReady]);

    const createTimestretchNode = useCallback((channels: number, initialPitch: number) => {
        if (!audioContext || !soundtouchRef.current) {
            throw new Error("Timestretch hook is not ready or AudioContext is not available.");
        }
        
        const stretcher = {
            soundtouch: soundtouchRef.current,
            node: audioContext.createScriptProcessor(BUFFER_SIZE, channels, channels),
            filter: new SimpleFilter(null, soundtouchRef.current),
            pitch: initialPitch,
        };

        stretcher.soundtouch.pitch = initialPitch;

        const onAudioProcess = (e: AudioProcessingEvent) => {
            const inputBuffer = e.inputBuffer;
            const outputBuffer = e.outputBuffer;
            const numFrames = inputBuffer.length;

            // Update pitch if it has changed
            if (stretcher.soundtouch.pitch !== stretcher.pitch) {
                 stretcher.soundtouch.pitch = stretcher.pitch;
            }

            stretcher.filter.source = {
                extract: (target, numFramesToExtract, position) => {
                    const l = inputBuffer.getChannelData(0);
                    const r = channels > 1 ? inputBuffer.getChannelData(1) : l;

                    for (let i = 0; i < numFramesToExtract; i++) {
                        target[i * 2] = l[i + position];
                        target[i * 2 + 1] = r[i + position];
                    }
                    return Math.min(numFramesToExtract, l.length - position);
                },
            };

            const samples = new Float32Array(numFrames * 2);
            
            // CORRECTED LOGIC: Extract the processed samples from the filter
            stretcher.filter.extract(samples, numFrames);

            const outL = outputBuffer.getChannelData(0);
            const outR = channels > 1 ? outputBuffer.getChannelData(1) : outL;
            
            for (let i = 0; i < numFrames; i++) {
                outL[i] = samples[i * 2];
                if (channels > 1) {
                    outR[i] = samples[i * 2 + 1];
                }
            }
        };

        stretcher.node.onaudioprocess = onAudioProcess;
        
        return stretcher;

    }, [audioContext]);

    return { isTimestretchReady, createTimestretchNode };
};
