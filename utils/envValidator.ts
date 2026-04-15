/**
 * @module envValidator
 * @description Validates all required environment variables at application startup.
 *
 * Why this matters (Google engineering standard):
 * - Fail fast: crash immediately with a clear error if config is wrong.
 * - Prevents cryptic Firebase errors caused by missing env vars.
 * - Call this ONCE in `src/firebase.ts` before initializing Firebase.
 */

/** All environment variables required for the app to function. */
const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number];

/**
 * Validates all required environment variables.
 * Throws a descriptive error if any are missing — fail-fast principle.
 *
 * @throws Error with a list of all missing variables.
 */
export const validateEnv = (): void => {
  const missing: RequiredEnvVar[] = REQUIRED_ENV_VARS.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    const list = missing.map((k) => `  • ${k}`).join('\n');
    throw new Error(
      `[BrightSoma] Missing required environment variables:\n${list}\n\n` +
      `Ensure your .env file is correctly configured. See .env.example for reference.`
    );
  }
};

/**
 * Retrieves a required environment variable.
 * Provides a typed, safe alternative to `import.meta.env[key]`.
 */
export const getEnv = (key: RequiredEnvVar): string => {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(`[BrightSoma] Environment variable "${key}" is not set.`);
  }
  return value;
};
