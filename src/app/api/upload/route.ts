
import { NextResponse } from 'next/server';
import { uploadFileToB2 } from '@/actions/upload';
import { saveSong, TrackFile } from '@/actions/songs';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', 
    },
  },
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const trackNames = formData.getAll('trackNames') as string[];

    const name = formData.get('name') as string;
    const artist = formData.get('artist') as string;
    const tempo = formData.get('tempo') as string;
    const key = formData.get('key') as string;
    const timeSignature = formData.get('timeSignature') as string;

    if (!name || !artist || !tempo || !key || !timeSignature || files.length === 0) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos o archivos.' }, { status: 400 });
    }
    
    if (files.length !== trackNames.length) {
      return NextResponse.json({ success: false, error: 'La cantidad de archivos no coincide con la cantidad de nombres de pista.' }, { status: 400 });
    }

    const uploadedTracks: TrackFile[] = [];

    // 1. Subir todos los archivos a B2 en paralelo
    const uploadPromises = files.map(async (file, index) => {
      const uploadResult = await uploadFileToB2(file);
      if (!uploadResult.success || !uploadResult.url || !uploadResult.fileKey) {
        // Lanzar un error para que Promise.all falle
        throw new Error(uploadResult.error || `No se pudo subir el archivo ${file.name}.`);
      }
      return {
        name: trackNames[index] || file.name,
        url: uploadResult.url,
        fileKey: uploadResult.fileKey,
      };
    });
    
    // Esperar a que todas las subidas terminen
    const results = await Promise.all(uploadPromises);
    uploadedTracks.push(...results);


    // 2. Guardar la información de la canción con todas sus pistas en Firestore
    const songData = {
      name,
      artist,
      tempo: parseInt(tempo, 10),
      key,
      timeSignature,
      tracks: uploadedTracks,
    };
    
    const saveResult = await saveSong(songData);

    if (!saveResult.success || !saveResult.song) {
      return NextResponse.json({ success: false, error: saveResult.error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, song: saveResult.song });

  } catch (error: any) {
    console.error('Error en el endpoint de subida:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
