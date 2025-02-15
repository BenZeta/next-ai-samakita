import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // TODO: Implement receipt upload
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 });
  }
}
