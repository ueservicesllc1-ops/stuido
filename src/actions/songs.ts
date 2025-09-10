
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
// Eliminamos la importación de deleteFileFromB2 ya que no se usará
// import { deleteFileFromB2 } from './upload';

export interface NewSong {
  name: string;
  url: string;
  fileKey: string;
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
        
        const songs: Song[] = songsSnapshot.docs.map(doc => ({
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

export async function deleteSong(song: Song) {
    try {
        // Ya no eliminamos el archivo de B2, solo de Firestore.
        // La lógica de eliminación del archivo físico ha sido removida.

        // 1. Delete document from Firestore
        const songRef = doc(db, 'songs', song.id);
        await deleteDoc(songRef);

        return { success: true };
    } catch (error) {
        console.error("Error eliminando la canción de la biblioteca:", error);
        return { success: false, error: (error as Error).message };
    }
}
