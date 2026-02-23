module.exports = {
  apps: [
    {
      name: "mooser-landing",
      script: "/home/supp/mooser/landing/server.js",
      interpreter: "node",
      env: {
        PORT: 4000,
        NODE_ENV: "production",
      },
    },
    {
      name: "mooser-mcp",
      script: "/home/supp/mooser/mcp/dist/server.js",
      interpreter: "node",
      env: {
        PORT: 4001,
        NODE_ENV: "production",
        RESEND_API_KEY: "",
        FROM_ADDRESS: "",
        SEND_ENABLED: "false",
      },
    },
  ],
};
