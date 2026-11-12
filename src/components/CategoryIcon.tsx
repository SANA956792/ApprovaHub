import React from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Cpu,
  CreditCard,
  FileText,
  FolderKanban,
  Globe,
  HeartPulse,
  IndianRupee,
  Laptop,
  LogOut,
  Megaphone,
  Package,
  PenTool,
  Plane,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';

export const AVAILABLE_CATEGORY_ICONS = [
  'Receipt',
  'Laptop',
  'Cpu',
  'PenTool',
  'Calendar',
  'HeartPulse',
  'Clock',
  'Megaphone',
  'Wrench',
  'Plane',
  'LogOut',
  'TrendingUp',
  'IndianRupee',
  'Briefcase',
  'Building2',
  'CreditCard',
  'Package',
  'Truck',
  'ShoppingBag',
  'Globe',
  'ShieldCheck',
  'FolderKanban',
  'Users',
  'FileText',
];

interface CategoryIconProps {
  name: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  className = 'w-5 h-5',
}) => {
  switch (name) {
    case 'Receipt':
      return <Receipt className={className} />;
    case 'Laptop':
      return <Laptop className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'PenTool':
      return <PenTool className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'Megaphone':
      return <Megaphone className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Plane':
      return <Plane className={className} />;
    case 'LogOut':
      return <LogOut className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'IndianRupee':
      return <IndianRupee className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'CreditCard':
      return <CreditCard className={className} />;
    case 'Package':
      return <Package className={className} />;
    case 'Truck':
      return <Truck className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'FolderKanban':
      return <FolderKanban className={className} />;
    case 'Users':
      return <Users className={className} />;
    default:
      return <FileText className={className} />;
  }
};

export function getCategoryTint(indexOrName: number | string) {
  const palettes = [
    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    'bg-sky-500/15 text-sky-400 border-sky-500/25',
    'bg-amber-500/15 text-amber-400 border-amber-500/25',
    'bg-violet-500/15 text-violet-400 border-violet-500/25',
    'bg-rose-500/15 text-rose-400 border-rose-500/25',
    'bg-teal-500/15 text-teal-400 border-teal-500/25',
  ];
  const idx =
    typeof indexOrName === 'number'
      ? indexOrName
      : indexOrName
          .split('')
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palettes[Math.abs(idx) % palettes.length];
}
