module.exports = {
  apps: [
    {
      name: 'nest-backend',
      script: 'dist/main.js',  // En prod, on démarre le build
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: ['node_modules', 'uploads'],
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
