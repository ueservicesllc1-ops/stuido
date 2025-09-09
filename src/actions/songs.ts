'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';

export interface NewSong {
  name: string;
  url: string;
  fileKey: string;
}

export async function saveSong(data: NewSong) {
  try {
    const songsCollection = collection(db, 'songs');
    const newDoc = await addDoc(songsCollection, {
      ...data,
      createdAt: serverTimestamp(),
    });

    const songData = {
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
        
        const songs = songsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            url: doc.data().url,
            fileKey: doc.data().fileKey
        }));

        return { success: true, songs };
    } catch (error) {
        console.error("Error obteniendo canciones de Firestore:", error);
        return { success: false, error: (error as Error).message, songs: [] };
    }
}
