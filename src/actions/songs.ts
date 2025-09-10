
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, deleteDoc } from 'firebase/firestore';

// Represents a single track file within a song
export interface TrackFile {
  name: string;
  url: string;
  fileKey: string;
}

// Represents the new Song entity, which is a collection of tracks and metadata
export interface NewSong {
  name: string;
  artist: string;
  tempo: number;
  key: string;
  timeSignature: string;
  tracks: TrackFile[];
}

export interface Song extends NewSong {
    id: string;
}

export async function saveSong(data: NewSong) {
  try {
    const songsCollection = collection(db, 'songs');
    
    const newDoc = await addDoc(songsCollection, {
      ...data,
      createdAt: serverTimestamp(),
    });

    const songData: Song = {
      id: newDoc.id,
      ...data
    }

    return { success: true, song: songData };
  } catch (error) {
    console.error('Error guardando en Firestore:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getSongs() {
    try {
        const songsCollection = collection(db, 'songs');
        const q = query(songsCollection, orderBy('createdAt', 'desc'));
        const songsSnapshot = await getDocs(q);
        
        const songs: Song[] = songsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                artist: data.artist,
                tempo: data.tempo,
                key: data.key,
                timeSignature: data.timeSignature,
                tracks: data.tracks || []
            };
        });

        return { success: true, songs };
    } catch (error) {
        console.error("Error obteniendo canciones de Firestore:", error);
        return { success: false, error: (error as Error).message, songs: [] };
    }
}

export async function deleteSong(song: Song) {
    try {
        // We only delete the document from Firestore, not the files from B2.
        const songRef = doc(db, 'songs', song.id);
        await deleteDoc(songRef);

        return { success: true };
    } catch (error) {
        console.error("Error eliminando la canción de la biblioteca:", error);
        return { success: false, error: (error as Error).message };
    }
}
