/**
 * Email Domain Validator
 * Identifies and filters public/generic email providers to ensure
 * enterprise isolation and prevent unrelated users from being grouped together.
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
  
  // Regional Providers - US
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'cox.net',
  'charter.net',
  'earthlink.net',
  'optonline.net',
  'frontier.com',
  'windstream.net',
  
  // Regional Providers - Europe
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'gmx.at',
  'gmx.ch',
  'web.de',
  'freenet.de',
  't-online.de',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'laposte.net',
  'sfr.fr',
  'neuf.fr',
  'btinternet.com',
  'virginmedia.com',
  'sky.com',
  'talktalk.net',
  'tiscali.co.uk',
  'tiscali.it',
  'libero.it',
  'virgilio.it',
  'alice.it',
  'tin.it',
  'fastwebnet.it',
  'terra.es',
  'telefonica.net',
  'movistar.es',
  
  // Regional Providers - Asia
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'sina.cn',
  'sohu.com',
  'foxmail.com',
  'naver.com',
  'hanmail.net',
  'daum.net',
  'nate.com',
  'rediffmail.com',
  
  // Regional Providers - Russia/CIS
  'mail.ru',
  'inbox.ru',
  'list.ru',
  'bk.ru',
  'yandex.ru',
  'yandex.com',
  'yandex.ua',
  'yandex.by',
  'yandex.kz',
  'rambler.ru',
  
  // Regional Providers - Canada
  'rogers.com',
  'shaw.ca',
  'sympatico.ca',
  'bell.net',
  
  // Regional Providers - Australia/NZ
  'bigpond.com',
  'bigpond.net.au',
  'optusnet.com.au',
  'ozemail.com.au',
  'xtra.co.nz',
  
  // Privacy-Focused Providers
  'mailfence.com',
  'disroot.org',
  'runbox.com',
  'posteo.de',
  'kolabnow.com',
  'fastmail.com',
  'fastmail.fm',
  'hushmail.com',
  'hush.com',
  'hush.ai',
  
  // Temporary/Disposable Email Providers (Common ones)
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'maildrop.cc',
  'minuteinbox.com',
  'temp-mail.org',
  
  // Other Common Providers
  'mail.com',
  'email.com',
  'usa.com',
  'myself.com',
  'consultant.com',
  'post.com',
  'europe.com',
  'asia.com',
  'iname.com',
  'writeme.com',
  'dr.com',
  'engineer.com',
  'cheerful.com',
  'accountant.com',
  'techie.com',
  'linuxmail.org',
  'musician.org',
  'activist.com',
  'adexec.com',
  'allergist.com',
  'alumni.com',
  'alumnidirector.com',
  'angelic.com',
  'appraiser.net',
  'archaeologist.com',
  'arcticmail.com',
  'artlover.com',
  'attorney.com',
  'auctioneer.net',
  'bartender.net',
  'bikerider.com',
  'birdlover.com',
  'brew-meister.com',
  'cash4u.com',
  'chemist.com',
  'clerk.com',
  'clubmember.org',
  'collector.org',
  'columnist.com',
  'comic.com',
  'computer4u.com',
  'counsellor.com',
  'cyberservices.com',
  'deliveryman.com',
  'diplomats.com',
  'disposable.com',
  'doctor.com',
  'execs.com',
  'financier.com',
  'fireman.net',
  'gardener.com',
  'geologist.com',
  'graduate.org',
  'graphic-designer.com',
  'groupmail.com',
  'hairdresser.net',
  'homemail.com',
  'instructor.net',
  'insurer.com',
  'job4u.com',
  'journalist.com',
  'lawyer.com',
  'legislator.com',
  'lobbyist.com',
  'minister.com',
  'musician.com',
  'net-shopping.com',
  'optician.com',
  'orthodontist.net',
  'pediatrician.com',
  'photographer.net',
  'physicist.net',
  'planetmail.com',
  'politician.com',
  'presidency.com',
  'priest.com',
  'programmer.net',
  'publicist.com',
  'qualityservice.com',
  'radiologist.net',
  'realtyagent.com',
  'registerednurses.com',
  'reincarnate.com',
  'religious.com',
  'repairman.com',
  'representative.com',
  'rescueteam.com',
  'salesperson.net',
  'secretary.net',
  'socialworker.net',
  'sociologist.com',
  'solution4u.com',
  'songwriter.net',
  'surgical.net',
  'teachers.org',
  'tech-center.com',
  'therapist.net',
  'toothfairy.com',
  'tvstar.com',
  'umpire.com',
  'webname.com',
  'worker.com',
  'workmail.com',
  'writeme.com',
]);

/**
 * Check if an email domain is a public/generic provider
 * @param email The email address to check
 * @returns true if the domain is a public provider, false otherwise
 */
export function isPublicEmailDomain(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return false;
  }
  
  return PUBLIC_EMAIL_DOMAINS.has(domain);
}

/**
 * Extract domain from email address
 * @param email The email address
 * @returns The domain part of the email or null
 */
export function extractEmailDomain(email: string): string | null {
  if (!email || !email.includes('@')) {
    return null;
  }
  
  const domain = email.split('@')[1]?.toLowerCase();
  return domain || null;
}

/**
 * Determine if users should be grouped in the same enterprise based on email domain
 * @param email1 First email address
 * @param email2 Second email address
 * @returns true if users should be in the same enterprise, false otherwise
 */
export function shouldShareEnterprise(email1: string, email2: string): boolean {
  const domain1 = extractEmailDomain(email1);
  const domain2 = extractEmailDomain(email2);
  
  // Different domains or invalid emails
  if (!domain1 || !domain2 || domain1 !== domain2) {
    return false;
  }
  
  // Don't group users with public email domains
  if (isPublicEmailDomain(email1)) {
    return false;
  }
  
  // Same non-public domain - should share enterprise
  return true;
}

/**
 * Generate a unique enterprise identifier for a user
 * @param email The user's email address
 * @param metadata Optional user metadata
 * @returns A suggested enterprise name or identifier
 */
export function generateEnterpriseIdentifier(email: string, metadata?: { company?: string; organization?: string }): string {
  // If company/organization provided in metadata, use that
  if (metadata?.company) {
    return metadata.company;
  }
  if (metadata?.organization) {
    return metadata.organization;
  }
  
  const domain = extractEmailDomain(email);
  
  // For public domains, use email prefix + unique identifier
  if (!domain || isPublicEmailDomain(email)) {
    const emailPrefix = email.split('@')[0];
    return `${emailPrefix}'s Organization`;
  }
  
  // For corporate domains, derive company name from domain
  // Remove common TLDs and clean up
  const companyName = domain
    .replace(/\.(com|org|net|io|co|biz|info|edu|gov|mil)(\.[a-z]{2})?$/i, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return companyName || `${domain} Organization`;
}

/**
 * Validate if an email domain is acceptable for enterprise creation
 * @param email The email address to validate
 * @param options Validation options
 * @returns Validation result with message
 */
export function validateEmailDomainForEnterprise(
  email: string,
  options: {
    allowPublicDomains?: boolean;
    requireVerifiedDomain?: boolean;
    existingDomains?: Set<string>;
  } = {}
): { isValid: boolean; message?: string; suggestedAction?: string } {
  const domain = extractEmailDomain(email);
  
  if (!domain) {
    return {
      isValid: false,
      message: 'Invalid email address format',
    };
  }
  
  const isPublic = isPublicEmailDomain(email);
  
  if (isPublic && !options.allowPublicDomains) {
    return {
      isValid: false,
      message: 'Please use your company email address. Personal email domains are not allowed for enterprise accounts.',
      suggestedAction: 'request_company_email',
    };
  }
  
  if (options.existingDomains?.has(domain) && !isPublic) {
    return {
      isValid: true,
      message: 'This domain already has an enterprise account. You will be added to the existing organization.',
      suggestedAction: 'join_existing',
    };
  }
  
  if (options.requireVerifiedDomain && !isPublic) {
    return {
      isValid: true,
      message: 'Domain verification will be required to complete enterprise setup.',
      suggestedAction: 'verify_domain',
    };
  }
  
  return {
    isValid: true,
    message: isPublic 
      ? 'You will have your own individual workspace since you are using a personal email address.'
      : `A new enterprise account will be created for ${domain}.`,
  };
}