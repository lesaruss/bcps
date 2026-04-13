import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth provider errors (e.g., user denied access)
  if (error) {
    const message = errorDescription || error || 'Authentication failed';
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('auth_error', message);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kopkfgwrodnofuceufdd.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    );

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        throw exchangeError;
      }
    } catch (error) {
      console.error('Error exchanging code for session:', error);
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set(
        'auth_error',
        'Sign-in failed. Please try again. If the problem persists, contact support.'
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Successfully authenticated redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // No code and no error redirect to home
  const redirectUrl = new URL('/', request.url);
  redirectUrl.searchParams.set('auth_error', 'Authentication was cancelled or failed. Please try again.');
  return NextResponse.redirect(redirectUrl);
}
