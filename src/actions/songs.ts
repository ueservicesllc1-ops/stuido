
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { analyzeSongStructure, SongStructure } from '@/ai/flows/song-structure';

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
    structure?: SongStructure;
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
    
    // Disparar el análisis de estructura en segundo plano
    runStructureAnalysis(newDoc.id, data.tracks);

    return { success: true, song: songData };
  } catch (error) {
    console.error('Error guardando en Firestore:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function runStructureAnalysis(songId: string, tracks: TrackFile[]) {
    try {
        const cuesTrack = tracks.find(t => t.name.trim().toUpperCase() === 'CUES');
        if (cuesTrack) {
            console.log(`Iniciando análisis de estructura para la canción ${songId}...`);
            const structure = await analyzeSongStructure({ audioDataUri: cuesTrack.url });
            
            const songRef = doc(db, 'songs', songId);
            await updateDoc(songRef, { structure });
            console.log(`Estructura guardada para la canción ${songId}.`);
            return structure;
        } else {
            console.log(`No se encontró pista 'CUES' para la canción ${songId}. No se analizará la estructura.`);
            return null;
        }
    } catch (error) {
        console.error(`Error al analizar la estructura de la canción ${songId}:`, error);
        // No devolvemos error al cliente, es un proceso de fondo.
        throw error;
    }
}

export async function reanalyzeSongStructure(songId: string): Promise<{ success: boolean; structure?: SongStructure, error?: string }> {
    try {
        const songRef = doc(db, 'songs', songId);
        const songSnap = await getDoc(songRef);

        if (!songSnap.exists()) {
            throw new Error('La canción no existe.');
        }

        const songData = songSnap.data() as Omit<Song, 'id'>;
        const structure = await runStructureAnalysis(songId, songData.tracks);

        if (structure) {
            return { success: true, structure };
        } else {
            return { success: false, error: 'No se encontró una pista de "CUES" para analizar.' };
        }
    } catch (error) {
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
                tracks: data.tracks || [],
                structure: data.structure,
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
