/**
 * @module authService
 * @description Centralised Authentication & Role Resolution Service.
 *
 * Follows the Repository/Service pattern (Google/Amazon engineering standard).
 * - All Firebase Auth and Firestore role logic lives HERE, not in UI components.
 * - UI components consume the resolved profile; they never query Firestore directly.
 * - Resolution is strictly hierarchical (platform > institution > staff).
 *
 * RBAC Hierarchy (Priority Order):
 *  1. Master Profile   (users collection)   → PLATFORM_ADMIN or custom roles
 *  2. School Ownership (schools collection) → ADMIN
 *  3. Staff Assignment (staff collection)   → TEACHER / FINANCE / DRIVER etc.
 */

import { db, auth } from '../src/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { UserRole } from '../types';
import { NAVIGATION_ITEMS } from '../constants';
import {
  FirestoreUserDoc,
  FirestoreSchoolDoc,
  FirestoreStaffDoc,
} from '../types/firestoreTypes';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default modules guaranteed to any authenticated ADMIN user. */
const DEFAULT_ADMIN_MODULES: readonly string[] = [
  'dashboard', 'students', 'class-management', 'academics',
  'timetable', 'finance', 'attendance-register', 'profile',
  'communication', 'health',
];

/** Default modules guaranteed to any authenticated Staff member. */
const DEFAULT_STAFF_MODULES: readonly string[] = [
  'dashboard', 'students', 'class-management', 'academics',
  'timetable', 'finance', 'attendance-register', 'profile',
  'teacher', 'communication', 'health',
];

/** Retry constants for eventual consistency after new account creation. */
const ROLE_RETRY_LIMIT = 2;
const ROLE_RETRY_DELAY_MS = 2000;
const NEW_ACCOUNT_WINDOW_MS = 15_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type EditionType = 'starter' | 'professional' | 'elite';

/**
 * Fully-resolved user profile returned from `resolveUserRole`.
 * The UI layer only receives this typed object—never raw Firestore data.
 */
export interface ResolvedUserProfile {
  readonly role: UserRole;
  readonly schoolId: string | null;
  readonly edition: EditionType;
  readonly enabledModules: readonly string[];
  readonly isPlatformAdmin: boolean;
  readonly onboardingCompleted: boolean;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Merges a DB module list with the mandatory defaults for a role tier. */
const mergeModules = (dbModules: string[], defaults: readonly string[]): string[] =>
  Array.from(new Set([...dbModules, ...defaults]));

/** Constructs a platform-wide admin profile with full access. */
const buildPlatformAdminProfile = (): ResolvedUserProfile => ({
  role: 'PLATFORM_ADMIN',
  schoolId: null, // Platform owner doesn't belong to a single school
  edition: 'elite',
  enabledModules: NAVIGATION_ITEMS.map((item) => item.id),
  isPlatformAdmin: true,
  onboardingCompleted: true,
});

/** Constructs a school director profile from a typed Firestore school document. */
const buildSchoolAdminProfile = (schoolId: string, schoolData: FirestoreSchoolDoc): ResolvedUserProfile => ({
  role: 'ADMIN',
  schoolId,
  edition: schoolData.edition ?? 'starter',
  enabledModules: mergeModules(schoolData.enabledModules ?? [], DEFAULT_ADMIN_MODULES),
  isPlatformAdmin: false,
  onboardingCompleted: schoolData.onboardingCompleted ?? false,
});

/** Constructs a staff profile, resolving edition from the parent school. */
const buildStaffProfile = (
  staffData: FirestoreStaffDoc,
  schoolData: FirestoreSchoolDoc | null
): ResolvedUserProfile => ({
  role: staffData.role,
  schoolId: staffData.schoolId || null,
  edition: schoolData?.edition ?? 'starter',
  enabledModules: mergeModules(schoolData?.enabledModules ?? [], DEFAULT_STAFF_MODULES),
  isPlatformAdmin: false,
  onboardingCompleted: staffData.onboardingCompleted ?? false,
});

/** Waits for a specified number of milliseconds. */
const delay = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolves the role, edition, and enabled modules for a given Firebase user.
 *
 * Uses a strict hierarchical lookup (Platform → School → Staff).
 * Each tier returns immediately without checking lower-priority sources.
 *
 * @param uid - Firebase Auth User UID.
 * @param creationTime - ISO string of account creation time (for new-account retries).
 * @param retryCount - Internal; used for exponential-backoff on new accounts.
 * @returns A fully resolved `ResolvedUserProfile` or `null` if no record found.
 */
export const resolveUserRole = async (
  uid: string,
  creationTime?: string,
  retryCount = 0,
  email?: string | null
): Promise<ResolvedUserProfile | null> => {
  try {
    console.log(`[AuthService] Hierarchical resolution — UID: ${uid} (attempt ${retryCount + 1})`);

    // ── Tier 1: Master Profile (users collection) ─────────────────────────────
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const userData = userSnap.data() as FirestoreUserDoc;
      const rawRole = (userData.role || '').toUpperCase();
      console.log(`[AuthService] Tier 1: Master Profile found. Role: ${rawRole}`);

      if (!rawRole) {
        console.warn(`[AuthService] User document exists for ${uid} but has no role. Continuing to school/staff checks...`);
      } else if (rawRole === 'PLATFORM_ADMIN' || rawRole === 'SUPER_ADMIN') {
        console.log(`[AuthService] RESOLVED → PLATFORM_ADMIN (Master Profile: ${rawRole})`);
        return buildPlatformAdminProfile();
      }

      // 🛡️ Normalize custom role
      const normalizedRole = rawRole as UserRole;
      console.log(`[AuthService] RESOLVED → ${normalizedRole} (Master Profile — custom role)`);
      return {
        role: normalizedRole,
        schoolId: userData.schoolId || null,
        edition: 'starter',
        enabledModules: [...DEFAULT_ADMIN_MODULES],
        isPlatformAdmin: false,
        onboardingCompleted: userData.onboardingCompleted ?? false,
      };
    }

    console.log(`[AuthService] Tier 1: No master profile. Checking Tier 2: School Ownership...`);
    // ── Tier 2: Institution Ownership (schools collection) ───────────────────
    const schoolSnap = await getDoc(doc(db, 'schools', uid));

    if (schoolSnap.exists()) {
      const schoolData = schoolSnap.data() as FirestoreSchoolDoc;
      console.log(`[AuthService] RESOLVED → ADMIN (School: ${schoolData.name})`);
      return buildSchoolAdminProfile(uid, schoolData);
    }

    console.log(`[AuthService] Tier 2: No school profile. Checking Tier 3: Staff Assignment...`);


    // ── Tier 3: Staff Assignment (staff collection) ──────────────────────────
    const staffSnap = await getDoc(doc(db, 'staff', uid));

    let staffData: FirestoreStaffDoc | null = null;

    if (staffSnap.exists()) {
      staffData = staffSnap.data() as FirestoreStaffDoc;
      console.log(`[AuthService] RESOLVED → ${staffData.role} (Staff via UID)`);
    } else if (email) {
      // 🛡️ Fallback: Check for staff document by email (for staff added via Admin/CSV with random IDs)
      const normalizedEmail = email.toLowerCase().trim();
      const qStaff = query(collection(db, 'staff'), where('email', '==', normalizedEmail), limit(1));
      const querySnap = await getDocs(qStaff);
      
      if (!querySnap.empty) {
        staffData = querySnap.docs[0].data() as FirestoreStaffDoc;
        console.log(`[AuthService] RESOLVED → ${staffData.role} (Staff via Email)`);
      }
    }

    if (staffData) {
      // 🛡️ Normalize role to uppercase
      staffData.role = (staffData.role || '').toUpperCase() as UserRole;
      console.log(`[AuthService] Tier 3: Staff found. Role: ${staffData.role}`);

      // Resolve the parent school for edition/module context
      let schoolData: FirestoreSchoolDoc | null = null;
      if (staffData.schoolId) {
        console.log(`[AuthService] Resolving parent school for staff: ${staffData.schoolId}`);
        const parentSnap = await getDoc(doc(db, 'schools', staffData.schoolId));
        if (parentSnap.exists()) {
          schoolData = parentSnap.data() as FirestoreSchoolDoc;
          console.log(`[AuthService] Parent school resolved: ${schoolData.name}`);
        } else {
          console.warn(`[AuthService] Parent school NOT found for staff: ${staffData.schoolId}`);
        }
      }

      return buildStaffProfile(staffData, schoolData);
    }

    // ── Tier 4: No Records Found ─────────────────────────────────────────────
    console.log(`[AuthService] Tier 3: No staff profile found.`);
    // Retry if the account was created recently (Firestore propagation delay)
    const createdAt = creationTime ? new Date(creationTime).getTime() : 0;
    const isNewAccount = Date.now() - createdAt < NEW_ACCOUNT_WINDOW_MS;

    if (isNewAccount && retryCount < ROLE_RETRY_LIMIT) {
      console.warn(`[AuthService] No records found — retrying (${retryCount + 1}/${ROLE_RETRY_LIMIT})…`);
      await delay(ROLE_RETRY_DELAY_MS);
      return resolveUserRole(uid, creationTime, retryCount + 1, email);
    }

    console.error(`[AuthService] FAILED — No profile found for UID: ${uid}`);
    return null;
  } catch (error) {
    console.error('[AuthService] SYSTEM ERROR during role resolution:', error);

    if (retryCount < ROLE_RETRY_LIMIT) {
      await delay(ROLE_RETRY_DELAY_MS);
      return resolveUserRole(uid, creationTime, retryCount + 1, email);
    }

    throw error; // Propagate after exhausting retries
  }
};

/**
 * Signs the current user out and clears any local session storage.
 */
export const signOutUser = async (): Promise<void> => {
  try {
    sessionStorage.clear();
    localStorage.removeItem('isLocked');
    await auth.signOut();
    console.log('[AuthService] User signed out. Session cleared.');
  } catch (error) {
    console.error('[AuthService] Error during sign out:', error);
    // Force clear session even if Firebase sign-out hangs
    sessionStorage.clear();
    window.location.href = '/'; 
  }
};
