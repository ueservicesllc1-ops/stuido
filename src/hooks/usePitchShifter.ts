
'use client';
import { useState, useEffect, useCallback } from 'react';

const WORKLET_NAME = 'pitch-shifter-processor';
const WORKLET_PATH = '/pitch-shifter-processor.js';

export const usePitchShifter = (audioContext: AudioContext | null) => {
  const [isPitchShifterReady, setIsPitchShifterReady] = useState(false);

  useEffect(() => {
    if (!audioContext) {
        setIsPitchShifterReady(false);
        return;
    }

    let isCancelled = false;

    const initializeWorklet = async () => {
      try {
        await audioContext.audioWorklet.addModule(WORKLET_PATH);
        if (!isCancelled) {
          setIsPitchShifterReady(true);
          console.log('AudioWorklet for Pitch Shifter loaded successfully.');
        }
      } catch (e) {
        console.error('Failed to load Pitch Shifter AudioWorklet', e);
        if (!isCancelled) {
          setIsPitchShifterReady(false);
        }
      }
    };

    if (audioContext.state === 'running') {
        initializeWorklet();
    } else {
        const resumeAndInit = async () => {
            await audioContext.resume();
            initializeWorklet();
        };
        resumeAndInit();
    }
    

    return () => {
      isCancelled = true;
    };
  }, [audioContext]);

  const createPitchShifterNode = useCallback(() => {
    if (!isPitchShifterReady || !audioContext) {
      return null;
    }
    try {
      return new AudioWorkletNode(audioContext, WORKLET_NAME);
    } catch (e) {
      console.error('Error creating PitchShifterNode:', e);
      return null;
    }
  }, [isPitchShifterReady, audioContext]);

  return { isPitchShifterReady, createPitchShifterNode };
};
