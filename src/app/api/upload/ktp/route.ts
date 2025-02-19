import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert File to Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Create FormData for ImageKit
    const ikFormData = new FormData();
    ikFormData.append('file', base64);
    ikFormData.append('fileName', `${Date.now()}-${file.name}`);
    ikFormData.append('folder', '/ktp');

    // Upload to ImageKit using fetch
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY || '').toString('base64')}`,
      },
      body: ikFormData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload to ImageKit');
    }

    const result = await response.json();
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
