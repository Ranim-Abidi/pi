/**
 * Utility functions for JWT token handling
 */

export class JwtTokenUtil {

  /**
   * Decode JWT token and extract user ID
   * JWT format: header.payload.signature
   * Payload is base64-encoded JSON containing the user ID
   */
  static extractUserIdFromToken(token: string): number | null {
    try {
      if (!token || !token.includes('.')) {
        console.warn('❌ Invalid token format');
        return null;
      }

      // Split token into parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('❌ Invalid JWT structure');
        return null;
      }

      // Decode payload (second part)
      const payload = parts[1];
      const decodedStr = atob(payload);
      const decoded = JSON.parse(decodedStr);

      // Extract user ID from payload
      // The JWT typically contains 'id', 'userId', 'sub', or similar
      const userId = decoded.id || decoded.userId || decoded.sub;

      if (userId) {
        console.log('✅ User ID extracted from token:', userId);
        return parseInt(userId, 10);
      }

      console.warn('❌ User ID not found in token payload');
      return null;
    } catch (error) {
      console.error('❌ Error decoding JWT token:', error);
      return null;
    }
  }

  /**
   * Check if token is still valid
   */
  static isTokenValid(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = parts[1];
      const decodedStr = atob(payload);
      const decoded = JSON.parse(decodedStr);

      // Check expiration
      if (decoded.exp) {
        const expirationTime = decoded.exp * 1000; // Convert to milliseconds
        return Date.now() < expirationTime;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
