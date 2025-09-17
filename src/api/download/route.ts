
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return new Response('URL del archivo no proporcionada', { status: 400 });
  }

  try {
    // Realizamos la petición desde el servidor, que no tiene restricciones CORS
    const response = await fetch(fileUrl);

    if (!response.ok) {
      // Devolver una respuesta de error con el mismo status code que falló
      return new Response(`Error en el servidor al obtener el archivo: ${response.statusText}`, { status: response.status });
    }

    // Obtenemos el archivo como un Blob
    const blob = await response.blob();

    // Devolvemos el blob directamente.
    // El navegador lo interpretará como un archivo para descargar/cachear.
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Length', blob.size.toString());
    
    return new NextResponse(blob, {
      status: 200,
      headers: headers,
    });

  } catch (error: any) {
    console.error('Error en el proxy de descarga:', error);
    return new Response(error.message || 'Error interno del servidor', { status: 500 });
  }
}
