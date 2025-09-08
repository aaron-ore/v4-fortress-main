import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";

const SlowMovingDeadstockCard: React.FC = () => {
  const { inventoryItems } = useInventory();

  const slowMovingItems = useMemo(() => {
    if (inventoryItems.length === 0) return [];
    // Simulate slow-moving items: high quantity, low reorder level, and random chance
    return inventoryItems
      .filter(item => item.quantity > 50 && item.reorderLevel < 10 && Math.random() > 0.5)
      .slice(0, 2);
  }, [inventoryItems]);

  const handleCreatePromotion = (item: string) => {
    showSuccess(`Creating promotion for ${item} (placeholder)`);
  };

  const handleBundleItems = (item: string) => {
    showSuccess(`Bundling ${item} with other items (placeholder)`);
  };

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Slow-Moving / Deadstock Items</CardTitle>
        <Archive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col justify-between h-full">
        {slowMovingItems.length > 0 ? (
          <ul className="text-sm space-y-2">
            {slowMovingItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>{item.name}</span>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleCreatePromotion(item.name)}>Promotion</Button>
                  <Button variant="outline" size="sm" onClick={() => handleBundleItems(item.name)}>Bundle</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">No slow-moving or deadstock items detected. Great!</p>
        )}
        <p className="text-xs text-muted-foreground mt-auto text-center">Highlights items sitting too long in storage.</p>
      </CardContent>
    </Card>
  );
};

export default SlowMovingDeadstockCard;