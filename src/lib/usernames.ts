// The rules every username follows, shared by sign-up, the rename route and
// the signed-out auth routes. Usernames are Firestore document IDs ("/" isn't
// allowed in one, nor "." or ".."), and login reads anything with an "@" as an
// email.

export const MAX_USERNAME_LENGTH = 64;

export const USERNAME_INVALID = 'Usernames can\'t be empty or contain "/" or "@".';
export const USERNAME_TOO_LONG = `Usernames can be at most ${MAX_USERNAME_LENGTH} characters.`;

/** What's wrong with a (trimmed) username, or null if it's fine. */
export function usernameProblem(username: string): string | null {
  if (!username || /[/@]/.test(username) || username === "." || username === "..") return USERNAME_INVALID;
  if (username.length > MAX_USERNAME_LENGTH) return USERNAME_TOO_LONG;
  return null;
}

/** The username from a request body, or "" if it can't be a username. */
export function usernameFrom(body: unknown) {
  const raw = (body as { username?: unknown } | null)?.username;
  const username = typeof raw === "string" ? raw.trim() : "";
  return usernameProblem(username) ? "" : username;
}

/** The email from a request body, or "" if it doesn't look like one. */
export function emailFrom(body: unknown) {
  const raw = (body as { email?: unknown } | null)?.email;
  const email = typeof raw === "string" ? raw.trim() : "";
  // 320 is the longest an address can be; Firebase checks the rest.
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
