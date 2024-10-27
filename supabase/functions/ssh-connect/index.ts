import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/ssh2@1.0.0/mod.ts'

serve(async (req) => {
  try {
    const { host, username, password, port } = await req.json()
    
    const conn = new Client()
    
    // Create unique connection ID
    const connectionId = crypto.randomUUID()
    
    // Store connection in memory (you might want to use Redis in production)
    const connections = new Map()
    
    await new Promise((resolve, reject) => {
      conn.on('ready', () => {
        connections.set(connectionId, conn)
        resolve()
      }).on('error', (err) => {
        reject(err)
      }).connect({
        host,
        port,
        username,
        password
      })
    })

    return new Response(
      JSON.stringify({ connectionId }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
