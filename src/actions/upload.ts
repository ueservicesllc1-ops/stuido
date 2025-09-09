'use server';

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getRegionFromEndpoint(endpoint: string | undefined): string {
  if (!endpoint) {
    console.error("B2_ENDPOINT no está definido en las variables de entorno.");
    throw new Error("La configuración del endpoint de B2 está incompleta.");
  }
  try {
    const url = new URL(endpoint);
    // e.g. s3.us-east-005.backblazeb2.com -> us-east-005
    const region = url.hostname.split('.')[1];
    if (!region) {
      throw new Error('No se pudo determinar la región desde el endpoint');
    }
    return region;
  } catch (error) {
    console.error("URL de B2_ENDPOINT inválida:", error);
    throw new Error("La URL del endpoint de B2 proporcionada no es válida.");
  }
}

const s3Client = new S3Client({
  region: getRegionFromEndpoint(process.env.B2_ENDPOINT),
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  forcePathStyle: true,
});

export async function uploadFileToB2(file: File) {
  const fileBuffer = await file.arrayBuffer();
  const fileName = `${Date.now()}-${file.name}`;

  const params = {
    Bucket: process.env.B2_BUCKET_NAME,
    Key: fileName,
    Body: Buffer.from(fileBuffer),
    ContentType: file.type,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    const fileUrl = `${process.env.B2_PUBLIC_URL}/${fileName}`;
    
    return { success: true, url: fileUrl, fileKey: fileName };
  } catch (error) {
    console.error("Error subiendo a B2:", error);
    return { success: false, error: (error as Error).message };
  }
}
