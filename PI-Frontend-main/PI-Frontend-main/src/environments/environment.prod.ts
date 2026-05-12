/**
 * Production build — replace apiUrl/mlUrl at CI time if the API is on another origin
 * (e.g. set apiUrl to https://api.example.com/api and mlUrl to https://ml.example.com or a gateway path).
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  mlUrl: '/ml',
  cloudinary: {
    cloudName: 'dlmeofspy',
    uploadPreset: 'testtest'
  }
};
