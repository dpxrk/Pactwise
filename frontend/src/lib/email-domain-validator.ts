/**
 * Client-side Email Domain Validator
 * Identifies public/generic email providers to ensure proper enterprise isolation
 */

// Comprehensive list of public/generic email domains
export const PUBLIC_EMAIL_DOMAINS = new Set([
  // Major International Providers
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.ca',
  'yahoo.de',
  'yahoo.fr',
  'yahoo.es',
  'yahoo.it',
  'yahoo.com.br',
  'yahoo.co.in',
  'yahoo.co.jp',
  'ymail.com',
  'rocketmail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.it',
  'hotmail.es',
  'outlook.com',
  'outlook.co.uk',
  'outlook.fr',
  'outlook.de',
  'outlook.es',
  'outlook.it',
  'live.com',
  'live.co.uk',
  'live.fr',
  'live.de',
  'live.it',
  'msn.com',
  'windowslive.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'aim.com',
  'zoho.com',
  'zohomail.com',
  'protonmail.com',
  'protonmail.ch',
  'proton.me',
  'pm.me',
  'tutanota.com',
  'tutanota.de',
  'tuta.io',
  'tutamail.com',
  
  // Regional Providers
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'cox.net',
  'charter.net',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'web.de',
  'freenet.de',
  't-online.de',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'laposte.net',
  'sfr.fr',
  'btinternet.com',
  'virginmedia.com',
  'sky.com',
  'libero.it',
  'virgilio.it',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'sohu.com',
  'naver.com',
  'hanmail.net',
  'daum.net',
  'mail.ru',
  'yandex.ru',
  'yandex.com',
  
  // Privacy-Focused Providers
  'mailfence.com',
  'disroot.org',
  'runbox.com',
  'posteo.de',
  'fastmail.com',
  'hushmail.com',
  
  // Temporary/Disposable Email Providers
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'temp-mail.org',
  
  // Other Common Providers
  'mail.com',
  'email.com',
]);

/**
 * Check if an email domain is a public/generic provider
 */
export function isPublicEmailDomain(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }
  
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }
  
  const domain = parts[1].toLowerCase();
  return PUBLIC_EMAIL_DOMAINS.has(domain);
}

/**
 * Extract domain from email address
 */
export function extractEmailDomain(email: string): string | null {
  if (!email || !email.includes('@')) {
    return null;
  }
  
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  
  return parts[1].toLowerCase();
}

/**
 * Generate a unique enterprise name for a user
 */
export function generateEnterpriseName(email: string, metadata?: { company?: string; organization?: string }): string {
  // If company/organization provided in metadata, use that
  if (metadata?.company) {
    return metadata.company;
  }
  if (metadata?.organization) {
    return metadata.organization;
  }
  
  const domain = extractEmailDomain(email);
  const emailPrefix = email.split('@')[0];
  
  // For public domains, use email prefix
  if (!domain || isPublicEmailDomain(email)) {
    // Capitalize first letter of email prefix, keep numbers together
    const formattedPrefix = emailPrefix
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return `${formattedPrefix}'s Workspace`;
  }
  
  // For corporate domains, derive company name from domain
  const companyName = domain
    .replace(/\.(com|org|net|io|co|biz|info|edu|gov|mil)(\.[a-z]{2})?$/i, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return `${companyName} Organization`;
}

/**
 * Get a user-friendly message about the enterprise creation
 */
export function getEnterpriseCreationMessage(email: string): {
  type: 'personal' | 'corporate' | 'invalid';
  message: string;
  warning?: string;
} {
  const domain = extractEmailDomain(email);
  
  if (!domain) {
    return {
      type: 'invalid',
      message: 'Please enter a valid email address.',
    };
  }
  
  if (isPublicEmailDomain(email)) {
    return {
      type: 'personal',
      message: 'A personal workspace will be created for you.',
      warning: 'To create or join a company workspace, please use your company email address.',
    };
  }
  
  return {
    type: 'corporate',
    message: `You'll be added to your company's workspace for ${domain}.`,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}