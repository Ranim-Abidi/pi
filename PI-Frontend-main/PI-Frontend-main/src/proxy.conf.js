/**
 * Dev proxy: Spring on 8080; ML split across formation (8000), question generator (8001), freelance AI (8002).
 */
module.exports = [
  {
    context: ["/api"],
    target: "http://127.0.0.1:8080",
    secure: false,
    changeOrigin: true,
    logLevel: "info",
  },
  {
    context: ["/ml/api"],
    target: "http://127.0.0.1:8002",
    secure: false,
    changeOrigin: true,
    pathRewrite: { "^/ml": "" },
    logLevel: "info",
  },
  {
    context: ["/ml/generate"],
    target: "http://127.0.0.1:8001",
    secure: false,
    changeOrigin: true,
    pathRewrite: { "^/ml": "" },
    logLevel: "info",
  },
  {
    context: ["/ml/questions"],
    target: "http://127.0.0.1:8001",
    secure: false,
    changeOrigin: true,
    pathRewrite: { "^/ml": "" },
    logLevel: "info",
  },
  {
    context: ["/ml"],
    target: "http://127.0.0.1:8000",
    secure: false,
    changeOrigin: true,
    pathRewrite: { "^/ml": "" },
    logLevel: "info",
  },
  {
    context: ["/oss"],
    target: "https://text.pollinations.ai",
    secure: true,
    changeOrigin: true,
    logLevel: "info",
    pathRewrite: { "^/oss/generate": "/generate" },
  },
];
