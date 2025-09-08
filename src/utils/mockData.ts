import { InventoryItem } from "@/context/InventoryContext";
import { Category } from "@/context/CategoryContext";
import { Vendor } from "@/context/VendorContext";
import { OrderItem, POItem } from "@/context/OrdersContext";
import { ReplenishmentTask } from "@/context/ReplenishmentContext";

// --- Mock Categories ---
export const mockCategories: Category[] = [
  { id: "cat-1", name: "Electronics", organizationId: "mock-org-1" },
  { id: "cat-2", name: "Office Supplies", organizationId: "mock-org-1" },
  { id: "cat-3", name: "Perishables", organizationId: "mock-org-1" },
  { id: "cat-4", name: "Tools", organizationId: "mock-org-1" },
  { id: "cat-5", name: "Books", organizationId: "mock-org-1" },
];

// --- Mock Vendors ---
export const mockVendors: Vendor[] = [
  { id: "vendor-1", name: "Global Suppliers Inc.", contactPerson: "Jane Doe", email: "jane@globalsuppliers.com", phone: "555-111-2222", address: "123 Global St", notes: "Primary electronics supplier", organizationId: "mock-org-1", createdAt: new Date().toISOString() },
  { id: "vendor-2", name: "Office Mart", contactPerson: "John Smith", email: "john@officemart.com", phone: "555-333-4444", address: "456 Office Ave", notes: "Office supplies vendor", organizationId: "mock-org-1", createdAt: new Date().toISOString() },
  { id: "vendor-3", name: "Fresh Foods Co.", contactPerson: "Alice Brown", email: "alice@freshfoods.com", phone: "555-555-6666", address: "789 Farm Rd", notes: "Perishables distributor", organizationId: "mock-org-1", createdAt: new Date().toISOString() },
];

// --- Mock Inventory Items ---
export const mockInventoryItems: InventoryItem[] = [
  {
    id: "item-1",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse with long battery life.",
    sku: "WM-ERGO-001",
    category: "Electronics",
    pickingBinQuantity: 50,
    overstockQuantity: 150,
    quantity: 200, // Derived
    reorderLevel: 30,
    pickingReorderLevel: 10,
    committedStock: 5,
    incomingStock: 20,
    unitCost: 15.00,
    retailPrice: 25.00,
    location: "WH-A-01-01-1-A",
    pickingBinLocation: "PB-A-01-01-1-A",
    status: "In Stock",
    lastUpdated: new Date().toISOString(),
    imageUrl: "https://via.placeholder.com/150/0000FF/FFFFFF?text=Mouse",
    vendorId: "vendor-1",
    barcodeUrl: "WM-ERGO-001", // QR code data
    organizationId: "mock-org-1",
    autoReorderEnabled: true,
    autoReorderQuantity: 100,
  },
  {
    id: "item-2",
    name: "Mechanical Keyboard",
    description: "RGB mechanical keyboard with blue switches.",
    sku: "KB-RGB-002",
    category: "Electronics",
    pickingBinQuantity: 10,
    overstockQuantity: 40,
    quantity: 50, // Derived
    reorderLevel: 15,
    pickingReorderLevel: 5,
    committedStock: 2,
    incomingStock: 0,
    unitCost: 60.00,
    retailPrice: 99.00,
    location: "WH-A-01-02-1-B",
    pickingBinLocation: "PB-A-01-02-1-B",
    status: "Low Stock",
    lastUpdated: new Date().toISOString(),
    imageUrl: "https://via.placeholder.com/150/FF0000/FFFFFF?text=Keyboard",
    vendorId: "vendor-1",
    barcodeUrl: "KB-RGB-002", // QR code data
    organizationId: "mock-org-1",
    autoReorderEnabled: false,
    autoReorderQuantity: 0,
  },
  {
    id: "item-3",
    name: "Organic Apples (Bag)",
    description: "Fresh organic apples, 3lb bag.",
    sku: "APP-ORG-003",
    category: "Perishables",
    pickingBinQuantity: 5,
    overstockQuantity: 0,
    quantity: 5, // Derived
    reorderLevel: 10,
    pickingReorderLevel: 5,
    committedStock: 0,
    incomingStock: 0,
    unitCost: 3.50,
    retailPrice: 5.99,
    location: "CS-B-01-01-1-C",
    pickingBinLocation: "PB-B-01-01-1-C",
    status: "Out of Stock",
    lastUpdated: new Date().toISOString(),
    imageUrl: "https://via.placeholder.com/150/008000/FFFFFF?text=Apples",
    vendorId: "vendor-3",
    barcodeUrl: "APP-ORG-003", // QR code data
    organizationId: "mock-org-1",
    autoReorderEnabled: true,
    autoReorderQuantity: 20,
  },
  {
    id: "item-4",
    name: "Notebook (A4)",
    description: "A4 ruled notebook, 100 pages.",
    sku: "NB-A4-004",
    category: "Office Supplies",
    pickingBinQuantity: 100,
    overstockQuantity: 200,
    quantity: 300, // Derived
    reorderLevel: 50,
    pickingReorderLevel: 20,
    committedStock: 10,
    incomingStock: 50,
    unitCost: 2.00,
    retailPrice: 3.50,
    location: "WH-A-02-01-1-A",
    pickingBinLocation: "PB-A-02-01-1-A",
    status: "In Stock",
    lastUpdated: new Date().toISOString(),
    imageUrl: "https://via.placeholder.com/150/808080/FFFFFF?text=Notebook",
    vendorId: "vendor-2",
    barcodeUrl: "NB-A4-004", // QR code data
    organizationId: "mock-org-1",
    autoReorderEnabled: true,
    autoReorderQuantity: 150,
  },
  {
    id: "item-5",
    name: "Screwdriver Set",
    description: "Precision screwdriver set for electronics repair.",
    sku: "TOOL-SD-005",
    category: "Tools",
    pickingBinQuantity: 15,
    overstockQuantity: 35,
    quantity: 50, // Derived
    reorderLevel: 10,
    pickingReorderLevel: 5,
    committedStock: 3,
    incomingStock: 0,
    unitCost: 12.00,
    retailPrice: 19.99,
    location: "WH-B-01-01-1-A",
    pickingBinLocation: "PB-B-01-01-1-A",
    status: "In Stock",
    lastUpdated: new Date().toISOString(),
    imageUrl: "https://via.placeholder.com/150/FFA500/FFFFFF?text=Tools",
    vendorId: "vendor-1",
    barcodeUrl: "TOOL-SD-005", // QR code data
    organizationId: "mock-org-1",
    autoReorderEnabled: false,
    autoReorderQuantity: 0,
  },
];

// --- Mock Orders ---
export const mockOrders: OrderItem[] = [
  {
    id: "SO20240726001",
    type: "Sales",
    customerSupplier: "Tech Solutions Inc.",
    date: "2024-07-26T10:00:00Z",
    status: "Shipped",
    totalAmount: 250.00,
    dueDate: "2024-08-01",
    itemCount: 10,
    notes: "Expedited shipping requested.",
    orderType: "Wholesale",
    shippingMethod: "Express",
    deliveryRoute: "Route 1",
    items: [
      { id: 1, itemName: "Wireless Mouse", quantity: 10, unitPrice: 25.00, inventoryItemId: "item-1" },
    ],
    organizationId: "mock-org-1",
    terms: "Net 30",
  },
  {
    id: "PO20240725001",
    type: "Purchase",
    customerSupplier: "Global Suppliers Inc.",
    date: "2024-07-25T14:30:00Z",
    status: "New Order",
    totalAmount: 1500.00,
    dueDate: "2024-08-15",
    itemCount: 100,
    notes: "Bulk order for Q3 stock.",
    orderType: "Wholesale",
    shippingMethod: "Standard",
    deliveryRoute: undefined,
    items: [
      { id: 1, itemName: "Wireless Mouse", quantity: 100, unitPrice: 15.00, inventoryItemId: "item-1" },
    ],
    organizationId: "mock-org-1",
    terms: "Net 60",
  },
  {
    id: "SO20240727002",
    type: "Sales",
    customerSupplier: "Local Electronics Store",
    date: "2024-07-27T11:00:00Z",
    status: "New Order",
    totalAmount: 198.00,
    dueDate: "2024-08-05",
    itemCount: 2,
    notes: "Customer pickup.",
    orderType: "Retail",
    shippingMethod: "Standard",
    deliveryRoute: "Customer Pickup",
    items: [
      { id: 1, itemName: "Mechanical Keyboard", quantity: 2, unitPrice: 99.00, inventoryItemId: "item-2" },
    ],
    organizationId: "mock-org-1",
    terms: "Due on Receipt",
  },
  {
    id: "PO20240728002",
    type: "Purchase",
    customerSupplier: "Fresh Foods Co.",
    date: "2024-07-28T09:00:00Z",
    status: "Processing",
    totalAmount: 70.00,
    dueDate: "2024-08-03",
    itemCount: 20,
    notes: "Weekly produce delivery.",
    orderType: "Wholesale",
    shippingMethod: "Express",
    deliveryRoute: undefined,
    items: [
      { id: 1, itemName: "Organic Apples (Bag)", quantity: 20, unitPrice: 3.50, inventoryItemId: "item-3" },
    ],
    organizationId: "mock-org-1",
    terms: "Net 7",
  },
];

// --- Mock Locations (for OnboardingContext) ---
export const mockLocations: string[] = [
  "Main Warehouse",
  "Cold Storage",
  "Returns Area",
  "WH-A-01-01-1-A",
  "WH-A-01-02-1-B",
  "WH-A-02-01-1-A",
  "WH-B-01-01-1-A",
  "PB-A-01-01-1-A",
  "PB-A-01-02-1-B",
  "PB-B-01-01-1-C",
  "PB-A-02-01-1-A",
];

// --- Mock Company Profile (for OnboardingContext) ---
export const mockCompanyProfile = {
  name: "Fortress Inventory Solutions",
  currency: "USD",
  address: "789 Fortress Ave, Suite 200, Inventory City, IC 12345",
};

// --- Mock User Profile (for ProfileContext) ---
export const mockUserProfile = {
  id: "mock-user-id-123",
  fullName: "Admin User",
  email: "admin@example.com",
  phone: "555-000-1111",
  address: "123 Admin St, Admin City, AD 12345",
  avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=AdminUser",
  role: "admin",
  organizationId: "mock-org-1",
  createdAt: new Date().toISOString(),
};

// --- Mock All Profiles (for ProfileContext) ---
export const mockAllProfiles = [
  mockUserProfile,
  {
    id: "mock-user-id-456",
    fullName: "Jane Manager",
    email: "jane@example.com",
    phone: "555-123-4567",
    address: "456 Manager Blvd, Manager Town, MT 54321",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=JaneManager",
    role: "inventory_manager",
    organizationId: "mock-org-1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-user-id-789",
    fullName: "Bob Viewer",
    email: "bob@example.com",
    phone: "555-789-0123",
    address: "789 Viewer Lane, Viewer City, VC 67890",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=BobViewer",
    role: "viewer",
    organizationId: "mock-org-1",
    createdAt: new Date().toISOString(),
  },
];

// --- Mock Replenishment Tasks (NEW) ---
export const mockReplenishmentTasks: ReplenishmentTask[] = [
  {
    id: "repl-task-1",
    itemId: "item-2",
    itemName: "Mechanical Keyboard",
    fromLocation: "WH-A-01-02-1-B",
    toLocation: "PB-A-01-02-1-B",
    quantity: 10,
    status: "Pending",
    assignedTo: undefined,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    organizationId: "mock-org-1",
  },
  {
    id: "repl-task-2",
    itemId: "item-3",
    itemName: "Organic Apples (Bag)",
    fromLocation: "CS-B-01-01-1-C",
    toLocation: "PB-B-01-01-1-C",
    quantity: 20,
    status: "Assigned",
    assignedTo: "mock-user-id-456",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    organizationId: "mock-org-1",
  },
];