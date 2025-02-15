import { getServerAuthSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a new Supabase client with the service role key for admin access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process image with sharp
    const processedImage = await sharp(buffer)
      .resize(1920, 1080, {
        // Resize to max dimensions while maintaining aspect ratio
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 }) // Convert to WebP for better compression
      .toBuffer();

    // Generate unique filename with user ID prefix for better organization
    const uniqueFilename = `${session.user.id}/${crypto.randomUUID()}.webp`;
    const filePath = uniqueFilename;

    console.log('Uploading to Supabase Storage...');
    console.log('Bucket: properties');
    console.log('File path:', filePath);
    console.log('User ID:', session.user.id);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('properties')
      .upload(filePath, processedImage, {
        contentType: 'image/webp',
        cacheControl: '31536000', // Cache for 1 year
        upsert: true, // Allow overwriting files
      });

    if (error) {
      console.error('Supabase storage error:', {
        message: error.message,
        name: error.name,
        cause: error.cause,
      });
      return NextResponse.json(
        { error: 'Failed to upload image', details: error.message },
        { status: 500 }
      );
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('properties').getPublicUrl(filePath);

    console.log('Upload successful!');
    console.log('Public URL:', publicUrl);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Error in property image upload API:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
