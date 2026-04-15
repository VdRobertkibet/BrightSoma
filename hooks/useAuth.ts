/**
 * @module useAuth
 * @description Custom React hook for authentication state management.
 *
 * Follows the Separation of Concerns principle:
 * - This hook manages WHEN to fetch auth state.
 * - `authService` manages HOW to resolve roles.
 * - UI components just consume the returned `profile` object.
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../src/firebase';
import { resolveUserRole, signOutUser, ResolvedUserProfile, EditionType } from '../services/authService';
import { UserRole } from '../types';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthState {
  /** The resolved user profile. Null means unauthenticated. */
  profile: ResolvedUserProfile | null;
  /** True while the authentication check is in progress. */
  isLoading: boolean;
  /** The raw Firebase user object. */
  firebaseUser: User | null;
  /** Whether the current session is using mock/demo auth (dev mode). */
  isMockAuth: boolean;
  /** Manually override the role (used for the dev demo switcher). */
  setMockProfile: (profile: ResolvedUserProfile | null) => void;
  /** Sets the profile after a successful login via the landing page. */
  setResolvedProfile: (profile: ResolvedUserProfile) => void;
  /** Signs the user out and resets auth state. */
  logout: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const isDev = import.meta.env.DEV;

function loadDevProfile(): ResolvedUserProfile | null {
  if (!isDev) return null;
  const role = sessionStorage.getItem('mockRole') as UserRole | null;
  const edition = (sessionStorage.getItem('mockEdition') as EditionType | null) ?? 'starter';
  const isMock = sessionStorage.getItem('isMockAuth') === 'true';
  const schoolId = sessionStorage.getItem('mockSchoolId') || 'demo-school-id';
  // Restore the full module list, not just 'dashboard'
  const rawModules = sessionStorage.getItem('mockModules');
  const enabledModules: string[] = rawModules ? JSON.parse(rawModules) : ['dashboard'];
  if (isMock && role) {
    return { role, schoolId, edition, enabledModules, isPlatformAdmin: role === 'PLATFORM_ADMIN', onboardingCompleted: true };
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages authentication state for the application.
 *
 * Returns a single `AuthState` object that encapsulates all auth-related
 * information. Components should destructure only what they need.
 */
export const useAuth = (): AuthState => {
  const [profile, setProfile] = useState<ResolvedUserProfile | null>(() => loadDevProfile());
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockAuth, setIsMockAuth] = useState(() => isDev && sessionStorage.getItem('isMockAuth') === 'true');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        // Not logged in — clear state unless we are in dev mock mode
        if (!isMockAuth) setProfile(null);
        setIsLoading(false);
        return;
      }

      // If we already have a confirmed profile for this user, skip re-fetch
      // This prevents the auth listener from overwriting a profile set by the login handler
      if (profile && profile.role) {
        console.log('[useAuth] Profile already resolved, skipping re-fetch.');
        setIsLoading(false);
        return;
      }

      let keepLoading = false;
      
      // Prevent blocking UI and unmounting LandingPage for anonymous users
      // (staff logging in with access code)
      if (!user.isAnonymous) {
        setIsLoading(true);
      }
      
      try {
        const resolved = await resolveUserRole(user.uid, user.metadata.creationTime, 0, user.email);
        if (resolved) {
          setProfile(resolved);
          setIsMockAuth(false);
        } else {
          // ─── Staff Login Fix ──────────────────────────────────────────────
          if (user.isAnonymous) {
            console.warn('[useAuth] Anonymous user found but no record yet. This is expected during LandingPage linking.');
            // Crucial: ensure loading is false so LandingPage doesn't unmount
            setIsLoading(false); 
            return;
          }

          toast.error('Your account is not configured. Contact a platform administrator.');
          await signOutUser();
          setProfile(null);
        }
      } catch {
        toast.error('Cloud connectivity error. Please refresh the page.');
      } finally {
        // Only set loading false if we aren't in a special exclusion case
        if (!user.isAnonymous) {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const setMockProfile = (p: ResolvedUserProfile | null) => {
    setProfile(p);
    setIsMockAuth(p !== null);
    if (isDev) {
      if (p) {
        sessionStorage.setItem('mockRole', p.role);
        sessionStorage.setItem('mockEdition', p.edition);
        sessionStorage.setItem('isMockAuth', 'true');
        // Persist the full module list so session restore works correctly
        sessionStorage.setItem('mockModules', JSON.stringify(p.enabledModules));
      } else {
        sessionStorage.clear();
      }
    }
  };

  const setResolvedProfile = (p: ResolvedUserProfile) => {
    setProfile(p);
    setIsMockAuth(false);
    setIsLoading(false);
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOutUser();
      setProfile(null);
      setIsMockAuth(false);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { profile, isLoading, firebaseUser, isMockAuth, setMockProfile, setResolvedProfile, logout };
};
