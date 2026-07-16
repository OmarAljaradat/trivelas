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
  const rateUSD = platform === 'pc' ? ratePC : rateConsole;
  const baseUSD = (coins / 100_000) * rateUSD;
  const discPct = getDiscount(coins, discounts);
  const finalUSD = baseUSD * (1 - discPct / 100);
  
  const cur = currencyRates[currency] || { rate: 1, symbol: '$', dec: 2 };
  return {
    price: finalUSD * cur.rate,
    symbol: cur.symbol,
    dec: cur.dec
  };
}

export async function submitOrder(orderPayload) {
  return await api.post('/orders', orderPayload);
}
