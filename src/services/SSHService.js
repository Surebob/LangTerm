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
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        this.isConnected = false;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        // Add delay before reconnect
        setTimeout(() => this.connect(), 2000);
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
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket received:', data);
        
        const handler = this.messageHandlers.get(data.connectionId) || this.messageHandlers.get('temp');
        if (handler) {
          handler(data);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  async connectSSH(host, username, password, port = 22) {
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
        console.log('Sending SSH connection request...');
        this.ws.send(JSON.stringify({
          type: 'CONNECT',
          host,
          username,
          password,
          port
        }));

        const messageHandler = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'CONNECTED') {
            this.ws.removeEventListener('message', messageHandler);
            resolve(data);
          } else if (data.type === 'ERROR') {
            this.ws.removeEventListener('message', messageHandler);
            reject(new Error(data.error));
          }
        };

        this.ws.addEventListener('message', messageHandler);

        // Increase timeout to 30 seconds
        setTimeout(() => {
          this.ws.removeEventListener('message', messageHandler);
          reject(new Error('SSH connection timeout'));
        }, 30000);

      } catch (error) {
        console.error('Error in connectSSH:', error);
        reject(error);
      }
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
