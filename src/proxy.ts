import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (path === '/') {
       if ((token.role as string)?.toLowerCase() === 'owner') {
          return NextResponse.redirect(new URL('/owner/dashboard', req.url));
       } else {
          return NextResponse.redirect(new URL('/manager/dashboard', req.url));
       }
    }

    if ((path.startsWith('/owner') || path.startsWith('/api/owner')) && (token.role as string)?.toLowerCase() !== 'owner') {
      return NextResponse.redirect(new URL('/login?error=AccessDenied', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/owner/:path*', '/manager/:path*', '/', '/api/owner/:path*', '/api/manager/:path*']
};
