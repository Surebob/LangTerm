// SSHService.js
class SSHService {
  constructor() {
    this.connections = new Map();
    this.ws = null;
    this.messageHandlers = new Map();
    this.isConnected = false;
    this.pingInterval = null;
  }

  initialize() {
    if (typeof window === 'undefined') return;
    if (this.ws) return;

    const isProd = window.location.hostname === 'langterm.ai';
    this.baseUrl = isProd
      ? `wss://${window.location.hostname}/ws`
      : 'ws://localhost:3001';

    this.connect();
  }

  connect() {
    try {
      if (typeof window === 'undefined') return;

      console.log('Attempting WebSocket connection to:', this.baseUrl);
      this.ws = new WebSocket(this.baseUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnected = true;

        // Set up ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket received:', data);
        
        const handler = this.messageHandlers.get(data.connectionId) || this.messageHandlers.get('temp');
        if (handler) {
          handler(data);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        this.isConnected = false;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        setTimeout(() => this.connect(), 1000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', {
          message: error.message,
          type: error.type,
          error: error.error,
          target: {
            url: error.target?.url,
            readyState: error.target?.readyState,
            protocol: error.target?.protocol
          }
        });
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  async connectSSH(host, username, password, port = 22) {
    this.initialize(); // Initialize connection if needed
    if (!this.isConnected) {
      return {
        success: false,
        error: 'WebSocket not connected. Please try again.'
      };
    }

    return new Promise((resolve) => {
      let welcomeMessage = '';
      let connectionId = null;
      let connectedMessage = '';
      let hasResolved = false;

      const messageHandler = (data) => {
        console.log('SSH Connection Handler received:', data);

        // Store the connectionId when we get it
        if (data.type === 'CONNECTED') {
          console.log('Received CONNECTED message');
          connectedMessage = data.message;
          connectionId = data.connectionId;

          // Reassign the handler to use connectionId as key
          this.messageHandlers.set(connectionId, messageHandler);
          this.messageHandlers.delete('temp');
        }

        if (data.type === 'OUTPUT' && data.connectionId === connectionId) {
          console.log('Received OUTPUT message');
          welcomeMessage += data.output;
        }

        // Check if we have both messages and haven't resolved yet
        if (connectedMessage && welcomeMessage && !hasResolved) {
          console.log('Both messages received, resolving');
          hasResolved = true;
          this.messageHandlers.delete(connectionId);
          resolve({
            success: true,
            connectionId: connectionId,
            message: connectedMessage,
            output: welcomeMessage
          });
        }
      };

      // Use a temporary handler keyed by 'temp' until we get the connectionId
      this.messageHandlers.set('temp', messageHandler);
      
      console.log('Initiating SSH connection:', { host, username });
      this.ws.send(JSON.stringify({
        type: 'CONNECT',
        host,
        username,
        password,
        port
      }));

      // Set timeout for the entire connection
      setTimeout(() => {
        if (!hasResolved) {
          console.log('Connection timeout');
          this.messageHandlers.delete('temp');
          if (connectionId) {
            this.messageHandlers.delete(connectionId);
          }
          resolve({
            success: false,
            error: 'Connection timeout. Please try again.'
          });
        }
      }, 10000);
    });
  }

  async executeCommand(connectionId, command) {
    this.initialize(); // Initialize connection if needed
    if (!this.isConnected) {
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
        }, 500); // Wait 500ms after last output before resolving
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

// Initialize WebSocket when the service is imported
if (typeof window !== 'undefined') {
  // Wait for the DOM to be ready
  if (document.readyState === 'complete') {
    sshService.initialize();
  } else {
    window.addEventListener('load', () => {
      sshService.initialize();
    });
  }
}
