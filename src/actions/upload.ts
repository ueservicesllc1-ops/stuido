'use server';

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.B2_REGION,
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
