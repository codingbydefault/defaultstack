const path = require("path");

const appDir = path.resolve(__dirname, "..");

// The Express API is not started here. It already runs on this machine and
// must listen on 127.0.0.1:3000. Nginx (api.defaultstack.online) proxies to it.
// To supervise Express with PM2 later, add a second app whose script and cwd
// point at that project, with HOST or hostname bound to 127.0.0.1 and PORT 3000.
// Do not publish port 3000, 3100, or 5432 on the public internet.

module.exports = {
  apps: [
    {
      name: "defaultstack-web",
      cwd: appDir,
      script: path.join(appDir, ".next", "standalone", "server.js"),
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3100",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
