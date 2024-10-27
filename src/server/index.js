const express = require('express');
const cors = require('cors');
const { Server } = require('ssh2');
const { Client } = require('ssh2');

const app = express();
const port = process.env.PORT || 3001;

// Store SSH connections in memory (consider using Redis in production)
const connections = new Map();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// SSH Connect endpoint
app.post('/ssh/connect', async (req, res) => {
  const { host, username, password, port = 22 } = req.body;
  
  try {
    const conn = new Client();
    const connectionId = Date.now().toString();

    await new Promise((resolve, reject) => {
      conn.on('ready', () => {
        connections.set(connectionId, conn);
        resolve();
      }).on('error', (err) => {
        reject(err);
      }).connect({
        host,
        port,
        username,
        password,
        // Add more SSH options as needed
        readyTimeout: 5000,
        keepaliveInterval: 10000,
      });
    });

    res.json({
      success: true,
      connectionId,
      message: `Connected to ${host} as ${username}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute SSH Command endpoint
app.post('/ssh/execute', async (req, res) => {
  const { connectionId, command } = req.body;
  const conn = connections.get(connectionId);

  if (!conn) {
    return res.status(404).json({
      success: false,
      error: 'No active SSH connection found'
    });
  }

  try {
    const output = await new Promise((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) reject(err);

        let data = '';
        let errorData = '';

        stream.on('data', (chunk) => {
          data += chunk;
        });

        stream.stderr.on('data', (chunk) => {
          errorData += chunk;
        });

        stream.on('close', () => {
          resolve({ stdout: data, stderr: errorData });
        });
      });
    });

    res.json({
      success: true,
      output: output.stdout,
      error: output.stderr
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Disconnect SSH endpoint
app.post('/ssh/disconnect', async (req, res) => {
  const { connectionId } = req.body;
  const conn = connections.get(connectionId);

  if (conn) {
    conn.end();
    connections.delete(connectionId);
  }

  res.json({
    success: true,
    message: 'SSH connection closed successfully'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(port, () => {
  console.log(`SSH backend service running on port ${port}`);
});
