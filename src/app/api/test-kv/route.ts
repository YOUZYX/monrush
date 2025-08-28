import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    // Test KV connection
    await kv.set('test-key', 'MonadRush KV Test', { ex: 60 }); // Expires in 60 seconds
    const value = await kv.get('test-key');
    
    return NextResponse.json({
      success: true,
      message: 'Vercel KV is working!',
      testValue: value,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('KV Test Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'KV connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Cleanup test key
    await kv.del('test-key');
    return NextResponse.json({ success: true, message: 'Test key deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
