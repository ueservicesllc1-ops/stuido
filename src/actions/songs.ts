'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { deleteFileFromB2 } from './upload';

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
        // 1. Delete file from B2
        const deleteFileResult = await deleteFileFromB2(song.fileKey);
        if (!deleteFileResult.success) {
            // Log the error but proceed to delete from Firestore anyway, 
            // as the file might already be gone. Or handle more gracefully.
            console.error(`Could not delete file ${song.fileKey} from B2:`, deleteFileResult.error);
            // Decide if you want to stop or continue. For now, we continue.
        }

        // 2. Delete document from Firestore
        const songRef = doc(db, 'songs', song.id);
        await deleteDoc(songRef);

        return { success: true };
    } catch (error) {
        console.error("Error eliminando la canción:", error);
        return { success: false, error: (error as Error).message };
    }
}
