require('dotenv').config();
const WebSocket = require('ws');
const { Client } = require('ssh2');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  'https://yeblzgxbyytpcqiveojw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYmx6Z3hieXl0cGNxaXZlb2p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTU3MDg0MCwiZXhwIjoyMDQ1MTQ2ODQwfQ.TePx67cZaW9HnC-ge-1ht5n3kCzMKJcRwg3LIwKaSw8'
);

const wss = new WebSocket.Server({ 
  port: process.env.PORT || 8080,
  host: '127.0.0.1',
  verifyClient: async (info) => {
    try {
      // Check origin
      const origin = info.origin || info.req.headers.origin;
      if (!origin || !['https://langterm.ai', 'http://localhost:3000'].includes(origin)) {
        console.log('Connection rejected: Invalid origin:', origin);
        return false;
      }

      // Get JWT token from headers
      const authHeader = info.req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Connection rejected: No JWT token');
        return false;
      }

      const token = authHeader.split(' ')[1];
      
      // Verify JWT token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.log('Connection rejected: Invalid JWT token');
        return false;
      }

      // Store user info for later use
      info.req.user = user;
      return true;

    } catch (error) {
      console.error('Error verifying client:', error);
      return false;
    }
  }
});

// Store active connections
const connections = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data.type);

      switch (data.type) {
        case 'CONNECT':
          handleSSHConnection(ws, data);
          break;

        case 'COMMAND':
          handleCommand(ws, data);
          break;

        case 'DISCONNECT':
          handleDisconnect(ws, data);
          break;

        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Internal server error'
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up any active SSH connections for this WebSocket
    cleanupConnections(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    cleanupConnections(ws);
  });
});

function handleSSHConnection(ws, data) {
  const connectionId = uuidv4();
  const sshClient = new Client();

  // Access the payload fields correctly
  const { host, username, password, port } = data.payload || {};

  console.log('Connecting with SSH parameters:', {
    host,
    port: port || 22,
    username,
    password, // Masked for security
  });

  sshClient.on('ready', () => {
    console.log(`SSH Connection established (${connectionId})`);
    
    // Store the connection
    connections.set(connectionId, {
      client: sshClient,
      ws,
      stream: null
    });

    // Create interactive shell session
    sshClient.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        handleSSHError(ws, connectionId, err);
        return;
      }

      // Store the stream
      connections.get(connectionId).stream = stream;

      // Handle stream events
      stream.on('data', (data) => {
        ws.send(JSON.stringify({
          type: 'OUTPUT',
          connectionId,
          output: data.toString('utf8')
        }));
      });

      stream.on('close', () => {
        console.log(`Stream closed for connection ${connectionId}`);
        handleDisconnect(ws, { connectionId });
      });

      // Notify client of successful connection
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        connectionId,
        message: 'SSH connection established'
      }));
    });
  });

  sshClient.on('error', (err) => {
    handleSSHError(ws, connectionId, err);
  });

  // Attempt SSH connection
  try {
    sshClient.connect({
      host,
      port: port || 22,
      username,
      password,
      readyTimeout: 30000, // 30 seconds timeout
      keepaliveInterval: 10000, // Send keepalive every 10 seconds
    });
  } catch (error) {
    handleSSHError(ws, connectionId, error);
  }
}

function handleCommand(ws, data) {
  const connection = connections.get(data.connectionId);
  if (!connection || !connection.stream) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      error: 'No active connection found'
    }));
    return;
  }

  try {
    connection.stream.write(data.command + '\n');
  } catch (error) {
    console.error('Error sending command:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      error: 'Failed to send command'
    }));
  }
}

function handleDisconnect(ws, data) {
  const connection = connections.get(data.connectionId);
  if (connection) {
    if (connection.stream) {
      connection.stream.end('exit\n');
    }
    connection.client.end();
    connections.delete(data.connectionId);
    
    ws.send(JSON.stringify({
      type: 'DISCONNECTED',
      connectionId: data.connectionId,
      message: 'SSH connection closed'
    }));
  }
}

function handleSSHError(ws, connectionId, error) {
  console.error(`SSH Error (${connectionId}):`, error);
  ws.send(JSON.stringify({
    type: 'ERROR',
    connectionId,
    error: error.message || 'SSH connection failed'
  }));

  // Clean up the failed connection
  const connection = connections.get(connectionId);
  if (connection) {
    if (connection.stream) {
      connection.stream.end();
    }
    connection.client.end();
    connections.delete(connectionId);
  }
}

function cleanupConnections(ws) {
  // Find and cleanup all connections associated with this WebSocket
  for (const [connectionId, connection] of connections.entries()) {
    if (connection.ws === ws) {
      if (connection.stream) {
        connection.stream.end();
      }
      connection.client.end();
      connections.delete(connectionId);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Cleaning up...');
  wss.clients.forEach((client) => {
    client.close();
  });
  process.exit(0);
});

console.log(`WebSocket server is running on port ${process.env.PORT || 8080}`);