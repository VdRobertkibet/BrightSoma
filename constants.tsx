
import React from 'react';
import { 
  LayoutDashboard,
  Calendar, 
  Wallet, 
  Users, 
  BookOpen, 
  Package, 
  Home, 
  School,
  Bus,
  Navigation,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  HeartPulse,
  Landmark,
  Briefcase,
  GraduationCap
} from 'lucide-react';

import { CBCGrade, PerformanceLevel } from './types';

export const ACADEMIC_PERIODS = ['Term 1 2026', 'Term 2 2026', 'Term 3 2026'];

/** BrightSoma brand color palette. These are the primary accent colors used throughout the platform. */
export const BRAND_COLORS = {
  primary: '#f97316',    // Orange 500 — main brand accent
  dark:    '#ea580c',    // Orange 600 — hover/active states
  black:   '#000000',   // True black
  white:   '#FFFFFF',   // White
} as const;

export const KENYA_COLORS = {
  red: '#922417',
  green: '#00662e',
  black: '#000000',
  white: '#ffffff'
} as const;

export const CBC_GRADES = Object.values(CBCGrade);

export const PERFORMANCE_LEVELS: { level: PerformanceLevel; label: string; color: string }[] = [
  { level: 'EE', label: 'Exceeds Expectation', color: '#ea580c' }, // orange-600
  { level: 'ME', label: 'Meets Expectation', color: '#f97316' },   // orange-500
  { level: 'AE', label: 'Approaching Expectation', color: '#fb923c' }, // orange-400
  { level: 'BE', label: 'Below Expectation', color: '#fdba74' }, // orange-300
];

export const LOWER_PRIMARY_LEARNING_AREAS = [
  'Literacy Activities',
  'Kiswahili Language Activities',
  'Mathematical Activities',
  'Environmental Activities',
  'Creative Arts & Crafts',
  'Music & Movement Activities',
  'Religious Education',
  'Physical & Health Education'
];

export const JUNIOR_SECONDARY_LEARNING_AREAS = [
  'English',
  'Kiswahili',
  'Mathematics',
  'Integrated Science',
  'Social Studies',
  'Creative Arts & Sports',
  'Pre-Technical Studies',
  'Agriculture & Nutrition',
  'Religious Education',
  'Life Skills'
];

export const FEE_CATEGORIES = [
  'Tuition Fee',
  'Activity Fee',
  'Boarding Fee',
  'Uniform Fee',
  'Books/Stationery Levy',
  'Examination Fee',
  'Transport Fee',
  'ICT Levy'
];

export const NAVIGATION_ITEMS = [
  { id: 'platform-admin', label: 'Platform management', icon: <ShieldCheck size={20} />, roles: ['PLATFORM_ADMIN', 'SUPER_ADMIN'] },
  { id: 'dashboard', label: 'School dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
  { id: 'teacher', label: 'Teachers portal', icon: <LayoutDashboard size={20} />, roles: ['TEACHER'] },
  { id: 'students', label: 'Learners & classes', icon: <Users size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'TEACHER'] },
  { id: 'timetable', label: 'Timetable', icon: <Calendar size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'TEACHER'] },
  { id: 'finance', label: 'Finance & payments', icon: <Wallet size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'FINANCE', 'TEACHER'] },
  { id: 'bank', label: 'Bank accounts', icon: <Landmark size={20} />, roles: ['ADMIN', 'DIRECTOR', 'FINANCE'] },
  { id: 'academics', label: 'CBC assessments', icon: <BookOpen size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'TEACHER'] },
  { id: 'boarding', label: 'Boarding', icon: <Home size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
  { id: 'transport', label: 'Transport', icon: <Bus size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'PLATFORM_ADMIN', 'SUPER_ADMIN'] },
  { id: 'finance-analytics', label: 'Finance analytics', icon: <Wallet size={20} />, roles: ['PLATFORM_ADMIN', 'SUPER_ADMIN'] },
  { id: 'communication', label: 'Communication', icon: <MessageSquare size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL', 'TEACHER', 'PLATFORM_ADMIN', 'SUPER_ADMIN'] },
  { id: 'health', label: "Students' health", icon: <HeartPulse size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
  { id: 'inventory', label: 'Inventory', icon: <Package size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
  { id: 'admin', label: 'Staff management', icon: <GraduationCap size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
  { id: 'events', label: 'Events', icon: <Calendar size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
  { id: 'assets', label: 'Assets', icon: <Briefcase size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
  { id: 'profile', label: 'School profile', icon: <School size={20} />, roles: ['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'] },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const PERIODS = [
  { time: '07:00', label: 'Period 1', type: 'academic' },
  { time: '08:00', label: 'Period 2', type: 'academic' },
  { time: '08:35', label: 'Period 3', type: 'academic' },
  { time: '09:10', label: 'Period 4', type: 'academic' },
  { time: '09:45', label: 'Period 5', type: 'academic' },
  { time: '10:20', label: 'Period 6', type: 'academic' },
  { time: '10:50', label: 'Period 7', type: 'academic' },
  { time: '11:25', label: 'Period 8', type: 'academic' },
  { time: '12:00', label: 'Period 9', type: 'academic' },
  { time: '12:35', label: 'Period 10', type: 'academic' },
  { time: '13:10', label: 'Period 11', type: 'academic' },
  { time: '14:10', label: 'Period 12', type: 'academic' },
  { time: '14:45', label: 'Period 13', type: 'academic' },
  { time: '15:20', label: 'Period 14', type: 'academic' },
  { time: '16:30', label: 'Period 15', type: 'academic' },
];

export const SUBJECTS = [
  ...LOWER_PRIMARY_LEARNING_AREAS,
  ...JUNIOR_SECONDARY_LEARNING_AREAS,
  'Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE', 'IRE', 'HRE', 'Creative Arts', 'Physical Education', 'Special Needs Education'
];

export const CONTRACT_TYPES = [
  'Permanent & Pensionable',
  'Contract: 1 Year',
  'Contract: 2 Years',
  'Contract: 3 Years',
  'Part-time / Locum',
  'Probation',
  'Internship'
];

export const EDITION_MODULES = {
  starter:      ['dashboard', 'students', 'class-management', 'academics', 'finance', 'attendance-register', 'profile', 'admin', 'teacher', 'assets'],
  professional: ['dashboard', 'students', 'class-management', 'academics', 'finance', 'attendance-register', 'profile', 'admin', 'teacher', 'assets', 'bank', 'timetable', 'communication', 'health', 'events'],
  elite:        ['dashboard', 'students', 'class-management', 'academics', 'finance', 'attendance-register', 'profile', 'admin', 'teacher', 'assets', 'bank', 'timetable', 'communication', 'health', 'events', 'boarding', 'mpesa', 'transport', 'inventory'],
} as const;
