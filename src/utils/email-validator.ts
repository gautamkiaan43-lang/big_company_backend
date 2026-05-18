import dotenv from 'dotenv';
dotenv.config();

/**
 * Validates if an email belongs to the strictly allowed domain (@big.co.rw).
 * @param email The email address to validate
 * @returns boolean
 */
export const validateBigDomain = (email: string): boolean => {
  const allowedDomain = process.env.GMAIL_ALLOWED_DOMAIN || 'big.co.rw';
  return email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`);
};

/**
 * Validates the format for Retailer and Wholesaler emails as per spec.
 * Formats: name.retailer@big.co.rw or name.wholesaler@big.co.rw
 * @param email The email address to validate
 * @param role The role to check against
 * @returns boolean
 */
export const validateBusinessEmailFormat = (email: string, role: 'retailer' | 'wholesaler'): boolean => {
  if (!validateBigDomain(email)) return false;
  
  const [localPart] = email.split('@');
  if (role === 'retailer') {
    return localPart.endsWith('.retailer');
  } else if (role === 'wholesaler') {
    return localPart.endsWith('.wholesaler');
  }
  return false;
};
