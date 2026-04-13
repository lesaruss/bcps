import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { meeting_note_id } = await request.json()
    if (!meeting_note_id) return NextResponse.json({ error: 'meeting_note_id is required' }, { status: 400 })
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => { cookieStore.set(name, value, options) }) } } })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: meetingNote, error: fetchError } = await supabaseAdmin.from('meeting_notes').select('id, user_id').eq('id', meeting_note_id).single()
    if (fetchError || !meetingNote) return NextResponse.json({ error: 'Meeting note not found' }, { status: 404 })
    if (meetingNote.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'], line_items: [{ price_data: { currency: 'usd', product_data: { name: '5 Additional Revisions for BCPS Minutes', description: 'Additional revision tokens' }, unit_amount: 100 }, quantity: 1 }], success_url: `${origin}/notes/${meeting_note_id}?payment=success`, cancel_url: `${origin}/notes/${meeting_note_id}?payment=cancelled`, metadata: { meeting_note_id, user_id: user.id } })
    await supabaseAdmin.from('payments').insert({ meeting_note_id, user_id: user.id, stripe_session_id: session.id, amount: 100, currency: 'usd', status: 'pending' })
    return NextResponse.json({ success: true, checkout_url: session.url, session_id: session.id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
