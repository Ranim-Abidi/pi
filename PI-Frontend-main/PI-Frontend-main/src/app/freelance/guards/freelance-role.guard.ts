import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { RoleSwitchService } from '../services/role-switch.service';

@Injectable({ providedIn: 'root' })
export class FreelanceRoleGuard implements CanActivate {
  constructor(
    private roleSwitchService: RoleSwitchService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      this.router.navigate(['/login']);
      return false;
    }

    const role = (this.roleSwitchService.getJwtRole() || '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/^ROLE_/, '');

    if (role === 'CLIENT_FREELANCE' || role === 'CANDIDAT') {
      return true;
    }

    if (role === 'ADMIN') {
      this.router.navigate(['/admin-dashboard']);
      return false;
    }
    if (role === 'RECRUTEUR') {
      this.router.navigate(['/recruiter-dashboard']);
      return false;
    }
    if (role === 'ORGANISATEUR') {
      this.router.navigate(['/evenement-dashboard']);
      return false;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
