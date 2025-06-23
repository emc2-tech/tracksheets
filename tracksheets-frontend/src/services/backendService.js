// CREATE this file: src/services/backendService.js

class BackendService {
  constructor() {
    this.backendUrl = null;
    this.discoveryInProgress = false;
    this.commonPorts = [5000, 5001, 5002, 5003, 5004]; // Ports to try
  }

  async discoverBackend() {
    if (this.discoveryInProgress) {
      console.log('🔍 Backend discovery already in progress...');
      return this.backendUrl;
    }

    if (this.backendUrl) {
      // Test if current URL still works
      try {
        const response = await fetch(`${this.backendUrl}/api/config`, { 
          method: 'GET'
        });
        if (response.ok) {
          console.log('✅ Backend still available at:', this.backendUrl);
          return this.backendUrl;
        }
      } catch (error) {
        console.log('⚠️ Cached backend URL no longer working, rediscovering...');
        this.backendUrl = null;
      }
    }

    this.discoveryInProgress = true;
    console.log('🔍 Discovering backend...');

    try {
      // Method 1: Try to read backend config file
      try {
        const configResponse = await fetch('/backend-config.json');
        if (configResponse.ok) {
          const config = await configResponse.json();
          console.log('📝 Found backend config file:', config);
          
          // Test the URL from config
          const testResponse = await fetch(`${config.backend_url}/api/config`);
          if (testResponse.ok) {
            this.backendUrl = config.backend_url;
            console.log('✅ Backend discovered via config file:', this.backendUrl);
            return this.backendUrl;
          }
        }
      } catch (error) {
        console.log('📝 No backend config file found, trying port discovery...');
      }

      // Method 2: Try common ports
      for (const port of this.commonPorts) {
        const testUrl = `http://localhost:${port}`;
        try {
          console.log(`🔍 Trying port ${port}...`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
          
          const response = await fetch(`${testUrl}/api/config`, {
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const config = await response.json();
            this.backendUrl = testUrl;
            console.log(`✅ Backend discovered on port ${port}:`, config);
            return this.backendUrl;
          }
        } catch (error) {
          console.log(`❌ Port ${port} not available`);
          continue;
        }
      }

      throw new Error('Backend not found on any common ports');

    } finally {
      this.discoveryInProgress = false;
    }
  }

  async makeRequest(endpoint, options = {}) {
    // Ensure we have a backend URL
    if (!this.backendUrl) {
      await this.discoverBackend();
    }

    if (!this.backendUrl) {
      throw new Error('Backend not available. Make sure the Python backend is running.');
    }

    const url = `${this.backendUrl}${endpoint}`;
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      console.log(`📥 Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`❌ API Request failed: ${error.message}`);
      
      // If request failed, backend might have restarted on different port
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log('🔄 Backend might have restarted, rediscovering...');
        this.backendUrl = null;
        
        // Retry once with rediscovery
        try {
          await this.discoverBackend();
          if (this.backendUrl) {
            const retryUrl = `${this.backendUrl}${endpoint}`;
            const retryResponse = await fetch(retryUrl, {
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              },
              ...options
            });
            return await retryResponse.json();
          }
        } catch (retryError) {
          console.error('❌ Retry after rediscovery also failed:', retryError);
        }
      }
      
      throw error;
    }
  }

  // Convenience methods for common operations
  async get(endpoint) {
    return this.makeRequest(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.makeRequest(endpoint, { method: 'DELETE' });
  }

  // Get current backend URL (for debugging)
  getCurrentBackendUrl() {
    return this.backendUrl;
  }

  // Force rediscovery (useful for debugging)
  async forceRediscover() {
    this.backendUrl = null;
    return await this.discoverBackend();
  }
}

// Create and export singleton instance
const backendService = new BackendService();
export default backendService;

