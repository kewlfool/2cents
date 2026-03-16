import {
  BarChart3,
  FileUp,
  LayoutDashboard,
  Receipt,
  Settings2,
  Sparkles,
  Wallet,
} from "lucide-react";

import type { AppNavItem } from "@/types/navigation";

export const mainNavItems: AppNavItem[] = [
  {
    description: "Current month summary, quick actions, and phase status.",
    href: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
    shortLabel: "Home",
  },
  {
    description:
      "Define the monthly baseline for income, expenses, and savings.",
    href: "/budget-setup",
    icon: Wallet,
    label: "Budget setup",
    shortLabel: "Budget",
  },
  {
    description: "Review budget and statement imports before saving them.",
    href: "/imports",
    icon: FileUp,
    label: "Imports",
    shortLabel: "Imports",
  },
  {
    description: "Search, filter, and correct monthly spending activity.",
    href: "/transactions",
    icon: Receipt,
    label: "Transactions",
    shortLabel: "Ledger",
  },
  {
    description: "Inspect planned versus actual spending and savings by month.",
    href: "/monthly-review",
    icon: BarChart3,
    label: "Monthly review",
    shortLabel: "Review",
  },
  {
    description:
      "Create and test merchant matching rules with explicit priority.",
    href: "/rules",
    icon: Sparkles,
    label: "Rules",
    shortLabel: "Rules",
  },
  {
    description: "Control privacy, exports, and app-level preferences.",
    href: "/settings",
    icon: Settings2,
    label: "Settings",
    shortLabel: "Prefs",
  },
];

export const foundationMilestones = [
  "Validated budget, transaction, import, rules, snapshot, and settings schemas.",
  "Dexie database with repositories for plans, transactions, rules, snapshots, and settings.",
  "Deterministic demo data that seeds the local store exactly once on first launch.",
  "JSON backup and restore services around the browser's IndexedDB data set.",
];
