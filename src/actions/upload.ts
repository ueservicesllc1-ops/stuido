'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function uploadSong(formData: FormData) {
  try {
    const file = formData.get('file') as File | null;
    const songName = formData.get('songName') as string | null;

    if (!file || file.size === 0) {
      return { success: false, error: 'No se ha enviado ningún archivo.' };
    }
    if (!songName) {
      return { success: false, error: 'No se ha enviado el nombre de la canción.' };
    }
    
    const B2_ENDPOINT = process.env.B2_ENDPOINT!;
    const B2_REGION = B2_ENDPOINT.split('.')[1];
    const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME!;

    const s3 = new S3Client({
      endpoint: `https://${B2_ENDPOINT}`,
      region: B2_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APPLICATION_KEY!,
      },
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const key = `${randomUUID()}-${file.name.replace(/\s/g, '_')}`;

    const command = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
      Metadata: {
        'original-filename': file.name,
        'song-name': songName,
      },
    });

    await s3.send(command);
    
    const fileUrl = `https://${B2_BUCKET_NAME}.${B2_ENDPOINT}/${key}`;

    // Guardar en Firestore
    const songsCollection = collection(db, 'songs');
    const newSongDoc = await addDoc(songsCollection, {
      name: songName,
      url: fileUrl,
      key: key,
      createdAt: serverTimestamp(),
    });

    return { success: true, id: newSongDoc.id, name: songName, url: fileUrl };

  } catch (error) {
    console.error('Error subiendo el archivo o guardando en Firestore:', error);
    return { success: false, error: (error as Error).message };
  }
}
