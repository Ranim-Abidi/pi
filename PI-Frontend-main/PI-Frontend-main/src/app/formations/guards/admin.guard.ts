import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const role = (localStorage.getItem('userRole') || '')
    .toString().trim().toUpperCase().replace('ROLE_', '');

  if (role === 'ADMIN') {
    return true;
  }

  router.navigate(['/formations']);
  return false;
};