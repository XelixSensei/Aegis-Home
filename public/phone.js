/* Step 5: Indian WhatsApp numbers and passcodes. Pure logic, no DOM. */
(function (root) {
  // People sign in with number + passcode. Supabase stores this as an internal login address
  // made from the number. No email is ever sent to it.
  const LOGIN_DOMAIN = 'phone.aegishome.app';

  /* Accepts 98765 43210, 098765-43210, +91 98765 43210, 919876543210. Returns +919876543210 or null. */
  function normalize(input) {
    let digits = String(input || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
  }
  const loginEmail = phone => `${phone.replace(/^\+/, '')}@${LOGIN_DOMAIN}`;
  const validPasscode = code => /^\d{6}$/.test(String(code || ''));
  /* Easy-to-guess passcodes, like 111111 or 123456. */
  const weakPasscode = code => /^(\d)\1{5}$/.test(code) || '0123456789'.includes(code) || '9876543210'.includes(code);
  const display = phone => phone ? `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}` : '';

  const api = {normalize, loginEmail, validPasscode, weakPasscode, display, LOGIN_DOMAIN};
  if (typeof module !== 'undefined') module.exports = api;
  else root.Phone = api;
})(globalThis);
