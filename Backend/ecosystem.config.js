module.exports = {
  apps: [
    {
      name: 'moodlocationfinder-backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false, // ปิด watch เพราะบน production ถ้าเปิดจะเปลืองทรัพยากร
      max_memory_restart: '1G', // ถ้าระบบกินแรมเกิน 1GB ให้รีสตาร์ทอัตโนมัติกันเซิฟพัง
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
