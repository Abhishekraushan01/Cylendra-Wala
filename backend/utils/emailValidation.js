const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const isValidEmail = (value = "") => emailPattern.test(normalizeEmail(value));

module.exports = {
  normalizeEmail,
  isValidEmail
};
