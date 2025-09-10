
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return NextResponse.json({ success: false, error: 'URL del archivo no proporcionada' }, { status: 400 });
  }

  try {
    // Realizamos la petición desde el servidor, que no tiene restricciones CORS
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Error en el servidor al obtener el archivo: ${response.statusText}`);
    }

    // Obtenemos el archivo como un Blob
    const blob = await response.blob();

    // Devolvemos el blob directamente.
    // El navegador lo interpretará como un archivo para descargar/cachear.
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      },
    });

  } catch (error: any) {
    console.error('Error en el proxy de descarga:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
