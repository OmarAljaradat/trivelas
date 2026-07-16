import { api } from '../../core/api.js';

export async function fetchActivePlayers() {
  const players = await api.get('/players');
  return players.filter(p => p.category === 'objectives');
}

export async function submitObjectivesOrder(orderPayload) {
  return await api.post('/orders', orderPayload);
}
