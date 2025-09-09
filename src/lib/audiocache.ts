'use client';
import localforage from 'localforage';

// Configure localforage to use IndexedDB
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'multitrack-audio-cache',
  version: 1.0,
  storeName: 'audio_files',
  description: 'Cache for audio tracks',
});

/**
 * Retrieves an audio blob from the IndexedDB cache.
 * @param url The original URL of the audio file.
 * @returns A Promise that resolves to the audio Blob if found, or null otherwise.
 */
export const getCachedAudio = async (url: string): Promise<Blob | null> => {
  try {
    const cachedBlob = await localforage.getItem<Blob>(url);
    if (cachedBlob) {
      // console.log('Audio found in cache:', url);
    }
    return cachedBlob;
  } catch (error) {
    console.error('Error retrieving from cache:', error);
    return null;
  }
};

/**
 * Fetches an audio file from the network and caches it in IndexedDB.
 * @param url The URL of the audio file to fetch and cache.
 * @returns A Promise that resolves to the fetched audio Blob.
 * @throws Will throw an error if the network request fails.
 */
export const cacheAudio = async (url: string): Promise<Blob> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const audioBlob = await response.blob();
    await localforage.setItem(url, audioBlob);
    // console.log('Audio cached successfully:', url);
    return audioBlob;
  } catch (error) {
    console.error('Error caching audio:', error);
    throw error;
  }
};
