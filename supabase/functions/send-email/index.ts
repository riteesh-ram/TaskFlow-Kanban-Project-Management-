import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const SENDGRID_FROM = Deno.env.get('SENDGRID_FROM')

console.log("Function 'send-email' up and running!")

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // 2. Parse data (Updated to include 'html')
    const { to, subject, text, html } = await req.json()

    if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
      throw new Error("Missing SendGrid secrets")
    }

    // 3. Prepare the email content
    // We send BOTH text and HTML. Email clients that support HTML show the pretty version.
    // Clients that don't (like Apple Watch sometimes) show the text version.
    const content = [
      { type: 'text/plain', value: text }
    ]

    // Only add HTML if the frontend sent it
    if (html) {
      content.push({ type: 'text/html', value: html })
    }

    // 4. Send to SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: SENDGRID_FROM },
        subject: subject,
        content: content,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("SendGrid Error:", errorText)
      return new Response(JSON.stringify({ error: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ message: "Email sent successfully!" }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error("Function Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})