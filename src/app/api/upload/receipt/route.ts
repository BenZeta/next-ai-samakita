import { getServerAuthSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const paymentId = formData.get('paymentId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
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
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Generate unique filename
    const uniqueFilename = `${session.user.id}/${paymentId}/${crypto.randomUUID()}.webp`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(uniqueFilename, processedImage, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);

      // Check if bucket doesn't exist
      if (error.message === 'Bucket not found') {
        throw new Error(
          'Storage bucket "receipts" not found. Please create it in the Supabase dashboard:\n' +
            '1. Go to Storage in your Supabase dashboard\n' +
            '2. Click "New Bucket"\n' +
            '3. Name it "receipts"\n' +
            '4. Enable "Public bucket" for anonymous access\n' +
            '5. Click "Create bucket"'
        );
      }

      throw new Error(error.message);
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('receipts').getPublicUrl(uniqueFilename);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
