// Country → Currency mapping (popular countries)
export const COUNTRY_CURRENCY_MAP = {
  // South Asia
  'Nepal':        'NPR',
  'India':        'INR',
  'Pakistan':     'PKR',
  'Bangladesh':   'BDT',
  'Sri Lanka':    'LKR',

  // North America
  'United States':       'USD',
  'Canada':              'CAD',
  'Mexico':              'MXN',

  // Europe
  'Germany':     'EUR',
  'France':      'EUR',
  'Italy':       'EUR',
  'Spain':       'EUR',
  'Netherlands': 'EUR',
  'Portugal':    'EUR',
  'Greece':      'EUR',
  'Austria':     'EUR',
  'Belgium':     'EUR',
  'Finland':     'EUR',
  'Ireland':     'EUR',
  'United Kingdom': 'GBP',
  'Switzerland':    'CHF',
  'Norway':         'NOK',
  'Sweden':         'SEK',
  'Denmark':        'DKK',
  'Poland':         'PLN',

  // Asia Pacific
  'Australia':      'AUD',
  'New Zealand':    'NZD',
  'Japan':          'JPY',
  'China':          'CNY',
  'South Korea':    'KRW',
  'Singapore':      'SGD',
  'Hong Kong':      'HKD',
  'Thailand':       'THB',
  'Malaysia':       'MYR',
  'Indonesia':      'IDR',
  'Philippines':    'PHP',
  'Vietnam':        'VND',

  // Middle East
  'United Arab Emirates': 'AED',
  'Saudi Arabia':         'SAR',
  'Qatar':                'QAR',
  'Kuwait':               'KWD',
  'Israel':               'ILS',
  'Turkey':               'TRY',

  // Africa
  'South Africa':  'ZAR',
  'Nigeria':       'NGN',
  'Kenya':         'KES',
  'Egypt':         'EGP',
  'Ghana':         'GHS',

  // Latin America
  'Brazil':      'BRL',
  'Argentina':   'ARS',
  'Chile':       'CLP',
  'Colombia':    'COP',
  'Peru':        'PEN',
};

export const COUNTRY_OPTIONS = Object.keys(COUNTRY_CURRENCY_MAP)
  .sort()
  .map(country => ({ value: country, label: country }));

/**
 * Get currency code from country name.
 * Falls back to USD if country not found.
 */
export const getCurrencyFromCountry = (country) =>
  COUNTRY_CURRENCY_MAP[country] || 'USD';

/**
 * Format amount in ISO style: "NPR 1,500.00", "USD 150.00", "AUD 250.00"
 * Uses Intl.NumberFormat for correct decimal/grouping per currency.
 */
export const formatCurrency = (amount, currencyCode) => {
  if (typeof amount !== 'number' || isNaN(amount)) return `${currencyCode || 'USD'} 0.00`;
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    const sign = amount < 0 ? '-' : '';
    return `${sign}${currencyCode || 'USD'} ${formatted}`;
  } catch {
    return `${currencyCode || 'USD'} ${Math.abs(amount).toFixed(2)}`;
  }
};
