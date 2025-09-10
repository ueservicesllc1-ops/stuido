
'use client';
import localforage from 'localforage';

// Configurar localforage para usar IndexedDB
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'multitrackPlayerCache',
  version: 1.0,
  storeName: 'audio_tracks',
  description: 'Cache for audio tracks',
});

/**
 * Obtiene un archivo de audio de la caché de IndexedDB.
 * @param url La URL original del archivo de audio, usada como clave.
 * @returns El Blob del audio si se encuentra, o null si no.
 */
export const getCachedAudio = async (url: string): Promise<Blob | null> => {
  try {
    const cachedBlob = await localforage.getItem<Blob>(url);
    if (cachedBlob && cachedBlob instanceof Blob) {
      console.log('Audio recuperado de la caché:', url);
      return cachedBlob;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener audio de la caché:', error);
    return null;
  }
};

/**
 * Guarda un blob de audio en la caché de IndexedDB.
 * @param url La URL del archivo de audio para usar como clave.
 * @param blob El Blob de audio para guardar.
 * @returns El Blob guardado.
 */
export const cacheAudio = async (url: string, blob: Blob): Promise<Blob> => {
  try {
    await localforage.setItem(url, blob);
    console.log('Audio cacheado:', url);
    return blob;
  } catch (error) {
    console.error('Error al cachear el audio:', error);
    // Re-lanzamos el error para que el que llama pueda manejarlo
    throw error;
  }
};
