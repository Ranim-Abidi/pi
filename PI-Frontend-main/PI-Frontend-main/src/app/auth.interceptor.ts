import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Do not attach auth header for Cloudinary uploads (CORS preflight will otherwise be rejected)
    if (req.url.includes('://api.cloudinary.com/')) {
      return next.handle(req);
    }

    if (req.url.includes('/api/auth/')) {
      return next.handle(req);
    }

    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      if (isJwtExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('recruteurId');
        return next.handle(req);
      }

      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }

    // Purge invalid placeholder values left by previous sessions.
    if (token === 'undefined' || token === 'null') {
      localStorage.removeItem('token');
    }

    return next.handle(req);
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Do not add token for Cloudinary uploads (to avoid CORS preflight Authorization error)
  if (req.url.includes('://api.cloudinary.com/')) {
    console.log('☁️ Cloudinary upload request (no auth header):', req.url);
    return next(req);
  }

  // Do not add token for explicit "public" endpoints
  if (req.url.includes('/public/')) {
    console.log('🔓 Public endpoint (no token needed):', req.url);
    return next(req);
  }

  // Ne pas ajouter le token pour les endpoints d'authentification (login/register)
  if (req.url.includes('/api/auth/')) {
    console.log('🔓 Auth endpoint (no token needed):', req.url);
    return next(req);
  }

  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    if (isJwtExpired(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('recruteurId');
      return next(req);
    }

    console.log('✅ Token found and adding to request:', req.url);
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    console.log('📋 Authorization header:', cloned.headers.get('Authorization')?.substring(0, 50) + '...');
    return next(cloned);
  }
  console.log('❌ No token in localStorage for:', req.url);
  return next(req);
};

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return true;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const exp = Number(payload?.exp || 0);
    if (!exp) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return exp <= now;
  } catch {
    return true;
  }
}