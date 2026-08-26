import { api } from '../../core/api.js';


export const MOCK_COUPONS = {
  'TRIVELA': 10,
  'EA27': 15,
  'VIP5': 5
};

export function getDiscount(coins, discounts) {
  if (!discounts || !Array.isArray(discounts)) {
    const fallback = [
      { minCoins: 10000000, percent: 20 },
      { minCoins: 5000000, percent: 10 },
      { minCoins: 1000000, percent: 0 },
      { minCoins: 500000, percent: -5 },
      { minCoins: 100000, percent: -10 }
    ];
    for (const tier of fallback) {
      if (coins >= tier.minCoins) return tier.percent;
    }
    return 0;
  }
  
  const sorted = [...discounts].sort((a, b) => b.minCoins - a.minCoins);
  for (const tier of sorted) {
    if (coins >= tier.minCoins) return tier.percent;
  }
  return 0;
}

export function calculatePrice(coins, platform, currency, rateConsole, ratePC, currencyRates, discounts) {
  const cRate = (typeof rateConsole === 'number' && !isNaN(rateConsole)) ? rateConsole : (parseFloat(rateConsole) || 2.80);
  const pRate = (typeof ratePC === 'number' && !isNaN(ratePC)) ? ratePC : (parseFloat(ratePC) || 2.40);
  const isPC = typeof platform === 'string' && platform.toLowerCase() === 'pc';
  const rateUSD = isPC ? pRate : cRate;
  const numCoins = parseInt(coins, 10) || 1000000;
  const baseUSD = (numCoins / 100_000) * rateUSD;
  const discPct = getDiscount(numCoins, discounts);
  const finalUSD = baseUSD * (1 - discPct / 100);
  
  const cur = (currencyRates && currencyRates[currency]) ? currencyRates[currency] : { rate: 3.75, symbol: 'ر.س', dec: 2 };
  const rate = (typeof cur.rate === 'number' && !isNaN(cur.rate)) ? cur.rate : (parseFloat(cur.rate) || 3.75);
  return {
    price: finalUSD * rate,
    symbol: cur.symbol || 'ر.س',
    dec: cur.dec !== undefined ? cur.dec : 2
  };
}

export async function submitOrder(orderPayload) {
  return await api.post('/orders', orderPayload);
}
