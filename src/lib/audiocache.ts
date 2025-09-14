'use client';

// Dynamically import localforage to avoid SSR issues.
import type LocalForage from 'localforage';

let localforage: LocalForage | null = null;
let isConfigured = false;

const getLocalforage = async () => {
    if (!localforage) {
        localforage = (await import('localforage')).default;
    }
    
    if (!isConfigured) {
        localforage.config({
            driver: localforage.INDEXEDDB,
            name: 'multitrackPlayerCache',
            version: 1.0,
            storeName: 'audio_array_buffers', // Store ArrayBuffers, not AudioBuffers
            description: 'Cache for raw audio ArrayBuffers',
        });
        isConfigured = true;
    }
    return localforage;
};


/**
 * Retrieves a raw ArrayBuffer from the IndexedDB cache.
 * @param url The original URL of the audio file, used as the key.
 * @returns The ArrayBuffer if found, or null if not.
 */
export const getCachedArrayBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const lf = await getLocalforage();
    const cachedBuffer = await lf.getItem<ArrayBuffer>(url);
    
    if (cachedBuffer && cachedBuffer instanceof ArrayBuffer) {
      console.log('ArrayBuffer retrieved from cache:', url);
      return cachedBuffer;
    }
    return null;
  } catch (error) {
    console.error('Error getting ArrayBuffer from cache:', error);
    return null;
  }
};

/**
 * Saves a raw ArrayBuffer to the IndexedDB cache.
 * @param url The URL of the audio file to use as a key.
 * @param buffer The raw ArrayBuffer to save.
 */
export const cacheArrayBuffer = async (url: string, buffer: ArrayBuffer): Promise<void> => {
  try {
    const lf = await getLocalforage();
    await lf.setItem(url, buffer);
    console.log('ArrayBuffer cached:', url);
  } catch (error) {
    console.error('Error caching ArrayBuffer:', error);
    throw error;
  }
};