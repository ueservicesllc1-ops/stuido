'use server';

import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

export async function checkB2Connection() {
  try {
    const s3 = new S3Client({
      endpoint: process.env.B2_ENDPOINT!,
      region: process.env.B2_ENDPOINT!.split('.')[1], // e.g. us-east-005
      credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APPLICATION_KEY!,
      },
    });

    await s3.send(new ListBucketsCommand({}));
    
    return { success: true };
  } catch (error) {
    console.error('Backblaze B2 connection error:', error);
    return { success: false, error: (error as Error).message };
  }
}
