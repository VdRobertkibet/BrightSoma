import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, School as SchoolIcon, Eye, EyeOff, Loader2, CheckCircle2, Lock, User, Mail, Phone, Building, MapPin, CheckCircle, Sparkles } from 'lucide-react';
import { db, auth } from '../src/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
];

const SCHOOL_TYPES = ['Pre-Primary (ECDE)', 'Primary School', 'Junior Secondary School', 'Secondary School', 'Combined (Primary & Secondary)'];
const SCHOOL_CATEGORIES = ['Public', 'Private', 'Faith-Based / Mission'];

type Edition = 'starter' | 'professional' | 'elite';

interface Module {
  name: string;
  id: string;
  enabled: boolean;
}

interface Props {
  edition: Edition;
  enabledModules: string[];
  allModules: Module[];
  setResolvedProfile: (profile: any) => void;
  onSelectRole: (role: any) => void;
  onBack: () => void;
}

const STEP_LABELS = ['Director Account', 'School Identity', 'Location', 'Module Setup'];

const inputClass = "w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all";
const labelClass = "block text-xs font-semibold text-slate-600 mb-1.5";

const SchoolRegistrationForm: React.FC<Props> = ({ edition, enabledModules, allModules, setResolvedProfile, onSelectRole, onBack }) => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);

  return (
    <div className="max-w-xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Enrollment</h2>
          <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">{edition} Edition</p>
        </div>
      </div>

      <div className="py-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
        <SchoolIcon className="mx-auto text-slate-300 mb-6" size={48} strokeWidth={1.5} />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Registration Flow Restoring...</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">We are bringing back the professional school registration steps. Please stay tuned.</p>
      </div>
    </div>
  );
};

export default SchoolRegistrationForm;