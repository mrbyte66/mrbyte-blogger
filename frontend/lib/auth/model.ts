/** Account UI helpers. Identity, roles and sessions come only from the server (see AuthProvider). */
export const avatarStyles = ["initials", "round", "glasses", "curly", "reader", "robot", "portrait-01", "portrait-02", "portrait-03", "portrait-04", "portrait-05", "portrait-06", "portrait-07", "portrait-08", "portrait-09", "portrait-10", "portrait-11", "portrait-12", "portrait-13", "portrait-14", "portrait-15", "portrait-16", "portrait-17", "portrait-18", "portrait-19", "portrait-20", "portrait-21", "portrait-22", "portrait-23", "portrait-24", "portrait-25", "portrait-26", "portrait-27", "portrait-28", "portrait-29", "portrait-30", "portrait-31", "portrait-32", "portrait-33", "portrait-34", "portrait-35", "portrait-36", "portrait-37", "portrait-38", "portrait-39", "portrait-40", "portrait-41", "portrait-42", "portrait-43", "portrait-44", "portrait-45", "portrait-46", "portrait-47", "portrait-48", "portrait-49", "portrait-50", "portrait-51", "portrait-52", "portrait-53", "portrait-54"] as const;
export type AvatarStyle = typeof avatarStyles[number];
export type AuthScreen = "login" | "register" | "forgot" | "reset" | "verify";
export function validEmail(email: string) { return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function passwordStrength(password: string) {
  if (!password) return 0;
  return Math.min(4, Number(password.length >= 8) + Number(password.length >= 12) + Number(/[a-z]/i.test(password) && /\d/.test(password)) + Number(/[^a-z\d]/i.test(password)));
}
