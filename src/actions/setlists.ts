'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';

export interface NewSetlist {
  name: string;
  date: Date;
  userId: string;
}

export interface Setlist extends NewSetlist {
    id: string;
    songs: any[]; // Se definirá más adelante
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
                songs: data.songs,
            } as Setlist;
        });

        return { success: true, setlists };
    } catch (error) {
        console.error("Error obteniendo setlists de Firestore:", error);
        return { success: false, error: (error as Error).message, setlists: [] };
    }
}