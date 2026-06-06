import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes: '/', '/settings'
  // Exclude: '/api', '/_next', '/favicon.ico', '/public'
  const isProtectedRoute = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/settings');
  const isStaticResource = request.nextUrl.pathname.startsWith('/_next') || 
                           request.nextUrl.pathname.startsWith('/api') ||
                           request.nextUrl.pathname.includes('.');

  // If session is null and it's a protected route, we don't necessarily redirect to a login page
  // because we use a Modal. But for /settings, we might want to redirect to / with a query param
  if (!session && isProtectedRoute && !isStaticResource) {
    if (request.nextUrl.pathname.startsWith('/settings')) {
        return NextResponse.redirect(new URL('/?auth=required', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
