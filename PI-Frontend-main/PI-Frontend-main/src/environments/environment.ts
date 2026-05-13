export const environment = {
  production: false,
  /** HTTP API base (dev: Angular proxy → Spring). */
  apiUrl: '/api',
  /** WebSocket base (prod: set in environment.prod.ts). */
  wsUrl: '',
  /** ML / FastAPI base path (dev: proxy → port 8000). Override via build for prod if needed. */
  mlUrl: '/ml',
  cloudinary: {
    cloudName: 'dlmeofspy',
    uploadPreset: 'testtest'
  }
};
