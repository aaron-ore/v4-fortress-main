import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Package,
  Receipt,
  Truck,
  LayoutDashboard, // For Dashboard
  BarChart, // For Reports
  Settings as SettingsIcon, // For Settings, Account Settings
  Users as UsersIcon, // For Users
  HelpCircle, // For Help Center
  DollarSign, // For Billing
  Sparkles, // For What's New
  BookOpen, // For Setup Instructions
  User, // For My Profile
  Bell, // For Notifications
  FileText, // Generic for other app pages
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";
import { useOrders } from "@/context/OrdersContext";
import { useVendors } from "@/context/VendorContext";
import { useProfile } from "@/context/ProfileContext"; // Import useProfile
import { ScrollArea } from "@/components/ui/scroll-area";

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'inventory' | 'order' | 'vendor' | 'app-page';
  id: string;
  name: string;
  description?: string;
  status?: string;
  customerSupplier?: string;
  contactPerson?: string;
  path?: string; // Added path for app pages
}

// Define a static list of app pages for search
const appPages = [
  { id: 'dashboard', name: 'Dashboard', description: 'Overview of your inventory and orders', path: '/' },
  { id: 'inventory', name: 'Inventory', description: 'Manage all your stock items', path: '/inventory' },
  { id: 'orders', name: 'Orders', description: 'Track sales and purchase orders', path: '/orders' },
  { id: 'vendors', name: 'Vendors', description: 'Manage your suppliers and business partners', path: '/vendors' },
  { id: 'reports', name: 'Reports', description: 'Generate analytics and insights', path: '/reports' },
  { id: 'settings', name: 'Company Settings', description: 'Configure company profile and defaults', path: '/settings' },
  { id: 'profile', name: 'My Profile', description: 'View and update your personal profile', path: '/profile' },
  { id: 'account-settings', name: 'Account Settings', description: 'Manage account preferences and security', path: '/account-settings' },
  { id: 'notifications-page', name: 'Notifications', description: 'View all application alerts and updates', path: '/notifications-page' },
  { id: 'billing', name: 'Billing & Subscriptions', description: 'Manage your plan and invoices', path: '/billing' },
  { id: 'help', name: 'Help Center', description: 'Find answers and support articles', path: '/help' },
  { id: 'whats-new', name: 'What\'s New', description: 'See recent features and updates', path: '/whats-new' },
  { id: 'users', name: 'User Management', description: 'Admin: Manage user accounts and roles', path: '/users' },
  { id: 'setup-instructions', name: 'Setup Instructions', description: 'Guide to setting up Fortress', path: '/setup-instructions' },
];

const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { inventoryItems } = useInventory();
  const { orders } = useOrders();
  const { vendors } = useVendors();
  const { profile } = useProfile(); // Use profile to check user role
  const navigate = useNavigate(); // Initialize useNavigate

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to debounce the search
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // 300ms debounce delay

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm, inventoryItems, orders, vendors, profile]); // Re-run effect if data or profile changes

  // Reset search term and results when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSearchResults([]);
    }
  }, [isOpen]);

  const performSearch = (term: string) => {
    const lowerCaseSearchTerm = term.trim().toLowerCase();
    const results: SearchResult[] = [];

    // Search Inventory Items
    inventoryItems.forEach(item => {
      if (
        item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.description.toLowerCase().includes(lowerCaseSearchTerm)
      ) {
        results.push({
          type: 'inventory',
          id: item.id,
          name: item.name,
          description: item.sku,
        });
      }
    });

    // Search Orders
    orders.forEach(order => {
      if (
        order.id.toLowerCase().includes(lowerCaseSearchTerm) ||
        order.customerSupplier.toLowerCase().includes(lowerCaseSearchTerm) ||
        order.notes.toLowerCase().includes(lowerCaseSearchTerm)
      ) {
        results.push({
          type: 'order',
          id: order.id,
          name: `${order.type} Order`,
          status: order.status,
          customerSupplier: order.customerSupplier,
        });
      }
    });

    // Search Vendors
    vendors.forEach(vendor => {
      if (
        vendor.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (vendor.contactPerson && vendor.contactPerson.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (vendor.email && vendor.email.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (vendor.phone && vendor.phone.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (vendor.address && vendor.address.toLowerCase().includes(lowerCaseSearchTerm))
      ) {
        results.push({
          type: 'vendor',
          id: vendor.id,
          name: vendor.name,
          contactPerson: vendor.contactPerson,
        });
      }
    });

    // Search App Pages
    appPages.forEach(page => {
      // Only include 'users' page if the current user is an admin
      if (page.id === 'users' && profile?.role !== 'admin') {
        return;
      }
      if (
        page.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        page.description.toLowerCase().includes(lowerCaseSearchTerm)
      ) {
        results.push({
          type: 'app-page',
          id: page.id,
          name: page.name,
          description: page.description,
          path: page.path,
        });
      }
    });

    setSearchResults(results);
  };

  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'inventory': return <Package className="h-4 w-4 text-primary" />;
      case 'order': return <Receipt className="h-4 w-4 text-green-500" />;
      case 'vendor': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'app-page':
        switch (result.id) {
          case 'dashboard': return <LayoutDashboard className="h-4 w-4 text-purple-500" />;
          case 'inventory': return <Package className="h-4 w-4 text-purple-500" />;
          case 'orders': return <Receipt className="h-4 w-4 text-purple-500" />;
          case 'vendors': return <Truck className="h-4 w-4 text-purple-500" />;
          case 'reports': return <BarChart className="h-4 w-4 text-purple-500" />;
          case 'settings': return <SettingsIcon className="h-4 w-4 text-purple-500" />;
          case 'profile': return <User className="h-4 w-4 text-purple-500" />;
          case 'account-settings': return <SettingsIcon className="h-4 w-4 text-purple-500" />;
          case 'notifications-page': return <Bell className="h-4 w-4 text-purple-500" />;
          case 'billing': return <DollarSign className="h-4 w-4 text-purple-500" />;
          case 'help': return <HelpCircle className="h-4 w-4 text-purple-500" />;
          case 'whats-new': return <Sparkles className="h-4 w-4 text-purple-500" />;
          case 'users': return <UsersIcon className="h-4 w-4 text-purple-500" />;
          case 'setup-instructions': return <BookOpen className="h-4 w-4 text-purple-500" />;
          default: return <FileText className="h-4 w-4 text-purple-500" />;
        }
      default: return null;
    }
  };

  const getResultDetails = (result: SearchResult) => {
    switch (result.type) {
      case 'inventory': return `SKU: ${result.description}`;
      case 'order': return `Status: ${result.status} | ${result.customerSupplier}`;
      case 'vendor': return `Contact: ${result.contactPerson || 'N/A'}`;
      case 'app-page': return result.description;
      default: return '';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'app-page' && result.path) {
      navigate(result.path);
      onClose(); // Close the dialog after navigation
    }
    // You can add specific navigation for 'inventory', 'order', 'vendor' types here
    // For example:
    // if (result.type === 'inventory') { navigate(`/inventory/${result.id}`); onClose(); }
    // if (result.type === 'order') { navigate(`/orders/${result.id}`); onClose(); }
    // if (result.type === 'vendor') { navigate(`/vendors/${result.id}`); onClose(); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" /> Global Search
          </DialogTitle>
          <DialogDescription>
            Search across all your inventory, orders, vendor data, and application pages.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="globalSearch">Search Term</Label>
            <Input
              id="globalSearch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter keywords, SKU, order ID, vendor name, or app page..."
            />
          </div>
          {searchTerm.trim() !== "" && (
            <ScrollArea className="min-h-[100px] max-h-[300px] border border-border rounded-md p-3">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-muted/20 rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleResultClick(result)}
                    >
                      {getResultIcon(result)}
                      <div>
                        <p className="font-semibold text-foreground">{result.name}</p>
                        <p className="text-xs text-muted-foreground">{getResultDetails(result)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No results found for "{searchTerm.trim()}".
                </div>
              )}
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchDialog;