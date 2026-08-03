import { z } from 'zod';

/**
 * Zod schema for validating environment variables.
 * Fails fast with a clear message when required configuration is invalid.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().default('./database/inventory.sqlite'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'silent'])
    .default('info'),
  APP_NAME: z.string().default('School IT Inventory System'),
});

/** Parsed and validated environment variables. */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables from `process.env`.
 * Throws with a descriptive message when validation fails.
 */
export function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'Check your .env file. Copy .env.example to .env and adjust values as needed.',
    );
  }

  return result.data;
}