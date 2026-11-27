import type { NextResponse } from 'next/server';
export function githubCallbackResponse(internal: Response, adminCookieOptions: { name: string; httpOnly: boolean; sameSite: 'lax'; secure: boolean; path: string; maxAge: number }): NextResponse;
