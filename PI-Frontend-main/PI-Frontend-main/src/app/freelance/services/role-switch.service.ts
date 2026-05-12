import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

export type FreelanceViewMode = 'FREELANCER' | 'CLIENT_FREELANCE';

@Injectable({ providedIn: 'root' })
export class RoleSwitchService {
  private readonly VIEW_KEY = 'freelance_view_mode';

  private _mode = new BehaviorSubject<FreelanceViewMode>(this.readInitialMode());

  mode$ = this._mode.asObservable();

  get currentMode(): FreelanceViewMode {
    return this._mode.value;
  }

  switchMode(mode: FreelanceViewMode): void {
    localStorage.setItem(this.VIEW_KEY, mode);
    this._mode.next(mode);
  }

  isClientMode(): boolean {
    return this._mode.value === 'CLIENT_FREELANCE';
  }

  /** Re-sync view mode from localStorage or JWT (e.g. after login). */
  resolveInitialMode(): void {
    const next = this.readInitialMode();
    localStorage.setItem(this.VIEW_KEY, next);
    this._mode.next(next);
  }

  /** Read the user's role — JWT first, then localStorage. */
  getJwtRole(): string | null {
    const fromToken = this.parseRoleFromJwt();
    if (fromToken) {
      return fromToken;
    }
    const stored = localStorage.getItem('userRole');
    return stored ? this.normalizeRoleString(stored) : null;
  }

  getNormalizedRole(): string {
    return this.getJwtRole() || '';
  }

  /** True only for dedicated client accounts (not candidates exploring client UI). */
  isClientFreelanceByRole(): boolean {
    return this.getJwtRole() === 'CLIENT_FREELANCE';
  }

  private readInitialMode(): FreelanceViewMode {
    const stored = localStorage.getItem(this.VIEW_KEY) as FreelanceViewMode | null;
    if (stored === 'FREELANCER' || stored === 'CLIENT_FREELANCE') {
      return stored;
    }
    if (this.getNormalizedRole() === 'CLIENT_FREELANCE') {
      return 'CLIENT_FREELANCE';
    }
    return 'FREELANCER';
  }

  private parseRoleFromJwt(): string | null {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    try {
      const decoded: any = jwtDecode(token);
      const candidates: any[] = [];
      if (decoded?.role) {
        candidates.push(decoded.role);
      }
      if (decoded?.roles) {
        candidates.push(decoded.roles);
      }
      if (decoded?.authorities) {
        candidates.push(decoded.authorities);
      }
      for (const key of Object.keys(decoded || {})) {
        if (/role|authority/i.test(key) && decoded[key]) {
          candidates.push(decoded[key]);
        }
      }
      for (const c of candidates) {
        const norm = this.normalizeRoleString(this.flattenFirstRole(c));
        if (norm) {
          return norm;
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const raw = payload.role || payload.roles;
      if (raw) {
        const norm = this.normalizeRoleString(Array.isArray(raw) ? raw[0] : raw);
        if (norm) {
          return norm;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  private flattenFirstRole(source: any): string {
    if (!source) {
      return '';
    }
    if (typeof source === 'string') {
      return source;
    }
    if (Array.isArray(source)) {
      for (const item of source) {
        const r = this.flattenFirstRole(item);
        if (r) {
          return r;
        }
      }
      return '';
    }
    if (typeof source === 'object') {
      for (const f of ['authority', 'name', 'role', 'type']) {
        if (source[f]) {
          return this.flattenFirstRole(source[f]);
        }
      }
    }
    return '';
  }

  private normalizeRoleString(role: string): string {
    const raw = (role || '').toString().trim().toUpperCase().replace(/^ROLE_/, '');
    if (!raw) {
      return '';
    }
    if (raw.includes('ORGANISATEUR')) {
      return 'ORGANISATEUR';
    }
    if (raw.includes('RECRUTEUR')) {
      return 'RECRUTEUR';
    }
    if (raw.includes('CLIENT_FREELANCE') || raw === 'FREELANCE') {
      return 'CLIENT_FREELANCE';
    }
    if (raw.includes('CANDIDAT') || raw.includes('CANDIDATE')) {
      return 'CANDIDAT';
    }
    if (raw.includes('ADMIN')) {
      return 'ADMIN';
    }
    return raw;
  }
}
