import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";

const OutOfStockItemsCard: React.FC = () => {
  const { inventoryItems } = useInventory();

  const outOfStockItems = useMemo(() => {
    return inventoryItems.filter(item => item.quantity === 0);
  }, [inventoryItems]);

  const handleNotifySupplier = (item: string) => {
    showSuccess(`Notifying supplier for ${item} (placeholder)`);
  };

  const handleSubstituteItem = (item: string) => {
    showSuccess(`Suggesting substitute for ${item} (placeholder)`);
  };

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Out-of-Stock Items</CardTitle>
        <AlertCircle className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col justify-between h-full">
        {outOfStockItems.length > 0 ? (
          <ul className="text-sm space-y-2">
            {outOfStockItems.slice(0, 3).map(item => (
              <li key={item.id} className="flex items-center justify-between border-b border-muted-foreground/20 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                <span>{item.name}</span>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleNotifySupplier(item.name)}>Notify Supplier</Button>
                  <Button variant="outline" size="sm" onClick={() => handleSubstituteItem(item.name)}>Substitute Item</Button>
                </div>
              </li>
            ))}
            {outOfStockItems.length > 3 && (
              <li className="text-center text-xs text-muted-foreground mt-2">
                ...and {outOfStockItems.length - 3} more items
              </li>
            )}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">No items currently out of stock. Excellent!</p>
        )}
      </CardContent>
    </Card>
  );
};

export default OutOfStockItemsCard;