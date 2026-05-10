export const ACCESS_COOKIE_NAME = "sa_a01_access";

export function getAccessPassword() {
  return process.env.ACCESS_PASSWORD?.trim() ?? "";
}

export function isAccessProtectionEnabled() {
  return getAccessPassword().length > 0;
}

export function isAuthorizedCookieValue(value: string | undefined) {
  const password = getAccessPassword();

  if (!password) {
    return true;
  }

  return value === password;
}
