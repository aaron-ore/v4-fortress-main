"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Archive, Printer, PackageOpen, QrCode } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useOrders, POItem, OrderItem } from "@/context/OrdersContext"; // NEW: Import OrderItem
import ConfirmDialog from "@/components/ConfirmDialog";
import PurchaseOrderPdfContent from "@/components/PurchaseOrderPdfContent";
import { useOnboarding } from "@/context/OnboardingContext";
import { usePrint } from "@/context/PrintContext";
import { generateSequentialNumber } from "@/utils/numberGenerator";
import { formatPhoneNumber } from "@/utils/formatters";
import InventorySelectionDialog from "@/components/InventorySelectionDialog";
import { InventoryItem } from "@/context/InventoryContext";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";

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


const CreatePurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const { companyProfile } = useOnboarding();
  const { addOrder } = useOrders();
  const { initiatePrint } = usePrint();

  const [poNumber, setPoNumber] = useState(""); // Removed initial generation, will be set after order creation
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState("Net 30");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [poQrCodeSvg, setPoQrCodeSvg] = useState<string | null>(null);
  const [calculatedTotalAmount, setCalculatedTotalAmount] = useState(0); // NEW state for real-time total

  const taxRate = 0.05;

  const [isInventorySelectionDialogOpen, setIsInventorySelectionDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Effect to calculate total amount in real-time
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + (isNaN(item.quantity) ? 0 : item.quantity) * (isNaN(item.unitPrice) ? 0 : item.unitPrice), 0);
    setCalculatedTotalAmount(subtotal * (1 + taxRate));
  }, [items, taxRate]);

  // Generate QR code for PO number (only if poNumber is set, i.e., after order creation)
  React.useEffect(() => {
    const generateQr = async () => {
      if (poNumber) {
        try {
          const svg = await generateQrCodeSvg(poNumber, 60); // Adjusted size to 60
          setPoQrCodeSvg(svg);
        } catch (error) {
          console.error("Error generating PO QR code:", error);
          setPoQrCodeSvg(null);
        }
      } else {
        setPoQrCodeSvg(null);
      }
    };
    generateQr();
  }, [poNumber]);

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

  const handleSupplierContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSupplierContact(formatted);
  };

  const handleAddSelectedInventoryItems = (selectedInventoryItems: InventoryItem[]) => {
    const newPOItems: POItem[] = selectedInventoryItems.map((invItem) => ({
      id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 + Math.random() : 1 + Math.random(),
      itemName: invItem.name,
      quantity: invItem.quantity > 0 ? invItem.quantity : 1,
      unitPrice: invItem.unitCost,
      inventoryItemId: invItem.id,
    }));
    setItems((prevItems) => {
      const existingInventoryItemIds = new Set(prevItems.map(item => item.inventoryItemId).filter(Boolean));
      const uniqueNewItems = newPOItems.filter(newItem => !existingInventoryItemIds.has(newItem.inventoryItemId));
      return [...prevItems, ...uniqueNewItems];
    });
  };

  const handleSubmit = async () => {
    if (!supplierName || !dueDate || items.some(item => !item.itemName || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unitPrice) || item.unitPrice <= 0)) {
      showError("Please fill in all required PO details and ensure all items have valid names, quantities, and prices.");
      return;
    }

    const newPurchaseOrder = {
      type: "Purchase" as "Purchase",
      customerSupplier: supplierName,
      date: poDate,
      status: "New Order" as "New Order",
      totalAmount: calculatedTotalAmount, // Use the real-time calculated amount
      dueDate: dueDate,
      itemCount: items.length,
      notes: notes,
      orderType: "Wholesale" as "Wholesale",
      shippingMethod: "Standard" as "Standard",
      items: items,
      terms: terms,
    };

    try {
      await addOrder(newPurchaseOrder);
      // If addOrder is successful, it will show a success toast and navigate.
      // The actual PO number will be generated by the context.
      navigate("/orders");
    } catch (error) {
      // Error handling is already in addOrder context function
    }
  };

  const handlePrintPdf = () => {
    if (!poNumber || !supplierName || items.some(item => !item.itemName || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unitPrice) || item.unitPrice <= 0)) {
      showError("Please fill in all required PO details before generating the PDF.");
      return;
    }
    if (!companyProfile) {
      showError("Company profile not set up. Please complete onboarding or set company details in settings.");
      return;
    }

    const pdfProps = {
      poNumber,
      poDate,
      supplierName: supplier,
      supplierEmail: supplierEmail,
      supplierAddress: supplierAddress,
      supplierContact: supplierContact,
      recipientName: companyProfile.name,
      recipientAddress: companyProfile.address,
      recipientContact: companyProfile.currency,
      terms,
      dueDate,
      items,
      notes,
      taxRate,
      companyLogoUrl: companyProfile.companyLogoUrl || undefined, // NEW: Use companyProfile.companyLogoUrl
      poQrCodeSvg: poQrCodeSvg, // Pass QR code SVG to PDF
    };

    initiatePrint({ type: "purchase-order", props: pdfProps });
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
      <h1 className="text-3xl font-bold">Create New Purchase Order</h1>

      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
        <Button variant="outline" onClick={() => navigate("/orders")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Create Purchase Order</Button>
        <Button variant="secondary" onClick={handlePrintPdf} disabled={!poNumber}>
          <Printer className="h-4 w-4 mr-2" /> Print/PDF
        </Button>
      </div>

      <div className="main-page-content">
        <div className="space-y-6 p-6 bg-background rounded-lg">
          <Card className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">PO Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poNumber">PO Number</Label>
                <Input
                  id="poNumber"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Will be generated on creation"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier Name</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g., Global Tech Inc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierEmail">Supplier Email</Label>
                <Input
                  id="supplierEmail"
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  placeholder="supplier@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierContact">Supplier Phone</Label>
                <Input
                  id="supplierContact"
                  type="text"
                  value={supplierContact}
                  onChange={handleSupplierContactChange}
                  placeholder="e.g., 555-123-4567"
                  maxLength={12}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supplierAddress">Supplier Address</Label>
                <Textarea
                  id="supplierAddress"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="123 Supplier St, City, State, Zip"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poDate">PO Date</Label>
                <Input
                  id="poDate"
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Terms</Label>
                <Input
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g., Net 30"
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
                  {poQrCodeSvg && (
                    <div dangerouslySetInnerHTML={{ __html: poQrCodeSvg }} className="w-16 h-16 object-contain flex-shrink-0" />
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
        itemType="purchase"
      />
    </div>
  );
};

export default CreatePurchaseOrder;