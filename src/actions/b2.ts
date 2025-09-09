'use server';

import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

export async function checkB2Connection() {
  try {
    const endpoint = process.env.B2_ENDPOINT!;
    // The region is the second part of the endpoint URL.
    // e.g. s3.us-east-005.backblazeb2.com -> us-east-005
    const region = endpoint.split('.')[1];

    const s3 = new S3Client({
      endpoint: `https://${endpoint}`,
      region: region,
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
