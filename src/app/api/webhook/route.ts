import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature')
    if (!signature) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    let event: Stripe.Event
    try { event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) }
    catch (error) { return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }) }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const metadata = session.metadata as any
      if (!metadata.meeting_note_id || !metadata.user_id) throw new Error('Missing required metadata')
      const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await supabaseAdmin.from('payments').update({ status: 'completed' }).eq('stripe_session_id', session.id)
      const { data: meetingNote } = await supabaseAdmin.from('meeting_notes').select('extra_revisions_purchased').eq('id', metadata.meeting_note_id).eq('user_id', metadata.user_id).single()
      if (!meetingNote) throw new Error('Meeting note not found')
      await supabaseAdmin.from('meeting_notes').update({ extra_revisions_purchased: (meetingNote.extra_revisions_purchased || 0) + 5 }).eq('id', metadata.meeting_note_id).eq('user_id', metadata.user_id)
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
