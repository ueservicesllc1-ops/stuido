
'use client';

// We don't import localforage at the top level anymore.
// Instead, we'll import it dynamically inside the functions.

let isConfigured = false;

const getLocalforage = async () => {
    // Dynamically import localforage
    const localforage = (await import('localforage')).default;
    
    if (!isConfigured) {
        localforage.config({
            driver: localforage.INDEXEDDB,
            name: 'multitrackPlayerCache',
            version: 1.0,
            storeName: 'audio_buffers', // Changed store name to reflect what we store
            description: 'Cache for decoded audio buffers',
        });
        isConfigured = true;
    }
    return localforage;
};


/**
 * Retrieves a decoded AudioBuffer from the IndexedDB cache.
 * @param url The original URL of the audio file, used as the key.
 * @returns The AudioBuffer if found, or null if not.
 */
export const getCachedAudioBuffer = async (url: string): Promise<AudioBuffer | null> => {
  try {
    const localforage = await getLocalforage();
    // Important: We assume the stored item is an AudioBuffer. 
    // Type casting might be needed if other types are stored.
    const cachedBuffer = await localforage.getItem<AudioBuffer>(url);
    if (cachedBuffer && cachedBuffer instanceof AudioBuffer) {
      console.log('AudioBuffer retrieved from cache:', url);
      return cachedBuffer;
    }
    return null;
  } catch (error) {
    console.error('Error getting AudioBuffer from cache:', error);
    // If there's a corruption error, it might be good to clear the item
    // localforage.removeItem(url);
    return null;
  }
};

/**
 * Saves a decoded AudioBuffer to the IndexedDB cache.
 * @param url The URL of the audio file to use as a key.
 * @param buffer The decoded AudioBuffer to save.
 */
export const cacheAudioBuffer = async (url: string, buffer: AudioBuffer): Promise<void> => {
  try {
    const localforage = await getLocalforage();
    await localforage.setItem(url, buffer);
    console.log('AudioBuffer cached:', url);
  } catch (error) {
    console.error('Error caching AudioBuffer:', error);
    // Re-throw the error so the caller can handle it
    throw error;
  }
};
