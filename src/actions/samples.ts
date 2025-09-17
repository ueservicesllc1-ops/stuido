
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface Sample {
  id?: string;
  name: string;
  url: string;
  fileKey: string;
  groupKey: string;
  padKey: string;
}

// Devuelve todos los samples para un grupo específico (ej: 'A')
export async function getSamplesByGroup(groupKey: string): Promise<{ success: boolean; samples?: Sample[], error?: string }> {
    try {
        const samplesCollection = collection(db, 'samples');
        const q = query(samplesCollection, where('groupKey', '==', groupKey));
        const samplesSnapshot = await getDocs(q);

        const samples: Sample[] = samplesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Sample, 'id'>)
        }));

        return { success: true, samples };
    } catch (error) {
        console.error(`Error obteniendo samples para el grupo ${groupKey}:`, error);
        return { success: false, error: (error as Error).message };
    }
}


// Guarda o actualiza un sample.
// Si el sample tiene un ID, lo actualiza.
// Si no, busca si ya existe un pad para ese grupo/tecla y lo actualiza, o crea uno nuevo.
export async function saveSample(data: Sample): Promise<{ success: boolean, sample?: Sample, error?: string }> {
  try {
    const samplesCollection = collection(db, 'samples');
    
    if (data.id) {
      // Actualizar un sample existente por su ID
      const sampleRef = doc(db, 'samples', data.id);
      await updateDoc(sampleRef, { ...data });
      return { success: true, sample: { ...data } };
    } else {
      // Buscar si ya existe un pad para este group/pad
      const q = query(samplesCollection, where('groupKey', '==', data.groupKey), where('padKey', '==', data.padKey));
      const existingDocs = await getDocs(q);

      if (!existingDocs.empty) {
        // Si existe, actualizar el documento existente
        const existingDoc = existingDocs.docs[0];
        const sampleRef = doc(db, 'samples', existingDoc.id);
        await updateDoc(sampleRef, { ...data });
        const updatedSample = { ...data, id: existingDoc.id };
        return { success: true, sample: updatedSample };
      } else {
        // Si no existe, crear un nuevo documento
        const newDocData = { ...data, createdAt: serverTimestamp() };
        delete newDocData.id; // Nos aseguramos de no guardar el id undefined
        const newDoc = await addDoc(samplesCollection, newDocData);
        const newSample = { ...data, id: newDoc.id };
        return { success: true, sample: newSample };
      }
    }
  } catch (error) {
    console.error('Error guardando sample en Firestore:', error);
    return { success: false, error: (error as Error).message };
  }
}

    