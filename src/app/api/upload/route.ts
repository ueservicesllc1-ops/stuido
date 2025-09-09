import { NextResponse } from 'next/server';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import { uploadFileToB2 } from '@/actions/upload';
import { saveSong } from '@/actions/songs';

// Aumentamos el límite de tamaño del cuerpo de la petición
export const config = {
  api: {
    bodyParser: false,
  },
};

// Función para parsear el formulario con formidable
const parseForm = (req: Request): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
    });
    
    // formidable v3 necesita un objeto de request de Node.js, lo adaptamos
    const reqHeaders = Object.fromEntries(req.headers);
    const mockReq = {
        headers: reqHeaders,
        [Symbol.asyncIterator]: req.body?.[Symbol.asyncIterator].bind(req.body),
    };

    form.parse(mockReq as any, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
};


export async function POST(req: Request) {
  try {
    const { fields, files } = await parseForm(req);

    const file = files.file?.[0];
    const name = fields.name?.[0];

    if (!file || !name) {
      return NextResponse.json({ success: false, error: 'Faltan campos: nombre o archivo.' }, { status: 400 });
    }

    // Adaptamos el archivo de formidable al tipo File esperado por la acción
    const fileContent = await fs.readFile(file.filepath);
    const fileToUpload = new File([fileContent], file.originalFilename || 'untitled', { type: file.mimetype || 'application/octet-stream' });


    // 1. Subir el archivo a B2
    const uploadResult = await uploadFileToB2(fileToUpload);
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

    if (!saveResult.success) {
      // (Opcional) Aquí podrías intentar borrar el archivo de B2 si falla el guardado en DB
      return NextResponse.json({ success: false, error: saveResult.error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, song: saveResult.song });

  } catch (error: any) {
    console.error('Error en el endpoint de subida:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
