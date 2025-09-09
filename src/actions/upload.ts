'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

export async function getSignedUploadUrl(fileName: string, fileType: string) {
  try {
    // We can add metadata to the object.
    // Here we're adding the original filename.
    const Key = `${randomUUID()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key,
      ContentType: fileType,
      Metadata: {
        'original-filename': fileName,
      },
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL expires in 1 hour

    return { success: true, url: signedUrl, key: Key };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return { success: false, error: (error as Error).message };
  }
}
