/**
 * @module navigationConfig
 * @description Pure data definitions for navigation items — no JSX, no React imports.
 *
 * Why separate from constants.tsx:
 * - Data files should have ZERO framework dependencies.
 * - This can be imported in Cloud Functions, unit tests, or SSR contexts.
 * - The icon mapping is handled separately in navigationIcons.tsx.
 */

import { UserRole } from '../types';

/** Raw navigation item data — id, label, and which roles can see it. */
export interface NavItem {
  id: string;
  label: string;
  roles: UserRole[];
}

/**
 * Navigation configuration.
 * To add a module, add it here first — the UI will automatically pick it up.
 */
export const NAV_CONFIG: NavItem[] = [
  { id: 'platform-admin', label: 'Platform Management', roles: ['PLATFORM_ADMIN'] },
  { id: 'dashboard',      label: 'School Dashboard',    roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'PLATFORM_ADMIN'] },
  { id: 'teacher',        label: 'Teachers Portal',     roles: ['TEACHER', 'PLATFORM_ADMIN'] },
  { id: 'students',       label: 'Learners & Classes',  roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'TEACHER', 'PLATFORM_ADMIN'] },
  { id: 'timetable',      label: 'Timetable',           roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'TEACHER', 'PLATFORM_ADMIN'] },
  { id: 'finance',        label: 'Finance & Payments',  roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'FINANCE', 'TEACHER', 'PLATFORM_ADMIN'] },
  { id: 'academics',      label: 'CBC Assessments',     roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'TEACHER', 'PLATFORM_ADMIN'] },
  { id: 'boarding',       label: 'Boarding',            roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'PLATFORM_ADMIN'] },
  { id: 'transport',      label: 'Transport',           roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'PLATFORM_ADMIN'] },
  { id: 'driver',         label: 'Driver Portal',       roles: ['DRIVER', 'PLATFORM_ADMIN'] },
  { id: 'parent',         label: 'Parent Portal',       roles: ['PARENT', 'PLATFORM_ADMIN'] },
  { id: 'analytics',      label: 'Analytics',           roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'PLATFORM_ADMIN'] },
  { id: 'communication',  label: 'Communication',       roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'TEACHER', 'PLATFORM_ADMIN'] },
  { id: 'health',         label: "Students' Health",    roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'PLATFORM_ADMIN'] },
  { id: 'inventory',      label: 'Inventory',           roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'PLATFORM_ADMIN'] },
  { id: 'profile',        label: 'School Profile',      roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'PLATFORM_ADMIN'] },
];
