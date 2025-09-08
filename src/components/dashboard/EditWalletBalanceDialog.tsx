import React, { useState, useEffect } from "react";
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
import { showSuccess, showError } from "@/utils/toast";
import { Wallet } from "lucide-react";

interface EditWalletBalanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentCashBalance: number;
  onSave: (newBalance: number) => void;
}

const EditWalletBalanceDialog: React.FC<EditWalletBalanceDialogProps> = ({
  isOpen,
  onClose,
  currentCashBalance,
  onSave,
}) => {
  const [cashBalanceInput, setCashBalanceInput] = useState(String(currentCashBalance));

  useEffect(() => {
    if (isOpen) {
      setCashBalanceInput(String(currentCashBalance));
    }
  }, [isOpen, currentCashBalance]);

  const handleSave = () => {
    const newBalance = parseFloat(cashBalanceInput);
    if (isNaN(newBalance) || newBalance < 0) {
      showError("Please enter a valid non-negative number for the cash balance.");
      return;
    }
    onSave(newBalance);
    showSuccess("Cash balance updated successfully!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Edit Cash Balance
          </DialogTitle>
          <DialogDescription>
            Adjust the cash balance in your wallet. This value is separate from inventory value.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cashBalance">Cash Balance</Label>
            <Input
              id="cashBalance"
              type="number"
              value={cashBalanceInput}
              onChange={(e) => setCashBalanceInput(e.target.value)}
              placeholder="e.g., 1500000000"
              step="0.01"
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditWalletBalanceDialog;