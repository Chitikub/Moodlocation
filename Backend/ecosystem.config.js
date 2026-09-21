module.exports = {
  apps: [
    {
      name: 'moodlocationfinder-backend',
      script: 'server.js',
      instances: 'max', // รันแบบ Cluster ใช้ทุก Core ของ CPU ที่มี
      exec_mode: 'cluster', // ทำให้รองรับ User จำนวนมากพร้อมกันได้ดี
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
