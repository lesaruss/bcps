import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes('marcomm')) {
    try {
      const filePath = join(process.cwd(), 'public/console/marcomm.html');
      const content = readFileSync(filePath, 'utf-8');

      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('Error reading marcomm.html:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
