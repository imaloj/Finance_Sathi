const COUNTRY_CURRENCY_MAP = {
  'Nepal': 'NPR', 'India': 'INR', 'Pakistan': 'PKR', 'Bangladesh': 'BDT', 'Sri Lanka': 'LKR',
  'United States': 'USD', 'Canada': 'CAD', 'Mexico': 'MXN',
  'Germany': 'EUR', 'France': 'EUR', 'Italy': 'EUR', 'Spain': 'EUR',
  'Netherlands': 'EUR', 'Portugal': 'EUR', 'Greece': 'EUR', 'Austria': 'EUR',
  'Belgium': 'EUR', 'Finland': 'EUR', 'Ireland': 'EUR',
  'United Kingdom': 'GBP', 'Switzerland': 'CHF', 'Norway': 'NOK',
  'Sweden': 'SEK', 'Denmark': 'DKK', 'Poland': 'PLN',
  'Australia': 'AUD', 'New Zealand': 'NZD', 'Japan': 'JPY', 'China': 'CNY',
  'South Korea': 'KRW', 'Singapore': 'SGD', 'Hong Kong': 'HKD',
  'Thailand': 'THB', 'Malaysia': 'MYR', 'Indonesia': 'IDR',
  'Philippines': 'PHP', 'Vietnam': 'VND',
  'United Arab Emirates': 'AED', 'Saudi Arabia': 'SAR', 'Qatar': 'QAR',
  'Kuwait': 'KWD', 'Israel': 'ILS', 'Turkey': 'TRY',
  'South Africa': 'ZAR', 'Nigeria': 'NGN', 'Kenya': 'KES', 'Egypt': 'EGP', 'Ghana': 'GHS',
  'Brazil': 'BRL', 'Argentina': 'ARS', 'Chile': 'CLP', 'Colombia': 'COP', 'Peru': 'PEN',
};

export const getCurrencyFromCountry = (country) =>
  COUNTRY_CURRENCY_MAP[country] || 'USD';

/**
 * Format amount in ISO style: "NPR 1,500.00", "USD 150.00"
 */
export const formatCurrency = (amount, currencyCode) => {
  if (typeof amount !== 'number' || isNaN(amount)) return `${currencyCode || 'USD'} 0.00`;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencyCode || 'USD'} ${formatted}`;
};
