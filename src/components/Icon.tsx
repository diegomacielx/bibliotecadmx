import { 
  Search, Plus, PlusCircle, Pencil, Trash2, Copy, Check, X, 
  ChevronLeft, ChevronRight, ChevronDown, Loader2, Save, CircleCheck, LogOut, Eye, 
  EyeOff, Download, Cloud, Server, Bell, Users, Settings, Mail, 
  Lightbulb, ListTodo, Play, MoreHorizontal, SlidersHorizontal, LayoutDashboard,
  Heart, Columns2, ListVideo, Pause, Maximize, SkipForward, SkipBack, Clock, GitCompare,
  Moon, Sun, CircleHelp, Inbox, Shield, RotateCw
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  search: Search,
  plus: Plus,
  pluscircle: PlusCircle,
  pencil: Pencil,
  trash: Trash2,
  youtube: Play,
  copy: Copy,
  check: Check,
  x: X,
  left: ChevronLeft,
  right: ChevronRight,
  chevrondown: ChevronDown,
  loader: Loader2,
  save: Save,
  circlecheck: CircleCheck,
  logout: LogOut,
  eye: Eye,
  eyeoff: EyeOff,
  download: Download,
  cloud: Cloud,
  server: Server,
  bell: Bell,
  users: Users,
  settings: Settings,
  mail: Mail,
  lightbulb: Lightbulb,
  listtodo: ListTodo,
  play: Play,
  more: MoreHorizontal,
  filter: SlidersHorizontal,
  dashboard: LayoutDashboard,
  heart: Heart,
  columns: Columns2,
  compare: GitCompare,
  listvideo: ListVideo,
  pause: Pause,
  maximize: Maximize,
  skipforward: SkipForward,
  skipback: SkipBack,
  clock: Clock,
  moon: Moon,
  sun: Sun,
  help: CircleHelp,
  inbox: Inbox,
  shield: Shield,
  replay: RotateCw,
};

interface IconProps {
  name: string;
  className?: string;
  strokeWidth?: number;
  fill?: string;
}

export const Icon = ({ name, className = "w-5 h-5", strokeWidth = 1.5, fill }: IconProps) => {
  const IconComponent = iconMap[name.toLowerCase()];
  
  if (!IconComponent) {
    console.warn(`Ícone "${name}" não encontrado`);
    return null;
  }
  
  return (
    <IconComponent 
      className={className} 
      strokeWidth={strokeWidth}
      fill={fill || "none"}
      style={{ pointerEvents: 'none' }}
    />
  );
};