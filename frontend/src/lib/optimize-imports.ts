// Optimized imports for commonly used heavy libraries

import type { Variants } from 'framer-motion';
import React from 'react';

// Date utilities - re-export from our centralized date module
export { 
  format,
  formatDistanceToNow,
  formatDate,
  formatDateTime,
  formatTime,
  formatISO,
  addDays,
  addMonths,
  addHours,
  subDays,
  subMonths,
  subYears,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore,
} from '@/lib/date';

// Lodash utilities - use specific imports
export {
  debounce,
  throttle,
  groupBy,
  orderBy,
  uniqBy,
  chunk,
  isEmpty,
  isEqual,
  merge,
  cloneDeep,
} from 'lodash-es'; // Use ES modules version for better tree-shaking

// Icons - create a central export for commonly used icons
export {
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Plus,
  Minus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  User,
  Users,
  Building,
  FileText,
  AlertCircle,
  Info,
  Settings,
  Menu,
  Home,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  RefreshCw,
  Loader2,
  Save,
  Send,
  Archive,
  Inbox,
  Mail,
  Phone,
  MapPin,
  Globe,
  Shield,
  Lock,
  Unlock,
  Key,
  Database,
  Server,
  Cloud,
  Zap,
  Bell,
  BellOff,
  Star,
  Heart,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

// Chart components - use specific imports
export {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ComposedChart,
  RadarChart,
  Radar,
  RadialBarChart,
  RadialBar,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
  ReferenceArea,
  Brush,
} from 'recharts';

// Animation utilities
export {
  motion,
  AnimatePresence,
  useAnimation,
  useInView,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useVelocity,
  useAnimationControls,
  type Variants,
  type Variant,
  type TargetAndTransition,
} from 'framer-motion';

// Common animation variants
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const slideInVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

export const scaleInVariants: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Utility to lazy load heavy components only when needed
export const lazyWithRetry = <T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
) => {
  return React.lazy(async () => {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  });
};