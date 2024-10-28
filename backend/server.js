const express = require('express');
const cors = require('cors');
const { Client } = require('ssh2');
const WebSocket = require('ws');
const http = require('http');
const Convert = require('ansi-to-html');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Use Digital Ocean's PORT env variable or fallback to 3001 for local dev
const port = process.env.PORT || 3001;

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Initialize ANSI converter
const convert = new Convert({
  fg: '#FFF',
  bg: '#000',
  newline: true,
  escapeXML: true,
  stream: true
});

// Store SSH connections and their shells
const connections = new Map();
const shells = new Map();
const wsConnections = new Map();

app.use(cors());
app.use(express.json());

// WebSocket connection handler
wss.on('connection', (ws) => {
  const wsId = Date.now().toString();
  wsConnections.set(wsId, ws);

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    const { type, connectionId, command } = data;

    switch (type) {
      case 'CONNECT':
        handleSSHConnect(ws, data);
        break;
      case 'COMMAND':
        handleSSHCommand(ws, connectionId, command);
        break;
      case 'DISCONNECT':
        handleSSHDisconnect(ws, connectionId);
        break;
    }
  });

  ws.on('close', () => {
    wsConnections.delete(wsId);
  });
});

async function handleSSHConnect(ws, data) {
  const { host, username, password, port = 22 } = data;
  try {
    const conn = new Client();
    const connectionId = Date.now().toString();

    conn.on('ready', () => {
      conn.shell({
        term: 'xterm-256color',
        rows: 30,
        cols: 80,
      }, (err, stream) => {
        if (err) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: err.message
          }));
          return;
        }

        connections.set(connectionId, conn);
        shells.set(connectionId, stream);

        let initialOutput = '';
        let initialTimeout;

        // Handle initial shell data
        const initialDataHandler = (data) => {
          initialOutput += data.toString();
          
          // Clear existing timeout
          if (initialTimeout) clearTimeout(initialTimeout);
          
          // Set new timeout to wait for complete initial output
          initialTimeout = setTimeout(() => {
            stream.removeListener('data', initialDataHandler);
            
            // Send initial welcome message
            if (initialOutput.trim()) {
              ws.send(JSON.stringify({
                type: 'OUTPUT',
                connectionId,
                output: convert.toHtml(initialOutput),
                isHtml: true
              }));
            }
            
            // Set up regular data handler
            stream.on('data', (data) => {
              const output = data.toString();
              if (output.trim()) {
                ws.send(JSON.stringify({
                  type: 'OUTPUT',
                  connectionId,
                  output: convert.toHtml(output),
                  isHtml: true
                }));
              }
            });
          }, 500); // Wait 500ms for complete initial output
        };

        stream.on('data', initialDataHandler);

        stream.stderr.on('data', (data) => {
          const errorOutput = convert.toHtml(data.toString());
          ws.send(JSON.stringify({
            type: 'OUTPUT',
            connectionId,
            output: errorOutput,
            isHtml: true
          }));
        });

        stream.on('close', () => {
          handleSSHDisconnect(ws, connectionId);
        });

        // Send connection success message
        ws.send(JSON.stringify({
          type: 'CONNECTED',
          connectionId,
          message: `Connected to ${host} as ${username}`
        }));
      });
    });

    conn.connect({
      host,
      port,
      username,
      password,
      readyTimeout: 5000,
      keepaliveInterval: 10000,
    });

  } catch (error) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      error: error.message
    }));
  }
}

function handleSSHCommand(ws, connectionId, command) {
  const shell = shells.get(connectionId);
  if (!shell) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      error: 'No active SSH connection found'
    }));
    return;
  }

  // Send the command
  shell.write(`${command}\n`);
}

function handleSSHDisconnect(ws, connectionId) {
  const conn = connections.get(connectionId);
  const shell = shells.get(connectionId);

  if (shell) {
    shell.end('exit\n');
    shells.delete(connectionId);
  }

  if (conn) {
    conn.end();
    connections.delete(connectionId);
  }

  ws.send(JSON.stringify({
    type: 'DISCONNECTED',
    connectionId,
    message: 'SSH connection closed'
  }));
}

server.listen(port, '0.0.0.0', () => {  // Listen on all network interfaces
  console.log(`SSH backend service running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Server address: ${server.address().address}:${server.address().port}`);
});
