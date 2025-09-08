import React, { useState } from "react";
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
import ConfirmDialog from "@/components/ConfirmDialog"; // Import ConfirmDialog
import { useCategories } from "@/context/CategoryContext";
import { showSuccess, showError } from "@/utils/toast";
import { PlusCircle, Trash2 } from "lucide-react";

interface CategoryManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryManagementDialog: React.FC<CategoryManagementDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { categories, addCategory, removeCategory } = useCategories();
  const [newCategoryName, setNewCategoryName] = useState("");

  // State for delete confirmation dialog
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleAddCategory = () => {
    if (newCategoryName.trim() === "") {
      showError("Category name cannot be empty.");
      return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      showError("This category already exists.");
      return;
    }
    addCategory(newCategoryName.trim());
    showSuccess(`Category "${newCategoryName.trim()}" added.`);
    setNewCategoryName("");
  };

  const handleRemoveCategoryClick = (id: string, name: string) => {
    setCategoryToDelete({ id, name });
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmRemoveCategory = () => {
    if (categoryToDelete) {
      removeCategory(categoryToDelete.id);
      showSuccess(`Category "${categoryToDelete.name}" removed.`);
    }
    setIsConfirmDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Add, view, or remove inventory categories.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newCategory">New Category Name</Label>
            <div className="flex gap-2">
              <Input
                id="newCategory"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Perishables, Tools"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory();
                  }
                }}
              />
              <Button onClick={handleAddCategory}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Categories</Label>
              <ul className="border border-border rounded-md p-3 bg-muted/20 max-h-40 overflow-y-auto">
                {categories.map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between py-1 text-foreground">
                    <span>{cat.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCategoryClick(cat.id, cat.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      {categoryToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmRemoveCategory}
          title="Confirm Category Deletion"
          description={`Are you sure you want to delete the category "${categoryToDelete.name}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </Dialog>
  );
};

export default CategoryManagementDialog;