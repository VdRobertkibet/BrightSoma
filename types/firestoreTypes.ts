/**
 * @module firestoreTypes
 * @description Typed interfaces for all Firestore document shapes.
 *
 * Purpose: Replaces `Record<string, any>` throughout the codebase.
 * Every Firestore read should be mapped to one of these interfaces immediately.
 * This provides compile-time safety and makes schema changes trackable.
 *
 * Why this matters (Google engineering standard):
 * - Changes to Firestore schema are caught at compile time, not runtime.
 * - `Record<string, any>` silently allows accessing undefined fields.
 * - Typed interfaces serve as living documentation of the database schema.
 */

import { UserRole } from '@/types';
import { EditionType } from '@/services/authService';

// ─── Platform ─────────────────────────────────────────────────────────────────

/** Document in `users/{uid}` — stores global, cross-school roles. */
export interface FirestoreUserDoc {
  role: UserRole;
  schoolId?: string;
  email?: string;
  displayName?: string;
  createdAt?: string;
  onboardingCompleted?: boolean;
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    date: string;
    uploadedBy?: string;
  }>;
}

// ─── Schools (Tenants) ────────────────────────────────────────────────────────

/** Document in `schools/{uid}` — the institution profile and configuration. */
export interface FirestoreSchoolDoc {
  name: string;
  edition?: EditionType;
  enabledModules?: string[];
  motto?: string;
  logo?: string;
  county?: string;
  subCounty?: string;
  type?: 'Public' | 'Private';
  category?: 'Day' | 'Boarding' | 'Mixed';
  registrationNumber?: string;
  paybillNumber?: string;
  principalName?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'suspended' | 'trial';
  paymentStatus?: 'paid' | 'overdue' | 'pending';
  subscriptionExpiry?: string;
  onboardingCompleted?: boolean;
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    date: string;
    uploadedBy?: string;
  }>;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

/** Document in `staff/{uid}` — stores a staff member's role and school affiliation. */
export interface FirestoreStaffDoc {
  role: UserRole;
  schoolId: string;
  name?: string;
  email?: string;
  tscNumber?: string;
  phone?: string;
  department?: string;
  subjects?: string[];
  onboardingCompleted?: boolean;
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    date: string;
    uploadedBy?: string;
  }>;
}

// ─── Students ─────────────────────────────────────────────────────────────────

/** Document in `students/{docId}` — full learner record. */
export interface FirestoreStudentDoc {
  schoolId: string;
  name: string;
  admissionNumber: string;
  grade: string;
  stream: string;
  status?: 'Active' | 'Transferred Out' | 'Transferred In' | 'Completed' | 'Withdrawn';
  gender?: string;
  dateOfBirth?: string;
  boardingType?: 'Day Scholar' | 'Full Boarder' | 'Weekly Boarder';
  parentInfo?: {
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
    emergencyContact?: string;
  };
}

// ─── Finance ──────────────────────────────────────────────────────────────────

/** Document in `payments/{docId}`. */
export interface FirestorePaymentDoc {
  schoolId: string;
  studentId: string;
  amount: number;
  date: string;
  method: 'M-Pesa' | 'Bank' | 'Cash';
  transactionCode?: string;
  term: string;
  year: number;
}

/** Document in `fee_structures/{docId}`. */
export interface FirestoreFeeStructureDoc {
  schoolId: string;
  grade: string;
  category: string;
  amount: number;
  isOptional: boolean;
  appliesTo: 'All' | 'Boarders' | 'Day Scholars';
}
