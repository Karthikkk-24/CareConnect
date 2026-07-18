import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot-password');
  const isOnboarding = path.startsWith('/onboarding');
  const isInvite = path.startsWith('/invite');
  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/staff') ||
    path.startsWith('/patients') ||
    path.startsWith('/appointments') ||
    path.startsWith('/settings') ||
    path.startsWith('/admissions') ||
    path.startsWith('/wards') ||
    path.startsWith('/doctor') ||
    path.startsWith('/nurse') ||
    path.startsWith('/lab') ||
    path.startsWith('/follow-ups') ||
    path.startsWith('/pharmacy') ||
    path.startsWith('/finance') ||
    path.startsWith('/portal') ||
    path.startsWith('/reports') ||
    isOnboarding;

  if (!user && isProtectedRoute && !isInvite) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
