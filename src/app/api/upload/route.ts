import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const B2_ENDPOINT = process.env.B2_ENDPOINT!;
const B2_REGION = B2_ENDPOINT.split('.')[1];
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME!;

const s3 = new S3Client({
  endpoint: `https://${B2_ENDPOINT}`,
  region: B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const songName = formData.get('songName') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se ha enviado ningún archivo.' }, { status: 400 });
    }
    if (!songName) {
        return NextResponse.json({ success: false, error: 'No se ha enviado el nombre de la canción.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const key = `${randomUUID()}-${file.name}`;

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

    // TODO: Guardar en Firestore la URL del archivo
    // const fileUrl = `https://<YOUR_B2_CUSTOM_DOMAIN_OR_ENDPOINT>/${key}`;
    // await db.collection('songs').add({ name: songName, url: fileUrl, ... });

    return NextResponse.json({ success: true, key });

  } catch (error) {
    console.error('Error subiendo el archivo a B2:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
