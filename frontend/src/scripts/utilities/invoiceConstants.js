// frontend/src/scripts/constants/invoiceConstants.js

// 1. Currency Configuration
export const CURRENCY_OPTIONS = [
  { code: 'AUD', symbol: '$', label: 'AUD$' },
  { code: 'USD', symbol: '$', label: 'USD$' },
  { code: 'EUR', symbol: '€', label: 'EUR€' },
  { code: 'GBP', symbol: '£', label: 'GBP£' },
  { code: 'JPY', symbol: '¥', label: 'JPY¥' },
  { code: 'CNY', symbol: '¥', label: 'CNY¥' },
  { code: 'NZD', symbol: '$', label: 'NZD$' },
];

// 2. Unit Configuration
export const UNIT_OPTIONS = [
  { value: 't', label: 't' },
  { value: 'kg', label: 'kg' },
  { value: 'bin', label: 'bin' },
  { value: 'cnt', label: 'CNT' },
  { value: 'num', label: 'num' },
  { value: 'pcs', label: 'pcs' },
  { value: 'pal', label: 'pal' },
];

// 3. Helper to get the display string (e.g., "AUD$")
export const getCurrencyLabel = (currencyCode) => {
  const currency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);
  return currency ? `${currency.code}${currency.symbol}` : `${currencyCode}$`;
};