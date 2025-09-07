// app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin client (server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // You need to add this to your .env.local
);

export async function POST(request: Request) {
  const body = await request.text();
  
  // For Stripe Payment Links, we need to handle the checkout.session.completed event
  // Note: In production, you should verify the webhook signature
  
  try {
    const event = JSON.parse(body);
    
    // Handle the event based on type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Get the candle ID from client_reference_id
        const candleId = session.client_reference_id;
        
        if (candleId) {
          // Update the candle as paid
          const { error } = await supabaseAdmin
            .from('candle_offerings')
            .update({
              payment_status: 'paid',
              stripe_payment_id: session.payment_intent || session.id,
              stripe_session_id: session.id
            })
            .eq('id', candleId);
          
          if (error) {
            console.error('Error updating candle payment status:', error);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
          }
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}

// Stripe requires raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
