import { useState } from "react";
import { Edit, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface MonthlyPlanCategory {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  color: string;
}

const initialPlanData: MonthlyPlanCategory[] = [
  { id: "1", category: "Продукты", allocated: 75000, spent: 42500, color: "bg-blue-500" },
  { id: "2", category: "Транспорт", allocated: 25000, spent: 16000, color: "bg-green-500" },
  { id: "3", category: "Развлечения", allocated: 40000, spent: 34000, color: "bg-purple-500" },
  { id: "4", category: "Здоровье", allocated: 60000, spent: 22500, color: "bg-orange-500" },
  { id: "5", category: "Одежда", allocated: 30000, spent: 10500, color: "bg-pink-500" },
];

export function MonthlyPlan() {
  const [planData, setPlanData] = useState<MonthlyPlanCategory[]>(initialPlanData);
  const [editingItem, setEditingItem] = useState<MonthlyPlanCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ spent: 0 });

  const handleEditSpent = (item: MonthlyPlanCategory) => {
    setEditingItem(item);
    setFormData({ spent: item.spent });
    setIsDialogOpen(true);
  };

  const handleSaveSpent = () => {
    if (!editingItem) return;
    
    setPlanData(planData.map(item => 
      item.id === editingItem.id 
        ? { ...item, spent: formData.spent }
        : item
    ));
    
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const addExpense = (categoryId: string, amount: number) => {
    setPlanData(planData.map(item => 
      item.id === categoryId 
        ? { ...item, spent: item.spent + amount }
        : item
    ));
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>План на месяц</CardTitle>
        <p className="text-sm text-muted-foreground">Прогресс по категориям с возможностью редактирования</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {planData.map((item) => {
          const progressPercentage = (item.spent / item.allocated) * 100;
          const remaining = item.allocated - item.spent;
          
          return (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <h4>{item.category}</h4>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    {item.spent.toLocaleString("kk-KZ")} / {item.allocated.toLocaleString("kk-KZ")} ₸
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSpent(item)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressPercentage.toFixed(1)}% использовано</span>
                <span className={remaining < 0 ? "text-red-500" : ""}>
                  {remaining >= 0 ? "Осталось: " : "Превышение: "}
                  {Math.abs(remaining).toLocaleString("kk-KZ")} ₸
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addExpense(item.id, 2500)}
                  className="text-xs"
                >
                  +2500₸
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addExpense(item.id, 5000)}
                  className="text-xs"
                >
                  +5000₸
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addExpense(item.id, 10000)}
                  className="text-xs"
                >
                  +10000₸
                </Button>
              </div>
            </div>
          );
        })}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Редактировать расход: {editingItem?.category}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="spent">Потрачено (₸)</Label>
                <Input
                  id="spent"
                  type="number"
                  value={formData.spent}
                  onChange={(e) => setFormData({ spent: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Запланировано: {editingItem?.allocated.toLocaleString("kk-KZ")} ₸
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveSpent} className="flex-1">
                  Сохранить
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}