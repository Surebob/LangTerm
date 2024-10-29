require('dotenv').config();
const WebSocket = require('ws');
const { Client } = require('ssh2');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

wss.on('connection', (ws) => {
  let sshClient = new Client();
  let sshStream;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'connect') {
      sshClient.on('ready', () => {
        console.log('SSH Client :: ready');

        sshClient.shell((err, stream) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
            sshClient.end();
            return;
          }

          sshStream = stream;

          // Forward data from SSH to WebSocket
          sshStream.on('data', (chunk) => {
            ws.send(JSON.stringify({ type: 'data', data: chunk.toString('utf-8') }));
          });

          // Handle SSH stream close
          sshStream.on('close', () => {
            sshClient.end();
            ws.close();
          });

          // Forward data from WebSocket to SSH
          ws.on('message', (msg) => {
            const input = JSON.parse(msg);
            if (input.type === 'command') {
              sshStream.write(input.command);
            }
          });
        });
      }).connect({
        host: data.host,
        port: data.port || 22,
        username: data.username,
        password: data.password, // Or use privateKey and passphrase
      });

      sshClient.on('error', (err) => {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      });
    }
  });

  ws.on('close', () => {
    if (sshClient) sshClient.end();
  });
});

console.log(`WebSocket server is running on port ${process.env.PORT || 8080}`); 