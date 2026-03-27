const normalizePhone = (value = "") => String(value).replace(/\D/g, "");

const isValidPhone = (value = "") => /^\d{10}$/.test(normalizePhone(value));

module.exports = {
  normalizePhone,
  isValidPhone
};
