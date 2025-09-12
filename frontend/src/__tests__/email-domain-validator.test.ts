import { 
  isPublicEmailDomain, 
  extractEmailDomain, 
  generateEnterpriseName,
  getEnterpriseCreationMessage,
  isValidEmail 
} from '@/lib/email-domain-validator';

describe('Email Domain Validator', () => {
  describe('isPublicEmailDomain', () => {
    it('should identify common public email domains', () => {
      expect(isPublicEmailDomain('user@gmail.com')).toBe(true);
      expect(isPublicEmailDomain('user@yahoo.com')).toBe(true);
      expect(isPublicEmailDomain('user@hotmail.com')).toBe(true);
      expect(isPublicEmailDomain('user@outlook.com')).toBe(true);
      expect(isPublicEmailDomain('user@aol.com')).toBe(true);
      expect(isPublicEmailDomain('user@protonmail.com')).toBe(true);
      expect(isPublicEmailDomain('user@icloud.com')).toBe(true);
    });

    it('should identify regional public email domains', () => {
      expect(isPublicEmailDomain('user@qq.com')).toBe(true);
      expect(isPublicEmailDomain('user@mail.ru')).toBe(true);
      expect(isPublicEmailDomain('user@gmx.de')).toBe(true);
      expect(isPublicEmailDomain('user@free.fr')).toBe(true);
      expect(isPublicEmailDomain('user@libero.it')).toBe(true);
    });

    it('should return false for corporate domains', () => {
      expect(isPublicEmailDomain('user@company.com')).toBe(false);
      expect(isPublicEmailDomain('user@acme-corp.com')).toBe(false);
      expect(isPublicEmailDomain('user@enterprise.io')).toBe(false);
      expect(isPublicEmailDomain('user@mybusiness.net')).toBe(false);
    });

    it('should handle invalid inputs', () => {
      expect(isPublicEmailDomain('')).toBe(false);
      expect(isPublicEmailDomain('notanemail')).toBe(false);
      expect(isPublicEmailDomain('@gmail.com')).toBe(false);
      expect(isPublicEmailDomain('user@')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isPublicEmailDomain('user@GMAIL.COM')).toBe(true);
      expect(isPublicEmailDomain('user@Gmail.Com')).toBe(true);
      expect(isPublicEmailDomain('USER@YAHOO.COM')).toBe(true);
    });
  });

  describe('extractEmailDomain', () => {
    it('should extract domain from valid emails', () => {
      expect(extractEmailDomain('user@gmail.com')).toBe('gmail.com');
      expect(extractEmailDomain('john.doe@company.com')).toBe('company.com');
      expect(extractEmailDomain('admin@sub.domain.com')).toBe('sub.domain.com');
    });

    it('should return null for invalid emails', () => {
      expect(extractEmailDomain('')).toBe(null);
      expect(extractEmailDomain('notanemail')).toBe(null);
      expect(extractEmailDomain('@domain.com')).toBe(null);
      expect(extractEmailDomain('user@')).toBe(null);
    });

    it('should handle case conversion', () => {
      expect(extractEmailDomain('user@DOMAIN.COM')).toBe('domain.com');
      expect(extractEmailDomain('USER@Domain.Com')).toBe('domain.com');
    });
  });

  describe('generateEnterpriseName', () => {
    it('should use provided company name from metadata', () => {
      expect(generateEnterpriseName('user@gmail.com', { company: 'Acme Corp' }))
        .toBe('Acme Corp');
      expect(generateEnterpriseName('user@yahoo.com', { organization: 'Tech Startup' }))
        .toBe('Tech Startup');
    });

    it('should generate workspace name for public domains', () => {
      expect(generateEnterpriseName('john.doe@gmail.com'))
        .toBe("John Doe's Workspace");
      expect(generateEnterpriseName('alice_smith@yahoo.com'))
        .toBe("Alice Smith's Workspace");
      expect(generateEnterpriseName('bob123@hotmail.com'))
        .toBe("Bob123's Workspace");
    });

    it('should derive organization name from corporate domains', () => {
      expect(generateEnterpriseName('user@acme-corp.com'))
        .toBe('Acme-corp Organization');
      expect(generateEnterpriseName('user@techstartup.io'))
        .toBe('Techstartup Organization');
      expect(generateEnterpriseName('user@my-company.net'))
        .toBe('My-company Organization');
    });

    it('should handle complex corporate domains', () => {
      expect(generateEnterpriseName('user@mail.company.com'))
        .toBe('Mail Company Organization');
      expect(generateEnterpriseName('user@app.startup.io'))
        .toBe('App Startup Organization');
    });
  });

  describe('getEnterpriseCreationMessage', () => {
    it('should return personal workspace message for public domains', () => {
      const result = getEnterpriseCreationMessage('user@gmail.com');
      expect(result.type).toBe('personal');
      expect(result.message).toContain('personal workspace');
      expect(result.warning).toBeDefined();
    });

    it('should return corporate workspace message for company domains', () => {
      const result = getEnterpriseCreationMessage('user@company.com');
      expect(result.type).toBe('corporate');
      expect(result.message).toContain('company.com');
      expect(result.warning).toBeUndefined();
    });

    it('should return invalid message for invalid emails', () => {
      const result = getEnterpriseCreationMessage('notanemail');
      expect(result.type).toBe('invalid');
      expect(result.message).toContain('valid email address');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('user@domain.com')).toBe(true);
      expect(isValidEmail('john.doe@company.co.uk')).toBe(true);
      expect(isValidEmail('alice+tag@example.org')).toBe(true);
      expect(isValidEmail('bob_smith@sub.domain.net')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });
});

describe('Enterprise Isolation', () => {
  it('should not group Gmail users together', () => {
    const user1 = 'alice@gmail.com';
    const user2 = 'bob@gmail.com';
    
    // Both are public domains
    expect(isPublicEmailDomain(user1)).toBe(true);
    expect(isPublicEmailDomain(user2)).toBe(true);
    
    // They should get separate workspaces
    const name1 = generateEnterpriseName(user1);
    const name2 = generateEnterpriseName(user2);
    expect(name1).not.toBe(name2);
    expect(name1).toContain('Alice');
    expect(name2).toContain('Bob');
  });

  it('should group corporate users from same domain', () => {
    const user1 = 'alice@acme-corp.com';
    const user2 = 'bob@acme-corp.com';
    
    // Both are corporate domains
    expect(isPublicEmailDomain(user1)).toBe(false);
    expect(isPublicEmailDomain(user2)).toBe(false);
    
    // They should get the same organization name
    const name1 = generateEnterpriseName(user1);
    const name2 = generateEnterpriseName(user2);
    expect(name1).toBe(name2);
    expect(name1).toBe('Acme-corp Organization');
  });

  it('should not group users from different public providers', () => {
    const user1 = 'alice@gmail.com';
    const user2 = 'alice@yahoo.com';
    
    expect(isPublicEmailDomain(user1)).toBe(true);
    expect(isPublicEmailDomain(user2)).toBe(true);
    
    const domain1 = extractEmailDomain(user1);
    const domain2 = extractEmailDomain(user2);
    expect(domain1).not.toBe(domain2);
  });
});