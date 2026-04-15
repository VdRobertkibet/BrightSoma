/**
 * Unit tests for authService — Role Resolution Logic.
 *
 * Tests follow the AAA pattern (Arrange → Act → Assert).
 * Firebase is mocked to avoid real network calls.
 *
 * Coverage targets:
 * - PLATFORM_ADMIN resolution from users collection
 * - School ADMIN resolution from schools collection
 * - Staff resolution with parent school context
 * - Retry logic for new accounts
 * - Error propagation after retry limit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveUserRole } from '../../services/authService';

// ─── Mock Firebase ────────────────────────────────────────────────────────────

vi.mock('../../src/firebase', () => ({
  db: {},
  auth: { signOut: vi.fn() },
}));

// We mock the firestore module to control document data per test
const mockGetDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_, col, id) => ({ _col: col, _id: id })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a mock Firestore DocumentSnapshot. */
const snap = (exists: boolean, data?: object) => ({
  exists: () => exists,
  data: () => data ?? {},
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('resolveUserRole()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── P0: Platform Admin ──────────────────────────────────────────────────────

  it('TIER 1: resolves PLATFORM_ADMIN from the users collection', async () => {
    // Arrange: users doc has role = PLATFORM_ADMIN, schools/staff don't matter
    mockGetDoc.mockResolvedValueOnce(snap(true, { role: 'PLATFORM_ADMIN' }));

    // Act
    const profile = await resolveUserRole('uid-admin');

    // Assert
    expect(profile).not.toBeNull();
    expect(profile?.role).toBe('PLATFORM_ADMIN');
    expect(profile?.isPlatformAdmin).toBe(true);
    expect(profile?.edition).toBe('elite');
    // Should NOT make more than 1 Firestore call (stop at Tier 1)
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
  });

  // ── P1: School Admin ────────────────────────────────────────────────────────

  it('TIER 2: resolves ADMIN from the schools collection when no users record', async () => {
    // Arrange: no users record → check schools
    mockGetDoc
      .mockResolvedValueOnce(snap(false))                             // users — not found
      .mockResolvedValueOnce(snap(true, {                             // schools — found
        name: 'Sunrise Academy',
        edition: 'professional',
        enabledModules: ['dashboard', 'finance'],
      }));

    const profile = await resolveUserRole('uid-school-admin');

    expect(profile?.role).toBe('ADMIN');
    expect(profile?.edition).toBe('professional');
    expect(profile?.isPlatformAdmin).toBe(false);
    expect(mockGetDoc).toHaveBeenCalledTimes(2);
  });

  // ── P2: Staff ───────────────────────────────────────────────────────────────

  it('TIER 3: resolves TEACHER from the staff collection with school context', async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(false))                             // users — not found
      .mockResolvedValueOnce(snap(false))                             // schools — not found
      .mockResolvedValueOnce(snap(true, {                             // staff — found
        role: 'TEACHER',
        schoolId: 'school-abc',
      }))
      .mockResolvedValueOnce(snap(true, {                             // parent school
        edition: 'elite',
        enabledModules: ['dashboard', 'timetable'],
      }));

    const profile = await resolveUserRole('uid-teacher');

    expect(profile?.role).toBe('TEACHER');
    expect(profile?.edition).toBe('elite');
    expect(profile?.isPlatformAdmin).toBe(false);
    // Dashboard + timetable (from school) + defaults (teacher, communication, health, etc.)
    expect(profile?.enabledModules).toContain('dashboard');
    expect(profile?.enabledModules).toContain('teacher');
  });

  // ── Fallback ────────────────────────────────────────────────────────────────

  it('TIER 4: returns null when no records found for non-new account', async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(false))   // users
      .mockResolvedValueOnce(snap(false))   // schools
      .mockResolvedValueOnce(snap(false));  // staff

    // Use an old creationTime so it doesn't trigger retry logic
    const oldTime = new Date(Date.now() - 60_000).toISOString();
    const profile = await resolveUserRole('uid-ghost', oldTime);

    expect(profile).toBeNull();
    expect(mockGetDoc).toHaveBeenCalledTimes(3);
  });

  // ── Error Handling ──────────────────────────────────────────────────────────

  it('propagates error after exhausting retries', async () => {
    const boom = new Error('Firestore unavailable');
    mockGetDoc.mockRejectedValue(boom);

    await expect(resolveUserRole('uid-error', undefined, 2)).rejects.toThrow(
      'Firestore unavailable'
    );
  });
});
