import { NextResponse } from 'next/server.js';
import { customerSessionIssued } from './github-signin.mjs';

// Initialize NextResponse with all auth cookies before touching its cookie store.
// Mixing headers.append(Set-Cookie) with response.cookies.set after construction
// replaces the auth cookies with the admin-cookie deletion.
export function githubCallbackResponse(internal, adminCookieOptions) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  const location = internal.headers.get('location');
  if (location) headers.set('location', location);
  let customerSession = false;
  for (const cookie of internal.headers.getSetCookie()) {
    headers.append('set-cookie', cookie);
    if (customerSessionIssued(cookie)) customerSession = true;
  }
  const response = new NextResponse(null, { status: internal.status || 302, headers });
  if (customerSession) response.cookies.set({ ...adminCookieOptions, value: '', maxAge: 0 });
  return response;
}
