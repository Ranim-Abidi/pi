import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

// ─── Helper Functions ────────────────────────────────────────────────────────
function getStoredRole(): string {
  const storedRole = (localStorage.getItem('userRole') || '').toUpperCase().replace(/^ROLE_/, '');
  let tokenRole = '';

  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    try {
      const decoded: any = jwtDecode(token);
      tokenRole = String(decoded?.role || decoded?.roles || decoded?.authorities || '')
        .toUpperCase()
        .replace(/^ROLE_/, '');
    } catch {
      tokenRole = '';
    }
  }

  return storedRole || tokenRole;
}

function isAuthenticated(): boolean {
  const token = localStorage.getItem('token');
  return token && token !== 'undefined' && token !== 'null' ? true : false;
}

function redirectAndDeny(path: string = '/'): boolean {
  const router = inject(Router);
  router.navigate([path]);
  return false;
}

// ─── CANDIDAT Guard ─────────────────────────────────────────────────────────
function hasCandidatAccess(): boolean {
  if (!isAuthenticated()) {
    return redirectAndDeny('/');
  }

  const role = getStoredRole();
  if (role !== 'CANDIDAT') {
    return redirectAndDeny('/');
  }

  return true;
}

// ─── RECRUTEUR Guard ────────────────────────────────────────────────────────
function hasRecruteurAccess(): boolean {
  if (!isAuthenticated()) {
    return redirectAndDeny('/');
  }

  const role = getStoredRole();
  if (role !== 'RECRUTEUR') {
    return redirectAndDeny('/');
  }

  return true;
}

// ─── ADMIN Guard ────────────────────────────────────────────────────────────
function hasAdminAccess(): boolean {
  if (!isAuthenticated()) {
    return redirectAndDeny('/');
  }

  const role = getStoredRole();
  if (role !== 'ADMIN') {
    return redirectAndDeny('/');
  }

  return true;
}

// ─── EMPLOYER Guard ─────────────────────────────────────────────────────────
function hasEmployerAccess(): boolean {
  if (!isAuthenticated()) {
    return redirectAndDeny('/');
  }

  const role = getStoredRole();
  if (role !== 'EMPLOYER') {
    return redirectAndDeny('/');
  }

  return true;
}

// ─── PARTENAIRE Guard ───────────────────────────────────────────────────────
function hasPartenaireAccess(): boolean {
  if (!isAuthenticated()) {
    return redirectAndDeny('/');
  }

  const role = getStoredRole();
  if (role !== 'PARTENAIRE') {
    return redirectAndDeny('/');
  }

  return true;
}

// ─── Export Guards ──────────────────────────────────────────────────────────
export const candidatGuard: CanActivateFn = () => hasCandidatAccess();
export const candidatChildGuard: CanActivateChildFn = () => hasCandidatAccess();

export const recruteurGuard: CanActivateFn = () => hasRecruteurAccess();
export const recruteurChildGuard: CanActivateChildFn = () => hasRecruteurAccess();

export const adminGuard: CanActivateFn = () => hasAdminAccess();
export const adminChildGuard: CanActivateChildFn = () => hasAdminAccess();

export const employerGuard: CanActivateFn = () => hasEmployerAccess();
export const employerChildGuard: CanActivateChildFn = () => hasEmployerAccess();

export const partenaireGuard: CanActivateFn = () => hasPartenaireAccess();
export const partenaireChildGuard: CanActivateChildFn = () => hasPartenaireAccess();
