// SSHService.js

import { supabase } from '../lib/supabaseClient';

class SSHService {
  constructor() {
    this.connections = new Map();
    this.ws = null;
    this.messageHandlers = new Map();
    this.isConnected = false;
    this.pingInterval = null;
    this.reconnectInterval = 2000;  // Reconnection delay in milliseconds
  }

  async initialize() {
    if (typeof window === 'undefined') return;
    if (this.ws && this.isConnected) return;

    const isProd = window.location.hostname === 'langterm.ai';
    this.baseUrl = isProd
      ? 'wss://backend.langterm.ai/ws'
      : 'ws://localhost:8080';

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${session.access_token}`
    };

    this.connect(headers);
  }

  connect(headers = {}) {
    try {
      if (typeof window === 'undefined') return;

      console.log('Attempting WebSocket connection to:', this.baseUrl);
      this.ws = new WebSocket(this.baseUrl, [], { headers });

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnected = true;
        if (this.pingInterval) clearInterval(this.pingInterval); // Clear any existing ping interval
      };

      this.ws.onclose = async () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        this.isConnected = false;
        if (this.pingInterval) clearInterval(this.pingInterval);

        // Check if session is still active before reconnecting
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setTimeout(() => this.connect(headers), this.reconnectInterval);
        } else {
          console.log('Session expired, not reconnecting.');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        console.log('WebSocket received message:', data); // Log received messages

        let handler = this.messageHandlers.get(data.connectionId);

        if (!handler && this.messageHandlers.has('temp')) {
          handler = this.messageHandlers.get('temp');
        }

        if (handler) {
          handler(data);
        } else {
          console.warn('No handler found for message:', data);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  async connectSSH(command, password, port = 22) {
    if (!this.isConnected || !this.ws) {
      console.log('WebSocket not connected, attempting to reconnect...');
      await new Promise((resolve) => {
        this.initialize();
        const checkConnection = setInterval(() => {
          if (this.isConnected) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }

    return new Promise((resolve, reject) => {
      try {
        // Parse the SSH command to extract username and host
        console.log('Attempting to parse SSH command:', command);

        if (typeof command === 'string' && command.startsWith('ssh ')) {
          const match = command.match(/ssh\s+([^\s@]+)@([^\s]+)(?:\s+-p\s+(\d+))?/);
          if (!match) {
            console.error('Invalid SSH command format:', command);
            reject(new Error('Invalid SSH command format'));
            return;
          }

          const [, username, host, commandPort] = match;
          console.log('Parsed SSH command:', { username, host, port: commandPort || port });

          this.ws.send(JSON.stringify({
            type: 'CONNECT',
            payload: {
              host,
              username,
              password,
              port: commandPort ? parseInt(commandPort, 10) : port
            }
          }));
        } else {
          console.error('Command not in SSH format:', command);
          reject(new Error('Invalid SSH command format'));
          return;
        }

        const messageHandler = (data) => {
          if (data.type === 'CONNECTED') {
            console.log('SSH Connection established');
            this.messageHandlers.delete('temp');

            // Update the handler with the new connectionId
            this.messageHandlers.set(data.connectionId, messageHandler);

            // Resolve immediately after connection
            resolve({
              success: true,
              connectionId: data.connectionId
            });
          } else if (data.type === 'ERROR') {
            this.messageHandlers.delete('temp');
            resolve({
              success: false,
              error: data.error
            });
          }
        };

        this.messageHandlers.set('temp', messageHandler);

        setTimeout(() => {
          this.messageHandlers.delete('temp');
          reject(new Error('SSH connection timeout'));
        }, 30000);

      } catch (error) {
        console.error('Error in connectSSH:', error);
        reject(error);
      }
    });
  }

  // Method to send data to the SSH session
  async sendData(connectionId, data) {
    if (!this.isConnected || !this.ws) {
      console.log('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'DATA',
      connectionId,
      data
    }));
  }

  // Method to register a handler for incoming data
  onData(connectionId, handler) {
    this.messageHandlers.set(connectionId, handler);
  }

  async disconnect(connectionId) {
    if (!this.isConnected || !this.ws) {
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'DISCONNECT',
      connectionId
    }));

    this.messageHandlers.delete(connectionId);
  }

  // Clean up method
  cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const sshService = new SSHService();
