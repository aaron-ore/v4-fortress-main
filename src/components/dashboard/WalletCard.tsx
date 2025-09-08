import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Edit, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { useInventory } from "@/context/InventoryContext";
import EditWalletBalanceDialog from "./EditWalletBalanceDialog"; // Import the new dialog

const WalletCard: React.FC = () => {
  const navigate = useNavigate();
  const { inventoryItems } = useInventory();

  // Initial simulated cash balance if nothing is in local storage
  const initialSimulatedCashBalance = 0; // Changed to 0 for fresh account

  // State for the editable cash balance, loaded from local storage
  const [editableCashBalance, setEditableCashBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedBalance = localStorage.getItem("fortress_cash_balance");
      return storedBalance ? parseFloat(storedBalance) : initialSimulatedCashBalance;
    }
    return initialSimulatedCashBalance;
  });

  const [isEditBalanceDialogOpen, setIsEditBalanceDialogOpen] = useState(false);

  // Update local storage whenever editableCashBalance changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("fortress_cash_balance", String(editableCashBalance));
    }
  }, [editableCashBalance]);

  const totalStockValue = useMemo(() => {
    // NOTE: If your Supabase inventory_items table is empty, this will fall back to mock data.
    // Ensure your inventory is populated in Supabase for real values.
    return inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  }, [inventoryItems]);

  const totalWalletValue = totalStockValue + editableCashBalance;

  const handleEdit = () => {
    setIsEditBalanceDialogOpen(true);
  };

  const handleSaveBalance = (newBalance: number) => {
    setEditableCashBalance(newBalance);
  };

  const handleSettings = () => {
    navigate("/account-settings");
    showSuccess("Navigating to Account Settings for wallet-related preferences.");
  };

  return (
    <>
      <Card className="bg-card border-border rounded-lg shadow-sm flex h-[74px] p-0 overflow-hidden">
        <div className="flex-1 flex flex-col justify-center p-2">
          <div className="flex items-center gap-2 mb-0">
            <Wallet className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">Wallet</CardTitle>
          </div>
          <p className="text-xl font-bold text-foreground">
            ${totalWalletValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex flex-col justify-center items-center bg-blue-500/80 p-1 space-y-1">
          <Button variant="ghost" size="icon" onClick={handleEdit} className="h-6 w-6 text-white hover:bg-white/20">
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSettings} className="h-6 w-6 text-white hover:bg-white/20">
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </Card>

      <EditWalletBalanceDialog
        isOpen={isEditBalanceDialogOpen}
        onClose={() => setIsEditBalanceDialogOpen(false)}
        currentCashBalance={editableCashBalance}
        onSave={handleSaveBalance}
      />
    </>
  );
};

export default WalletCard;