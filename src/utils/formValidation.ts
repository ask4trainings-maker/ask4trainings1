export function normalizePhone(phone: string): string {
  // Strip all non-digit and non-plus characters
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Domestic Indian Number Normalization
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12 && /^[6-9]/.test(cleaned.slice(2))) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11 && /^[6-9]/.test(cleaned.slice(1))) {
    cleaned = cleaned.slice(1);
  }
  
  return cleaned;
}

export function validatePhone(phone: string): { isValid: boolean; error?: string; normalizedValue: string } {
  const normalizedValue = normalizePhone(phone);
  
  // If it's a domestic normalized phone (10 digits starting with 6-9)
  if (/^[6-9]\d{9}$/.test(normalizedValue)) {
    return { isValid: true, normalizedValue };
  }
  
  // If it starts with a plus but didn't normalize to Indian 10-digit (E.164 compliance)
  if (normalizedValue.startsWith('+')) {
    if (/^\+[1-9]\d{7,14}$/.test(normalizedValue)) {
      return { isValid: true, normalizedValue };
    }
    return { isValid: false, error: 'Please enter a valid international mobile number.', normalizedValue };
  }
  
  // Specific error messages for bad domestic input
  if (normalizedValue.length > 0 && normalizedValue.length < 10 && !normalizedValue.startsWith('+')) {
    return { isValid: false, error: 'Please enter a complete 10-digit mobile number.', normalizedValue };
  }
  
  if (normalizedValue.length === 10 && !/^[6-9]/.test(normalizedValue)) {
    return { isValid: false, error: 'Please enter a valid mobile number starting with 6, 7, 8, or 9.', normalizedValue };
  }
  
  return { isValid: false, error: 'Please enter a valid mobile number.', normalizedValue };
}

export function validateName(name: string): { isValid: boolean; error?: string; sanitizedValue: string } {
  const trimmed = name.trim();
  // Strip HTML tags
  const noHtml = trimmed.replace(/<[^>]*>/g, '');
  
  if (noHtml.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long.', sanitizedValue: noHtml };
  }
  
  if (noHtml.length > 60) {
    return { isValid: false, error: 'Name must not exceed 60 characters.', sanitizedValue: noHtml };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(noHtml)) {
    return { isValid: false, error: 'Name can only contain alphabets, spaces, hyphens, and apostrophes.', sanitizedValue: noHtml };
  }
  
  return { isValid: true, sanitizedValue: noHtml };
}

export function validateEmail(email: string): { isValid: boolean; error?: string; sanitizedValue: string } {
  const trimmed = email.trim().toLowerCase();
  // Simple RFC 5322 regex approximation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.', sanitizedValue: trimmed };
  }
  
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a complete email address.', sanitizedValue: trimmed };
  }
  
  return { isValid: true, sanitizedValue: trimmed };
}

export function validateMessage(message: string): { isValid: boolean; error?: string; sanitizedValue: string } {
  const trimmed = message.trim();
  const noHtml = trimmed.replace(/<[^>]*>/g, '').replace(/\0/g, ''); // strip html and null bytes
  
  if (noHtml.length > 1000) {
    return { isValid: false, error: 'Message must not exceed 1000 characters.', sanitizedValue: noHtml };
  }
  
  return { isValid: true, sanitizedValue: noHtml };
}
