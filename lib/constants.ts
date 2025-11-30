import {
    BarChart3,
    Calendar,
    CheckSquare,
    DollarSign,
    LayoutDashboard,
    PiggyBank,
    Users,
} from 'lucide-react';

export const NO_NAVBAR_PATHS = ['/auth/login', '/auth/register', '/auth/callback'];

export const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Chores',
    href: '/chores',
    icon: CheckSquare,
  },
  {
    name: 'Expenses',
    href: '/expenses',
    icon: DollarSign,
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
  },
  {
    name: 'Penalty Fund',
    href: '/penalty-fund',
    icon: PiggyBank,
  },
  {
    name: 'Household',
    href: '/household',
    icon: Users,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
];
