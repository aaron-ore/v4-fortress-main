"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Trash2, Printer, PackageOpen, QrCode } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import InvoicePdfContent from "@/components/InvoicePdfContent";
import { useOnboarding } from "@/context/OnboardingContext";
import { useOrders, POItem, OrderItem } from "@/context/OrdersContext";
import { generateSequentialNumber } from "@/utils/numberGenerator";
import { formatPhoneNumber } from "@/utils/formatters";
import InventorySelectionDialog from "@/components/InventorySelectionDialog";
import { InventoryItem } from "@/context/InventoryContext";
import { usePrint } from "@/context/PrintContext";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import { useCustomers } from "@/context/CustomerContext"; // NEW: Import useCustomers
import {
  Select, // NEW: Import Select components
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Row Component
interface SortableItemRowProps {
  item: POItem;
  handleItemChange: (id: number, field: keyof POItem, value: string | number) => void;
  handleRemoveItem: (id: number) => void;
}

const SortableItemRow: React.FC<SortableItemRowProps> = ({ item, handleItemChange, handleRemoveItem }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    position: 'relative' as const,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes} className="relative group">
      <TableCell className="w-[20px] cursor-grab" {...listeners}>
        <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">⠿</span>
      </TableCell>
      <TableCell>
        <Input
          value={item.itemName}
          onChange={(e) =>
            handleItemChange(item.id, "itemName", e.target.value)
          }
          placeholder="Product Name"
          className="min-w-[120px]"
        />
      </TableCell>
      <TableCell className="text-right w-[100px]">
        <Input
          type="number"
          value={item.quantity === 0 ? "" : String(item.quantity)} // Explicitly cast to string
          onChange={(e) =>
            handleItemChange(
              item.id,
              "quantity",
              parseInt(e.target.value || '0'),
            )
          }
          min="0"
          className="min-w-[60px]"
        />
      </TableCell>
      <TableCell className="text-right w-[120px]">
        <Input
          type="number"
          value={item.unitPrice === 0 ? "" : String(item.unitPrice)} // Explicitly cast to string
          onChange={(e) =>
            handleItemChange(
              item.id,
              "unitPrice",
              parseFloat(e.target.value || '0'),
            )
          }
          step="0.01"
          min="0"
          className="min-w-[80px]"
        />
      </TableCell>
      <TableCell className="text-right font-semibold w-[120px]">
        ${(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="w-[50px]">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleRemoveItem(item.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const { companyProfile } = useOnboarding();
  const { addOrder } = useOrders();
  const { initiatePrint } = usePrint();
  const { customers } = useCustomers(); // NEW: Use customers context

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null); // NEW: State for selected customer ID
  const [customerName, setCustomerName] = useState(""); // Kept for manual input if no customer selected
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState("Due on Receipt");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [invoiceQrCodeSvg, setInvoiceQrCodeSvg] = useState<string | null>(null);
  const [calculatedTotalAmount, setCalculatedTotalAmount] = useState(0); // NEW state for real-time total

  const taxRate = 0.05;

  const [isInventorySelectionDialogOpen, setIsInventorySelectionDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Effect to update customer details when a customer is selected from the dropdown
  React.useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setCustomerName(customer.name);
        setCustomerEmail(customer.email || "");
        setCustomerAddress(customer.address || "");
        setCustomerContact(customer.phone ? formatPhoneNumber(customer.phone) : "");
      }
    } else {
      // Clear fields if "Select Customer" or "Add New Customer" is chosen
      setCustomerName("");
      setCustomerEmail("");
      setCustomerAddress("");
      setCustomerContact("");
    }
  }, [selectedCustomerId, customers]);

  // Effect to calculate total amount in real-time
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + (isNaN(item.quantity) ? 0 : item.quantity) * (isNaN(item.unitPrice) ? 0 : item.unitPrice), 0);
    setCalculatedTotalAmount(subtotal * (1 + taxRate));
  }, [items, taxRate]);

  // Generate QR code for Invoice number (only if invoiceNumber is set, i.e., after order creation)
  React.useEffect(() => {
    const generateQr = async () => {
      if (invoiceNumber) {
        try {
          const svg = await generateQrCodeSvg(invoiceNumber, 80);
          setInvoiceQrCodeSvg(svg);
        } catch (error) {
          console.error("Error generating Invoice QR code:", error);
          setInvoiceQrCodeSvg(null);
        }
      } else {
        setInvoiceQrCodeSvg(null);
      }
    };
    generateQr();
  }, [invoiceNumber]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1, itemName: "", quantity: 0, unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: number,
    field: keyof POItem,
    value: string | number,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleCustomerContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCustomerContact(formatted);
  };

  const handleAddSelectedInventoryItems = (selectedInventoryItems: InventoryItem[]) => {
    const newInvoiceItems: POItem[] = selectedInventoryItems.map((invItem) => ({
      id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 + Math.random() : 1 + Math.random(),
      itemName: invItem.name,
      quantity: 1,
      unitPrice: invItem.retailPrice,
      inventoryItemId: invItem.id,
    }));
    setItems((prevItems) => {
      const existingInventoryItemIds = new Set(prevItems.map(item => item.inventoryItemId).filter(Boolean));
      const uniqueNewItems = newInvoiceItems.filter(newItem => !existingInventoryItemIds.has(newItem.inventoryItemId));
      return [...prevItems, ...uniqueNewItems];
    });
  };

  const handleSubmit = async () => {
    if (!customerName || !dueDate || items.some(item => !item.itemName || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unitPrice) || item.unitPrice <= 0)) {
      showError("Please fill in all required invoice details and ensure all items have valid names, quantities, and prices.");
      return;
    }

    const newSalesOrder = {
      type: "Sales" as "Sales",
      customerSupplier: customerName,
      date: invoiceDate,
      status: "New Order" as "New Order",
      totalAmount: calculatedTotalAmount, // Use the real-time calculated amount
      dueDate: dueDate,
      itemCount: items.length,
      notes: notes,
      orderType: "Retail" as "Retail",
      shippingMethod: "Standard" as "Standard",
      items: items,
    };

    try {
      await addOrder(newSalesOrder);
      navigate("/orders");
    } catch (error) {
      // Error handling is already in addOrder context function
    }
  };

  const handlePrintPdf = () => {
    if (!invoiceNumber || !customerName || !dueDate || items.some(item => !item.itemName || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unitPrice) || item.unitPrice <= 0)) {
      showError("Please fill in all required invoice details before generating the PDF.");
      return;
    }
    if (!companyProfile) {
      showError("Company profile not set up. Please complete onboarding or set company details in settings.");
      return;
    }

    const pdfProps = {
      invoiceNumber,
      invoiceDate,
      customerName,
      customerEmail,
      customerAddress,
      customerContact: customerContact.replace(/[^\d]/g, ''),
      sellerName: companyProfile.name,
      sellerAddress: companyProfile.address,
      sellerContact: companyProfile.currency,
      terms,
      dueDate,
      items,
      notes,
      taxRate,
      companyLogoUrl: companyProfile.companyLogoUrl || undefined, // NEW: Use companyProfile.companyLogoUrl
      invoiceQrCodeSvg: invoiceQrCodeSvg, // Pass QR code SVG to PDF
    };

    initiatePrint({ type: "invoice", props: pdfProps });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create New Invoice</h1>

      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
        <Button variant="outline" onClick={() => navigate("/orders")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Create Invoice</Button>
        <Button variant="secondary" onClick={handlePrintPdf} disabled={!invoiceNumber}>
          <Printer className="h-4 w-4 mr-2" /> Print/PDF
        </Button>
      </div>

      <div className="main-page-content">
        <div className="space-y-6 p-6 bg-background rounded-lg">
          <Card className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Will be generated on creation"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerNameSelect">Customer Name</Label>
                <Select value={selectedCustomerId || ""} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger id="customerNameSelect">
                    <SelectValue placeholder="Select an existing customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select Customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedCustomerId && (
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Or enter new customer name"
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerContact">Customer Phone</Label>
                <Input
                  id="customerContact"
                  type="text"
                  value={customerContact}
                  onChange={handleCustomerContactChange}
                  placeholder="e.g., 555-987-6543"
                  maxLength={12}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customerAddress">Customer Address</Label>
                <Textarea
                  id="customerAddress"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="456 Customer St, City, State, Zip"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Payment Terms</Label>
                <Input
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g., Due on Receipt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex items-center justify-between">
                <Label htmlFor="totalAmount" className="text-lg font-bold">Total Amount:</Label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    ${calculatedTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {invoiceQrCodeSvg && (
                    <div dangerouslySetInnerHTML={{ __html: invoiceQrCodeSvg }} className="w-16 h-16 object-contain flex-shrink-0" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl font-semibold">Items</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setIsInventorySelectionDialogOpen(true)}>
                  <PackageOpen className="h-4 w-4 mr-2" /> Add from Inventory
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddItem}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[20px]"></TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="w-[100px] text-right">Quantity</TableHead>
                        <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                        <TableHead className="w-[120px] text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                        {items.map((item) => (
                          <SortableItemRow
                            key={item.id}
                            item={item}
                            handleItemChange={handleItemChange}
                            handleRemoveItem={handleRemoveItem}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </div>
              </DndContext>
              <div className="flex justify-end items-center mt-4 text-lg font-bold">
                Total Amount: ${calculatedTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col relative min-h-[120px]">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or instructions here..."
                rows={4}
                className="flex-grow"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <InventorySelectionDialog
        isOpen={isInventorySelectionDialogOpen}
        onClose={() => setIsInventorySelectionDialogOpen(false)}
        onAddItems={handleAddSelectedInventoryItems}
        itemType="sales"
      />
    </div>
  );
};

export default CreateInvoice;