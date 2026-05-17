import { type NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSafeInternalPath } from '@/lib/safe-redirect'
import { createClient } from '@/lib/supabase/server'

function getBaseUrl(request: NextRequest) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/$/, '')
  }

  const origin = request.nextUrl.origin
  if (origin.includes('0.0.0.0')) {
    return 'http://localhost:3000'
  }

  return origin
}

function buildRedirect(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, getBaseUrl(request)))
}

function buildLoginErrorRedirect(
  request: NextRequest,
  code: 'oauth_failed' | 'invalid_or_expired_link' | 'auth_callback_failed'
) {
  const url = new URL('/login', getBaseUrl(request))
  url.searchParams.set('error', code)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const oauthError = requestUrl.searchParams.get('error')
  const nextPath = getSafeInternalPath(requestUrl.searchParams.get('next'), '/courses')

  if (oauthError) {
    return buildLoginErrorRedirect(request, 'oauth_failed')
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return buildLoginErrorRedirect(request, 'auth_callback_failed')
    }

    return buildRedirect(request, nextPath)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (error) {
      return buildLoginErrorRedirect(request, 'invalid_or_expired_link')
    }

    if (type === 'recovery') {
      return buildRedirect(request, '/auth/update-password')
    }

    return buildRedirect(request, nextPath)
  }

  return buildLoginErrorRedirect(request, 'auth_callback_failed')
}
