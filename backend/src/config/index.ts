// Application configuration

// Placeholder: configuration will be loaded from environment variables.
// Use process.env with sensible defaults.

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Additional config keys will be added as the application grows.
};