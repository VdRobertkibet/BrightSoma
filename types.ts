
export type PerformanceLevel = 'EE' | 'ME' | 'AE' | 'BE';

export enum CBCGrade {
  PP1 = 'PP1',
  PP2 = 'PP2',
  G1 = 'Grade 1',
  G2 = 'Grade 2',
  G3 = 'Grade 3',
  G4 = 'Grade 4',
  G5 = 'Grade 5',
  G6 = 'Grade 6',
  G7 = 'Grade 7',
  G8 = 'Grade 8',
  G9 = 'Grade 9'
}

export type BoardingType = 'Day Scholar' | 'Full Boarder' | 'Weekly Boarder';

export type StudentStatus = 'Active' | 'Transferred Out' | 'Transferred In' | 'Completed' | 'Withdrawn';

export interface ParentInfo {
  fatherName: string;
  fatherPhone: string;
  fatherId?: string;
  motherName: string;
  motherPhone: string;
  motherId?: string;
  guardianName?: string;
  guardianPhone?: string;
  emergencyContact: string;
}

export interface MedicalInfo {
  bloodGroup: string;
  allergies: string;
  conditions: string;
  specialNeeds?: string;
  medication?: string;
}

export interface TransportInfo {
  required: boolean;
  route?: string;
  pickupPoint?: string;
  busNumber?: string;
}

export interface Student {
  id: string;
  schoolId: string;
  admissionNumber: string;
  nemisNumber?: string;
  birthCertificateNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  name: string;
  grade: CBCGrade;
  stream: string;
  boardingType: BoardingType;
  dateOfAdmission?: string;
  status: StudentStatus;
  parentInfo: ParentInfo;
  medicalInfo: MedicalInfo;
  transport?: TransportInfo;
  adminNotes?: string;
  files?: Record<string, string>;
  performance: number; // For dashboard stats, though we use rubrics for reports
  balance: number;
  pocketMoneyBalance?: number;
  dormitoryId?: string;
  parentPhone?: string;
  learningArea?: string;
  createdAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  tscNumber?: string;
  department: string;
  subjects: string[];
  load: number;
  teachingUnitsPerWeek: number;
  assignedGrade?: CBCGrade;
  assignedStream?: string;
  classroomAccessCode?: string;
}

export type FeeCategory = string;

export type PaymentMethod = 'M-Pesa' | 'Bank' | 'Cash';

export interface Payment {
  id: string;
  schoolId: string;
  studentId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  transactionCode?: string; // M-Pesa code
  phoneNumber?: string;
  term: string;
  year: number;
  etimsStatus?: 'Pending' | 'Success' | 'Failed';
  etimsInvoiceNumber?: string;
  admissionNumber?: string;
  adm?: string;
  code?: string;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  grade: CBCGrade | 'All';
  category: FeeCategory;
  amount: number;
  isOptional: boolean;
  appliesTo: 'All' | 'Boarders' | 'Day Scholars';
}

export interface Term {
  id: string;
  name: 'Term 1' | 'Term 2' | 'Term 3';
  startDate: string;
  endDate: string;
  year: number;
  closingDate: string;
}

export interface Assessment {
  id: string;
  schoolId: string;
  studentId: string;
  teacherId?: string;
  learningArea: string;
  strand: string;
  level: PerformanceLevel;
  score?: number;
  term: string;
  year: number;
  remarks: string;
}

export interface Dormitory {
  id: string;
  schoolId: string;
  name: string;
  gender: 'M' | 'F';
  capacity: number;
  currentOccupancy: number;
  matronPatron: string;
  studentIds: string[];
}

export interface Exeat {
  id: string;
  schoolId: string;
  studentId: string;
  requestDate: string;
  leaveDate: string;
  returnDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Declined';
}

export interface SchoolProfile {
  id: string;
  name: string;
  motto: string;
  logo?: string;
  county: string;
  subCounty: string;
  type: 'Public' | 'Private';
  category: 'Day' | 'Boarding' | 'Mixed';
  registrationNumber: string;
  paybillNumber: string;
  directorName: string;
  email: string;
  phone: string;
  grades?: string[];
  streams?: string[];
  codeValidityDays?: number;
  onboardingCompleted?: boolean;
  documents?: any[];
  edition?: 'starter' | 'professional' | 'elite';
  status?: string;
  paymentStatus?: string;
  enabledModules?: string[];
}

export interface PocketMoneyTransaction {
  id: string;
  schoolId: string;
  studentId: string;
  amount: number;
  type: 'Deposit' | 'Withdrawal';
  reason: string;
  date: string;
  balanceAfter: number;
}

export interface MealPlan {
  id: string;
  schoolId: string;
  day: string;
  breakfast: string;
  lunch: string;
  supper: string;
}

export interface InventoryItem {
  id: string;
  schoolId: string;
  name: string;
  category: string;
  quantity: number;
  lowStockThreshold: number;
  condition: 'New' | 'Fair' | 'Old';
}

export interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  subject: string;
  teacher: string;
  grade: string;
  stream: string;
  department: string;
  term: string;
  month: string;
  isConflict?: boolean;
  conflictDetails?: string | null;
}

export interface Expense {
  id: string;
  schoolId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  receiptUrl?: string;
}

export type TransitEventType = 
  | 'boarded_morning' 
  | 'arrived_school' 
  | 'marked_present'
  | 'boarded_evening' 
  | 'arrived_home';

export interface TransitLog {
  id: string;
  schoolId: string;
  studentId: string;
  driverId?: string;
  routeId?: string;
  eventType: TransitEventType;
  timestamp: any; // serverTimestamp
  location?: { lat: number; lng: number };
  parentConfirmed: boolean;
  confirmationTimestamp?: any;
}

export interface Driver {
  id: string;
  schoolId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: 'Active' | 'Inactive';
}

export interface Vehicle {
  id: string;
  schoolId: string;
  plateNumber: string;
  model: string;
  capacity: number;
  status: 'Active' | 'Maintenance' | 'Inactive';
}

export interface Route {
  id: string;
  schoolId: string;
  name: string;
  driverId: string;
  vehicleId: string;
  stops: string[];
  studentIds: string[];
}

export interface Notification {
  id: string;
  schoolId: string;
  userId: string; // Parent's user ID or Student's ID linked to parent
  title: string;
  message: string;
  type: 'Transit' | 'Attendance' | 'Finance' | 'General';
  status: 'Unread' | 'Read';
  timestamp: any;
}

export interface Attendance {
  id: string;
  schoolId: string;
  studentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  recordedBy: string;
  timestamp: any;
}

export type UserRole = 'ADMIN' | 'DIRECTOR' | 'HEADTEACHER' | 'TEACHER' | 'DRIVER' | 'CONDUCTOR' | 'PARENT' | 'FINANCE' | 'PLATFORM_ADMIN' | 'SUPER_ADMIN' | string;
