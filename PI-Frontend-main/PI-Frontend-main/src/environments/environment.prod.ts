export const environment = {
  production: true,
  apiUrl: 'http://192.168.1.214:30080/api',
  wsUrl: 'ws://192.168.1.214:30080/ws',
  /** Same NodePort origin without /api — legacy ML paths (may 503 on slim backend). */
  mlUrl: 'http://192.168.1.214:30080',
  cloudinary: {
    cloudName: 'dlmeofspy',
    uploadPreset: 'testtest'
  }
};
