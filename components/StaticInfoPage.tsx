
import React from 'react';
import { 
  X, 
  ArrowLeft, 
  Shield, 
  Users, 
  Target, 
  Heart, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  MessageSquare,
  ChevronRight,
  Brain,
  Coffee,
  Sparkles,
  Stethoscope,
  Apple,
  Venus
} from 'lucide-react';
import { motion } from 'motion/react';

interface StaticInfoPageProps {
  pageId: string;
  onClose: () => void;
  isDarkMode: boolean;
}

const StaticInfoPage: React.FC<StaticInfoPageProps> = ({ pageId, onClose, isDarkMode }) => {
  const content: Record<string, {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    sections: {
      title: string;
      text: string;
      icon?: React.ReactNode;
      custom?: React.ReactNode;
    }[];
  }> = {
    'about-us': {
      title: 'About BrightSoma',
      subtitle: 'Modernizing Education in Kenya',
      icon: <Target className="text-orange-500" size={32} />,
      sections: [
        {
          title: 'Our Vision',
          text: 'To become the digital backbone of every school in Kenya, facilitating a seamless transition to the Competency-Based Curriculum (CBC) while empowering educators with data-driven insights.',
          icon: <Sparkles size={20} />
        },
        {
          title: 'Our Mission',
          text: 'We build intuitive, robust, and localized software solutions that handle the complexities of school management, from finance to CBC assessments, allowing schools to focus on what truly matters: the learners.',
          icon: <Brain size={20} />
        },
        {
          title: 'Core Values',
          text: 'Innovation, Integrity, and Impact. We believe in building technology that creates a tangible difference in the lives of teachers, parents, and students.',
          icon: <Heart size={20} />
        }
      ]
    },
    'careers': {
      title: 'Join the BrightSoma Team',
      subtitle: 'Help Us Shape the Future of African EdTech',
      icon: <Users className="text-orange-500" size={32} />,
      sections: [
        {
          title: 'Why Work With Us?',
          text: 'We are a fast-growing team of passionate developers, educators, and innovators. At BrightSoma, you will work on challenges that directly impact the education landscape in Kenya and beyond.',
          icon: <Coffee size={20} />
        },
        {
          title: 'Open Roles',
          text: 'We are always looking for Full-stack Developers, UI/UX Designers, and Educational Consultants. Even if we don\'t have a role listed, email us if you think you fit the mission!',
          custom: (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/50 flex items-center justify-between">
                <span className="font-bold text-sm">Full-stack React/Firebase Engineer</span>
                <span className="text-[10px] font-bold px-2 py-1 bg-orange-500 text-white rounded-full uppercase">Remote</span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm">Educational Subject Specialist (CBC)</span>
                <span className="text-[10px] font-bold px-2 py-1 bg-slate-400 text-white rounded-full uppercase">Contract</span>
              </div>
              <p className="text-xs text-slate-500 mt-4 italic text-center">Send your CV to careers@brightsoma.co.ke</p>
            </div>
          )
        }
      ]
    },
    'contact-support': {
      title: 'Get in Touch',
      subtitle: 'We are here to support your school 24/7',
      icon: <MessageSquare className="text-orange-500" size={32} />,
      sections: [
        {
          title: 'Direct Support',
          text: 'Our specialized support team is ready to assist you with any technical or administrative questions.',
          custom: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <a href="https://wa.me/254757956643" target="_blank" rel="noopener noreferrer" className="p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30 flex flex-col items-center gap-3 hover:scale-105 transition-transform group">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <Phone size={24} />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">+254 757 956 643</span>
                <span className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">WhatsApp Call/Chat</span>
              </a>
              <a href="mailto:BrightSoma@gmail.com" className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col items-center gap-3 hover:scale-105 transition-transform group">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  <Mail size={24} />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">BrightSoma@gmail.com</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Email Support</span>
              </a>
            </div>
          )
        },
        {
          title: 'Our Office',
          text: 'Nairobi, Kenya',
          icon: <MapPin size={20} />
        }
      ]
    },
    'partner-program': {
      title: 'Partner with BrightSoma',
      subtitle: 'Beyond ERP: Holistic Education & Health Initiatives',
      icon: <Heart className="text-rose-500" size={32} />,
      sections: [
        {
          title: 'Educational Integration',
          text: 'We partner with publishers and educational content creators to bring the best digital materials directly into the classroom through our portal.',
          icon: <Globe size={20} />
        },
        {
          title: 'Health & Nutrition Initiative',
          text: 'In collaboration with health experts, we provide "Health Education in Food and Nutrition" modules. These help schools track learner wellness and educate families on balanced diets using CBC-aligned metrics.',
          icon: <Apple className="text-green-500" size={24} />
        },
        {
          title: "Girls' Health & Empowerment",
          text: 'A core pillar of our mission. We provide digital resources and tracking for Girls\' Health, including period tracking, hygiene education, and empowerment workshops to ensure no girl misses school due to healthcare barriers.',
          icon: <Venus className="text-rose-400" size={24} />
        }
      ]
    },
    'privacy-policy': {
      title: 'Privacy Policy',
      subtitle: 'Your Data Security is Our Top Priority',
      icon: <Shield className="text-orange-500" size={32} />,
      sections: [
        {
          title: 'Data Collection',
          text: 'We collect data necessary only for providing our ERP services. This includes school records, grades, and administrative data. We never sell your data to third parties.'
        },
        {
          title: 'Security',
          text: 'All data is encrypted in transit and at rest using industry-standard protocols. We utilize Firebase and GCP infrastructure to ensure 99.9% uptime and security.'
        },
        {
          title: 'Your Rights',
          text: 'Schools retain full ownership of their data. You can request data exports or deletion at any time in compliance with Kenyan Data Protection Laws.'
        }
      ]
    },
    'terms-of-service': {
      title: 'Terms of Service',
      subtitle: 'Service Agreement for BrightSoma ERP',
      icon: <FileText className="text-orange-500" size={32} />,
      sections: [
        {
          title: 'Usage License',
          text: 'We grant schools a non-exclusive, non-transferable license to use our platform based on their selected edition (Starter, Standard, or Plus).'
        },
        {
          title: 'Responsibilities',
          text: 'Schools are responsible for the accuracy of data entered. BrightSoma provides the tools but the school remains the primary custodian of educational records.'
        },
        {
          title: 'Subscription',
          text: 'Service is provided on a subscription basis. Failure to renew may lead to interrupted access, though data will be preserved for a grace period.'
        }
      ]
    }
  };

  const activeContent = content[pageId as keyof typeof content] || content['about-us'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed inset-0 z-[100] flex flex-col overflow-y-auto ${isDarkMode ? 'bg-[#0a0f1a]' : 'bg-slate-50'}`}
    >
      {/* Header Bar */}
      <div className="sticky top-0 z-10 w-full px-6 py-4 flex items-center justify-between bg-white/80 dark:bg-[#0a0f1a]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </button>
        <button 
          onClick={onClose}
          className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-rose-500 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Hero Section */}
      <div className="w-full max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-500/10 border border-orange-200 dark:border-orange-800/50">
          {activeContent.icon}
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
          {activeContent.title}
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
          {activeContent.subtitle}
        </p>
      </div>

      {/* Content Sections */}
      <div className="w-full max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 gap-12">
          {activeContent.sections.map((section, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none"
            >
              <div className="flex items-start gap-4 mb-4">
                {section.icon && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 dark:text-orange-400 mt-1">
                    {section.icon}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {section.title}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {section.text}
                  </p>
                </div>
              </div>
              {section.custom && section.custom}
            </motion.div>
          ))}
        </div>

        {/* Footer in viewer */}
        <div className="mt-20 pt-12 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-400 mb-8 italic">Trust, Innovation, and Excellence in Kenyan Education</p>
          <div className="flex justify-center gap-6">
             <button onClick={onClose} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all">
                Got it, take me back
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Placeholder icons for imports if they are missing in library but likely they exist in Lucide
const FileText = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
);

export default StaticInfoPage;
