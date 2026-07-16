import { api } from './api.js';

class AuthService {
  constructor() {
    this.tokenKey = 'trivela_token';
  }

  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    window.location.href = 'login.html';
  }

  async login(loginField, password) {
    const data = await api.post('/auth/login', { loginField, password });
    if (data.success && data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async register(name, phone, email, password) {
    const data = await api.post('/auth/register', { name, phone, email, password });
    if (data.success && data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async getMe() {
    if (!this.getToken()) return null;
    try {
      return await api.get('/auth/me');
    } catch (err) {
      console.warn("Session expired or invalid token:", err);
      this.logout();
      return null;
    }
  }

  async getPublicSettings() {
    try {
      const data = await api.get('/public/content');
      return data || null;
    } catch (err) {
      console.error("Could not fetch public settings:", err);
      return null;
    }
  }
}

export const auth = new AuthService();
