
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export interface NewSetlist {
  name: string;
  date: Date;
  userId: string;
}

// Interfaz para una canción dentro de un setlist
// Esto ahora representa una pista individual de una canción más grande.
export interface SetlistSong {
  id: string; // Puede ser un ID único para la pista en el contexto del setlist, o el ID de la canción padre.
  name: string; // Nombre de la pista individual, ej: "Guitars"
  url: string;
  fileKey: string;
  // Opcionalmente, podrías añadir metadatos de la canción padre si es necesario
  songId?: string;
  songName?: string;
}

export interface Setlist extends NewSetlist {
    id: string;
    songs: SetlistSong[]; 
}


export async function saveSetlist(data: NewSetlist) {
  try {
    const setlistsCollection = collection(db, 'setlists');
    
    const newDoc = await addDoc(setlistsCollection, {
      ...data,
      createdAt: serverTimestamp(),
      songs: [], // Inicialmente el setlist no tiene canciones
    });

    const setlistData = {
      id: newDoc.id,
      ...data,
      songs: []
    }

    return { success: true, setlist: setlistData };
  } catch (error) {
    console.error('Error guardando setlist en Firestore:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getSetlists(userId: string) {
    try {
        const setlistsCollection = collection(db, 'setlists');
        // Por ahora se obtienen todos, pero en el futuro se filtrará por userId
        const q = query(setlistsCollection, orderBy('createdAt', 'desc'));
        const setlistsSnapshot = await getDocs(q);
        
        const setlists = setlistsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                date: data.date.toDate(), // Convertir Timestamp a Date
                userId: data.userId,
                songs: data.songs || [],
            } as Setlist;
        });

        return { success: true, setlists };
    } catch (error) {
        console.error("Error obteniendo setlists de Firestore:", error);
        return { success: false, error: (error as Error).message, setlists: [] };
    }
}

export async function addSongToSetlist(setlistId: string, song: SetlistSong) {
  try {
    const setlistRef = doc(db, 'setlists', setlistId);
    
    // Atomically add a new song to the "songs" array field.
    await updateDoc(setlistRef, {
      songs: arrayUnion(song)
    });

    return { success: true };
  } catch (error) {
    console.error('Error añadiendo canción al setlist:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function removeSongFromSetlist(setlistId: string, song: SetlistSong) {
  try {
    const setlistRef = doc(db, 'setlists', setlistId);

    // Atomically remove a song from the "songs" array field.
    await updateDoc(setlistRef, {
      songs: arrayRemove(song)
    });

    return { success: true };
  } catch (error) {
    console.error('Error eliminando canción del setlist:', error);
    return { success: false, error: (error as Error).message };
  }
}
