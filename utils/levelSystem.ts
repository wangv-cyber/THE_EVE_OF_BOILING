
/**
 * V5.0 Title System
 * Determines the player's title based on Total Bounty.
 */
export const calculateTitle = (bounty: number): string => {
  if (bounty >= 5000) return '地狱厨神 🤬';
  if (bounty >= 2001) return '行政总厨';
  if (bounty >= 1001) return '副主厨';
  if (bounty >= 201)  return '流水线厨师';
  return '洗碗工';
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};
