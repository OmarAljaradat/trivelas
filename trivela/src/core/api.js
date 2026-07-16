import { API_BASE } from './config.js';

class ApiClient {
  constructor() {
    this.tokenKey = 'trivela_token';
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      // The current server routes accept authorization headers in different forms
      // Some scripts send Bearer, some send it directly as base64 token. Let's inspect the server check:
      // server.js authenticateToken splits ' ' and gets index 1: authHeader && authHeader.split(' ')[1]
      // That means it expects "Bearer <token>" style header! Let's send "Bearer <token>"
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, method = 'GET', body = null) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const options = {
      method,
      headers: this.getHeaders()
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // If status is 503 Service Unavailable, it might be Maintenance Mode
        if (response.status === 503) {
          const errData = await response.json().catch(() => ({}));
          throw { status: 503, message: errData.error || "الموقع في وضع الصيانة حالياً" };
        }
        const errText = await response.text();
        let errMsg = `Request failed with status ${response.status}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) errMsg = parsed.error;
        } catch (_) {}
        throw new Error(errMsg);
      }
      return await response.json();
    } catch (error) {
      console.error(`API Error on ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  get(endpoint) {
    return this.request(endpoint, 'GET');
  }

  post(endpoint, body) {
    return this.request(endpoint, 'POST', body);
  }

  put(endpoint, body = null) {
    return this.request(endpoint, 'PUT', body);
  }

  delete(endpoint, body = null) {
    return this.request(endpoint, 'DELETE', body);
  }
}

export const api = new ApiClient();
