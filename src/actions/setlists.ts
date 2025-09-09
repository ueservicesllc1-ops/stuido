'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface NewSetlist {
  name: string;
  date: Date;
  userId: string;
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
