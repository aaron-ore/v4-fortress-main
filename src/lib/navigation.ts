import {
  LayoutDashboard,
  Package,
  Receipt,
  Truck,
  BarChart,
  Warehouse,
  Search,
  PackagePlus,
  ShoppingCart,
  ListOrdered,
  Repeat,
  CheckCircle,
  Undo2,
  Scan,
  AlertTriangle,
  MapPin,
  User,
  Settings as SettingsIcon,
  Bell,
  DollarSign,
  Users as UsersIcon,
  HelpCircle,
  Sparkles,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  UserRound,
  Plug,
  Zap, // NEW: Import Zap icon for Automation
  // Layout, // REMOVED: Import Layout icon for Floor Plan
} from "lucide-react";
import React from "react";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isParent?: boolean;
  children?: NavItem[];
  adminOnly?: boolean;
  mobileOnly?: boolean;
  action?: () => void; // NEW: Add optional action property
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Reports", href: "/reports", icon: BarChart }, // Moved Reports here
  { title: "Inventory", href: "/inventory", icon: Package },
  { title: "Orders", href: "/orders", icon: Receipt },
  { title: "Customers", href: "/customers", icon: UserRound },
  { title: "Vendors", href: "/vendors", icon: Truck },
  { title: "Locations", href: "/locations", icon: MapPin },
  // { title: "Floor Plan", href: "/floor-plan", icon: Layout }, // REMOVED: Add Floor Plan NavItem
  { title: "Integrations", href: "/integrations", icon: Plug },
  { title: "Automation", href: "/automation", icon: Zap, adminOnly: true }, // NEW: Automation NavItem
  {
    title: "Warehouse Operations",
    href: "/warehouse-operations",
    icon: Warehouse,
    isParent: true,
    children: [
      { title: "Dashboard", href: "/warehouse-operations#dashboard", icon: LayoutDashboard },
      { title: "Item Lookup", href: "/warehouse-operations#item-lookup", icon: Search },
      { title: "Receive Inventory", href: "/warehouse-operations#receive-inventory", icon: PackagePlus },
      { title: "Fulfill Order", href: "/warehouse-operations#fulfill-order", icon: ShoppingCart },
      { title: "Ship Order", href: "/warehouse-operations#ship-order", icon: Truck },
      { title: "Picking Wave", href: "/warehouse-operations#picking-wave", icon: ListOrdered },
      { title: "Replenishment", href: "/warehouse-operations#replenishment", icon: Repeat },
      { title: "Shipping Verify", href: "/warehouse-operations#shipping-verify", icon: CheckCircle },
      { title: "Returns Process", href: "/warehouse-operations#returns-process", icon: Undo2 },
      { title: "Stock Transfer", href: "/warehouse-operations#stock-transfer", icon: Scan },
      { title: "Cycle Count", href: "/warehouse-operations#cycle-count", icon: CheckCircle },
      { title: "Issue Report", href: "/warehouse-operations#issue-report", icon: AlertTriangle },
    ],
  },
];

export const userAndSettingsNavItems: NavItem[] = [
  { title: "My Profile", href: "/profile", icon: User },
  { title: "Account Settings", href: "/account-settings", icon: SettingsIcon },
  { title: "Notifications", href: "/notifications-page", icon: Bell },
  { title: "Billing & Subscriptions", href: "/billing", icon: DollarSign },
  { title: "Users", href: "/users", icon: UsersIcon, adminOnly: true },
  { title: "Company Settings", href: "/settings", icon: SettingsIcon },
];

export const supportAndResourcesNavItems: NavItem[] = [
  { title: "Help Center", href: "/help", icon: HelpCircle },
  { title: "What's New?", href: "/whats-new", icon: Sparkles },
  { title: "Setup Instructions", href: "/setup-instructions", icon: BookOpen },
];