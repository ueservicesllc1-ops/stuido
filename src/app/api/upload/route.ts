import { NextResponse } from 'next/server';
import { uploadFileToB2 } from '@/actions/upload';
import { saveSong } from '@/actions/songs';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Aumentar el límite a 50MB
    },
  },
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file || !name) {
      return NextResponse.json({ success: false, error: 'Faltan campos: nombre o archivo.' }, { status: 400 });
    }

    // 1. Subir el archivo a B2
    const uploadResult = await uploadFileToB2(file);
    if (!uploadResult.success || !uploadResult.url || !uploadResult.fileKey) {
      console.error("Error en la subida a B2:", uploadResult.error);
      return NextResponse.json({ success: false, error: uploadResult.error || "No se pudo obtener la URL del archivo de B2." }, { status: 500 });
    }

    // 2. Guardar la información en Firestore
    const songData = {
      name: name,
      url: uploadResult.url,
      fileKey: uploadResult.fileKey,
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
