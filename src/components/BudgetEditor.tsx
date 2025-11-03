import { useState } from "react";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
}

export function BudgetEditor() {
  const [categories, setCategories] = useLocalStorage<BudgetCategory[]>("budget-categories", []);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", allocated: 0, color: "bg-blue-500" });

  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", 
    "bg-orange-500", "bg-pink-500", "bg-red-500",
    "bg-yellow-500", "bg-indigo-500", "bg-teal-500"
  ];

  const handleSave = () => {
    if (!formData.name || formData.allocated <= 0) {
      return;
    }

    if (editingCategory) {
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, name: formData.name, allocated: formData.allocated, color: formData.color }
          : cat
      ));
    } else {
      const newCategory: BudgetCategory = {
        id: Date.now().toString(),
        name: formData.name,
        allocated: formData.allocated,
        spent: 0,
        color: formData.color
      };
      setCategories([...categories, newCategory]);
    }
    resetForm();
  };

  const handleEdit = (category: BudgetCategory) => {
    setEditingCategory(category);
    setFormData({ name: category.name, allocated: category.allocated, color: category.color });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: "", allocated: 0, color: "bg-blue-500" });
    setIsDialogOpen(false);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Управление категориями бюджета</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData({ name: "", allocated: 0, color: "bg-blue-500" })}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить категорию
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Редактировать категорию" : "Новая категория"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory ? "Внесите изменения в существующую категорию бюджета" : "Создайте новую категорию для планирования расходов"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Название категории</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите название"
                />
              </div>
              <div>
                <Label htmlFor="allocated">Планируемая сумма (₸)</Label>
                <Input
                  id="allocated"
                  type="number"
                  value={formData.allocated || ""}
                  onChange={(e) => setFormData({ ...formData, allocated: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Цвет категории</Label>
                <div className="flex gap-2 mt-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full ${color} ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600' : ''
                      }`}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1" disabled={!formData.name || formData.allocated <= 0}>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Категории не найдены</p>
            <p className="text-sm text-muted-foreground">Добавьте первую категорию для планирования бюджета</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${category.color}`} />
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {category.spent.toLocaleString("kk-KZ")} / {category.allocated.toLocaleString("kk-KZ")} ₸
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {category.allocated > 0 ? ((category.spent / category.allocated) * 100).toFixed(0) : 0}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
