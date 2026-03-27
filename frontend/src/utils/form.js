export const sanitizePhone = (value = "") => value.replace(/\D/g, "").slice(0, 10);
export const sanitizeOtp = (value = "") => value.replace(/\D/g, "").slice(0, 6);
