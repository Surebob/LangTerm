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
        
        const handler = this.messageHandlers.get(data.connectionId) || this.messageHandlers.get('temp');
        if (handler) {
          handler(data);
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
          const match = command.match(/ssh\s+([a-zA-Z0-9_-]+)@([a-zA-Z0-9.-]+)(?:\s+-p\s+(\d+))?/);
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
              port: commandPort || port
            }
          }));
        } else {
          console.error('Command not in SSH format:', command);
          reject(new Error('Invalid SSH command format'));
          return;
        }

        const messageHandler = (data) => {
          console.log('Received SSH response:', data);
          let initialOutput = '';
          let prompt = '';
          
          if (data.type === 'CONNECTED') {
            // Initial connection successful, but wait for output
            console.log('SSH Connection established');
          } else if (data.type === 'OUTPUT') {
            // Check if this contains a prompt (ANSI sequence)
            if (data.output.includes('\x1B[?2004h')) {
              console.log('Received prompt:', data.output);
              // This is our prompt
              prompt = data.output;
              
              // Resolve with both initial output and prompt
              resolve({
                success: true,
                connectionId: data.connectionId,
                initialOutput: initialOutput, // Any welcome message received
                prompt: prompt, // The shell prompt
                host: data.host,
                username: data.username
              });
            } else {
              // Accumulate other output as initial message
              initialOutput += data.output;
              console.log('Received output:', data.output);
            }
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

  async executeCommand(connectionId, command) {
    if (!this.isConnected || !this.ws) {
      return {
        success: false,
        error: 'WebSocket not connected'
      };
    }

    return new Promise((resolve) => {
      let output = '';
      let timeout;

      // Set up continuous data callback
      this.messageHandlers.set(connectionId, (data) => {
        if (data.type === 'OUTPUT') {
          output += data.output;
        }

        // Clear existing timeout and set a new one
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.messageHandlers.delete(connectionId);
          resolve({
            success: true,
            output,
            isHtml: true
          });
        }, 100); // Wait 100ms after last output before resolving
      });

      this.ws.send(JSON.stringify({
        type: 'COMMAND',
        connectionId,
        command
      }));
    });
  }

  async disconnect(connectionId) {
    this.initialize(); // Initialize connection if needed
    if (!this.isConnected) {
      return {
        success: false,
        error: 'WebSocket not connected'
      };
    }

    return new Promise((resolve) => {
      const messageHandler = (data) => {
        if (data.type === 'DISCONNECTED') {
          this.messageHandlers.delete(connectionId);
          resolve({
            success: true,
            message: data.message
          });
        }
      };

      this.messageHandlers.set(connectionId, messageHandler);
      
      this.ws.send(JSON.stringify({
        type: 'DISCONNECT',
        connectionId
      }));
    });
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

