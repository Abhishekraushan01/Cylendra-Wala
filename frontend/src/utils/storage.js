export const getStoredToken = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem("cw_token") : null;
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cw_token", token);
    }
  } catch {
    return null;
  }

  return token;
};

export const getStoredRole = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem("cw_role") : null;
  } catch {
    return null;
  }
};

export const setStoredRole = (role) => {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cw_role", role);
    }
  } catch {
    return null;
  }

  return role;
};

export const clearStoredToken = () => {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("cw_token");
      window.localStorage.removeItem("cw_role");
    }
  } catch {
    return null;
  }

  return null;
};
