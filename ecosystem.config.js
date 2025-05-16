module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: 'yarn',
      args: 'start',
      watch: false,
      autorestart: true,
      max_memory_restart: '4G',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://verifiable_ai_user:secure_password@localhost:5432/verifiable_ai',
        JWT_SECRET: 'verifiable-ai-jwt-secret-key'
      }
    },
    {
      name: 'frontend',
      cwd: './credo-next-app',
      script: 'yarn',
      args: 'start',
      watch: false,
      autorestart: true,
      max_memory_restart: '4G',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_BASE_URL: 'http://147.182.218.241:3002',
        NEXT_PUBLIC_COMPANY_NAME: 'Verifiable AI',
        NEXT_PUBLIC_COMPANY_LOGO_URL: 'https://www.ajna.dev/icon.png',
        YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
        YARN_IGNORE_PATH: 'true'
      }
    }
  ]
}; 