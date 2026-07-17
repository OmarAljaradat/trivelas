import { api } from '../../core/api.js';

class AdminService {
  // Stats
  async getQuickStats(days = null, startDate = null, endDate = null) {
    let url = '/admin/stats';
    const params = [];
    if (days) params.push(`days=${days}`);
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return await api.get(url);
  }

  async resetStoreData(type, password = '') {
    return await api.post('/admin/reset', { type, password });
  }

  // Settings & Maintenance
  async getStoreSettings() {
    return await api.get('/admin/settings');
  }

  async saveStoreSettings(settings) {
    return await api.post('/admin/settings', settings);
  }

  async saveStoreContent(content) {
    return await api.post('/admin/content', content);
  }

  async getExpenses() {
    return await api.get('/admin/expenses');
  }

  async addExpense(expense) {
    return await api.post('/admin/expenses', expense);
  }

  async deleteExpense(id) {
    return await api.delete(`/admin/expenses/${id}`);
  }

  // Logs
  async getAdminLogs() {
    return await api.get('/admin/logs');
  }

  // Orders
  async getOrdersList() {
    return await api.get('/admin/orders');
  }

  async updateOrderStatus(orderId, status, extraData = {}) {
    return await api.put(`/admin/orders/${orderId}/status`, { status, ...extraData });
  }

  async updateOrderDetails(orderId, details) {
    return await api.post(`/admin/orders/${orderId}/update-details`, details);
  }

  async completeOrder(orderId, costPrice) {
    return await api.post(`/admin/orders/${orderId}/complete`, { costPrice });
  }

  async deleteOrder(orderId) {
    return await api.delete(`/admin/orders/${orderId}`);
  }

  // Active Players (SBC / Objectives)
  async getActivePlayers() {
    return await api.get('/players');
  }

  async deletePlayer(id) {
    return await api.delete(`/admin/players/${id}`);
  }

  async savePlayer(playerData) {
    return await api.post('/admin/players', playerData);
  }

  // Scraper API
  async scrapeFutggLink(url, category, sbcSubCategory) {
    return await api.post('/admin/scrape', { url, category, sbcSubCategory });
  }

  // Users
  async getAllUsers() {
    return await api.get('/admin/users');
  }

  async modifyUserPoints(userId, points, reason) {
    return await api.post(`/admin/users/${userId}/points`, { points, reason });
  }

  async resetUserPassword(userId, newPassword) {
    return await api.post(`/admin/users/${userId}/reset-password`, { newPassword });
  }

  // FAQs
  async getFAQs() {
    return await api.get('/public/content').then(data => data.faqs || []);
  }

  async saveFAQ(faqData) {
    return await api.post('/admin/faqs', faqData);
  }

  async deleteFAQ(id) {
    return await api.delete(`/admin/faqs/${id}`);
  }

  // Reviews
  async getReviews() {
    return await api.get('/admin/reviews').then(data => data.reviews || []);
  }

  async saveReview(reviewData) {
    return await api.post('/admin/reviews', reviewData);
  }

  async deleteReview(id) {
    return await api.delete(`/admin/reviews/${id}`);
  }

  // Champions Ranks Settings
  async saveChampionsRanks(ranks) {
    return await api.request('/admin/champions-ranks', 'PUT', ranks);
  }

  // Rivals Ranks Settings
  async saveRivalsRanks(ranks) {
    return await api.request('/admin/rivals-ranks', 'PUT', ranks);
  }

  // Coupons Settings
  async getCoupons() {
    return await api.get('/admin/coupons');
  }

  async saveCoupon(couponData) {
    return await api.post('/admin/coupons', couponData);
  }

  async deleteCoupon(code) {
    return await api.delete(`/admin/coupons/${code}`);
  }

  // Features Settings
  async saveFeatures(features) {
    return await api.post('/admin/features', features);
  }
}

export const adminService = new AdminService();
