module.exports = {
  apps: [
    {
      name: 'tabulation',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_development: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 3000,
        NEXT_PUBLIC_BASE_PATH: '/tabulation',
        DATABASE_URL: process.env.DATABASE_URL,
        NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3003,
        NEXT_PUBLIC_BASE_PATH: '/tabulation',
        DATABASE_URL: process.env.DATABASE_URL,
        NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN
      },
      error_file: '/var/log/pm2/tabulation-error.log',
      out_file: '/var/log/pm2/tabulation-out.log',
      log_file: '/var/log/pm2/tabulation-combined.log',
      time: true
    },
  ],
};