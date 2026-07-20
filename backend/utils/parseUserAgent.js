
export const parseUserAgent = (ua = '') => {
  if (!ua) return 'Unknown device';

  // OS detection
  let os = 'Unknown OS';
  if (/iPhone/i.test(ua))           os = 'iPhone';
  else if (/iPad/i.test(ua))        os = 'iPad';
  else if (/Android/i.test(ua))     os = 'Android';
  else if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/Windows/i.test(ua))     os = 'Windows';
  else if (/Macintosh/i.test(ua))   os = 'macOS';
  else if (/Linux/i.test(ua))       os = 'Linux';
  else if (/CrOS/i.test(ua))        os = 'Chrome OS';

  // Browser detection
  let browser = 'Unknown browser';
  if (/Edg\//i.test(ua))            browser = 'Edge';
  else if (/OPR\//i.test(ua))       browser = 'Opera';
  else if (/Chrome\//i.test(ua))    browser = 'Chrome';
  else if (/Firefox\//i.test(ua))   browser = 'Firefox';
  else if (/Safari\//i.test(ua))    browser = 'Safari';
  else if (/MSIE|Trident/i.test(ua)) browser = 'Internet Explorer';

  return `${os} · ${browser}`;
};
