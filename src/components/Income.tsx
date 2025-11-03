import { useState, useEffect } from "react";
import { TrendingUp, Plus, DollarSign, Briefcase, Edit, Trash2, Target, Calendar, BarChart3, Filter, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Income, IncomeGoal, IncomeCategory } from "../types";

// Моковые данные категорий доходов
const DEFAULT_INCOME_CATEGORIES: IncomeCategory[] = [
  { id: "1", name: "Зарплата", color: "#10b981", description: "Основная зарплата" },
  { id: "2", name: "Фриланс", color: "#3b82f6", description: "Дополнительный доход" },
  { id: "3", name: "Инвестиции", color: "#8b5cf6", description: "Доходы от инвестиций" },
  { id: "4", name: "Бизнес", color: "#f59e0b", description: "Доходы от бизнеса" },
  { id: "5", name: "Другое", color: "#6b7280", description: "Прочие доходы" }
];

function Income() {
  const { addNotification } = useAppActions();
  const [incomes, setIncomes] = useLocalStorage<Income[]>("incomes", []);
  const [goals, setGoals] = useLocalStorage<IncomeGoal[]>("income-goals", []);
  const [categories] = useLocalStorage<IncomeCategory[]>("income-categories", DEFAULT_INCOME_CATEGORIES);
  
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingGoal, setEditingGoal] = useState<IncomeGoal | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth");

  // Расчеты для статистики
  const getCurrentMonthTotal = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return incomes
      .filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
      })
      .reduce((sum, income) => sum + income.amount, 0);
  };

  const getTotalYearIncome = () => {
    const currentYear = new Date().getFullYear();
    return incomes
      .filter(income => new Date(income.date).getFullYear() === currentYear)
      .reduce((sum, income) => sum + income.amount, 0);
  };

  const getRecurringMonthlyIncome = () => {
    return incomes
      .filter(income => income.isRecurring && income.recurringPeriod === "monthly")
      .reduce((sum, income) => sum + income.amount, 0);
  };

  // Данные для аналитики
  const getIncomeByCategory = () => {
    const categoryTotals = incomes.reduce((acc, income) => {
      const category = categories.find(cat => cat.id === income.categoryId);
      const categoryName = category?.name || "Неизвестно";
      const categoryColor = category?.color || "#6b7280";
      
      if (!acc[categoryName]) {
        acc[categoryName] = { name: categoryName, value: 0, color: categoryColor };
      }
      acc[categoryName].value += income.amount;
      return acc;
    }, {} as Record<string, { name: string; value: number; color: string }>);

    return Object.values(categoryTotals);
  };

  const getMonthlyIncomeData = () => {
    const monthlyData = incomes.reduce((acc, income) => {
      const date = new Date(income.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthName, amount: 0 };
      }
      acc[monthKey].amount += income.amount;
      return acc;
    }, {} as Record<string, { month: string; amount: number }>);

    return Object.values(monthlyData).sort((a, b) => {
      const [yearA, monthA] = a.month.split(" ");
      const [yearB, monthB] = b.month.split(" ");
      return new Date(parseInt(yearA), monthA === "янв" ? 0 : monthA === "фев" ? 1 : 2).getTime() - 
             new Date(parseInt(yearB), monthB === "янв" ? 0 : monthB === "фев" ? 1 : 2).getTime();
    });
  };

  // Обработчики форм
  const handleIncomeSubmit = (formData: FormData) => {
    const incomeData = {
      id: editingIncome?.id || Date.now().toString(),
      categoryId: formData.get("categoryId") as string,
      categoryName: categories.find(cat => cat.id === formData.get("categoryId"))?.name || "",
      amount: parseFloat(formData.get("amount") as string),
      date: formData.get("date") as string,
      source: formData.get("source") as string,
      description: formData.get("description") as string || undefined,
      isRecurring: formData.get("isRecurring") === "on",
      recurringPeriod: formData.get("recurringPeriod") as "weekly" | "monthly" | "quarterly" | "yearly" | undefined,
      tags: (formData.get("tags") as string)?.split(",").map(tag => tag.trim()).filter(Boolean) || []
    };

    if (editingIncome) {
      setIncomes(prev => prev.map(income => income.id === editingIncome.id ? incomeData : income));
      addNotification({ message: "Доход успешно обновлен", type: "success" });
    } else {
      setIncomes(prev => [...prev, incomeData]);
      addNotification({ message: "Доход успешно добавлен", type: "success" });
    }

    // Обновляем прогресс целей автоматически
    updateGoalsProgress();

    setIsIncomeDialogOpen(false);
    setEditingIncome(null);
  };

  // Функция для автоматического обновления прогресса целей
  const updateGoalsProgress = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    setGoals(prev => prev.map(goal => {
      if (!goal.isActive) return goal;
      
      // Рассчитываем прогресс по всем доходам в категории цели (если указана)
      const relevantIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        const isInTimeRange = incomeDate <= new Date(goal.deadline);
        const isInCategory = !goal.category || income.categoryName.toLowerCase().includes(goal.category.toLowerCase());
        
        return isInTimeRange && isInCategory;
      });
      
      const totalIncome = relevantIncomes.reduce((sum, income) => sum + income.amount, 0);
      
      return {
        ...goal,
        currentAmount: totalIncome
      };
    }));
  };

  // Обновляем прогресс целей при изменении доходов
  useEffect(() => {
    updateGoalsProgress();
  }, [incomes]);

  const handleGoalSubmit = (formData: FormData) => {
    const goalData = {
      id: editingGoal?.id || Date.now().toString(),
      name: formData.get("name") as string,
      targetAmount: parseFloat(formData.get("targetAmount") as string),
      currentAmount: editingGoal?.currentAmount || 0,
      deadline: formData.get("deadline") as string,
      category: formData.get("category") as string || undefined,
      description: formData.get("description") as string || undefined,
      isActive: true
    };

    if (editingGoal) {
      setGoals(prev => prev.map(goal => goal.id === editingGoal.id ? goalData : goal));
      addNotification({ message: "Цель успешно обновлена", type: "success" });
    } else {
      setGoals(prev => [...prev, goalData]);
      addNotification({ message: "Цель успешно добавлена", type: "success" });
    }

    setIsGoalDialogOpen(false);
    setEditingGoal(null);
  };

  const deleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(income => income.id !== id));
    addNotification({ message: "Доход удален", type: "info" });
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== id));
    addNotification({ message: "Цель удалена", type: "info" });
  };

  return (
    <div className="space-y-6">
      {/* Статистика доходов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Текущий месяц</span>
            </div>
            <p className="text-2xl text-green-900 dark:text-green-100">
              {getCurrentMonthTotal().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">За год</span>
            </div>
            <p className="text-2xl text-blue-900 dark:text-blue-100">
              {getTotalYearIncome().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300">Регулярные</span>
            </div>
            <p className="text-2xl text-purple-900 dark:text-purple-100">
              {getRecurringMonthlyIncome().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs defaultValue="incomes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incomes">Доходы</TabsTrigger>
          <TabsTrigger value="goals">Цели</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="incomes">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Управление доходами</CardTitle>
              <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить доход
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingIncome ? "Редактировать доход" : "Добавить доход"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleIncomeSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                    <div>
                      <Label htmlFor="categoryId">Категория</Label>
                      <Select name="categoryId" defaultValue={editingIncome?.categoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Сумма (₸)</Label>
                      <Input 
                        id="amount" 
                        name="amount" 
                        type="number" 
                        step="0.01" 
                        required 
                        defaultValue={editingIncome?.amount}
                      />
                    </div>
                    <div>
                      <Label htmlFor="source">Источник</Label>
                      <Input 
                        id="source" 
                        name="source" 
                        required 
                        defaultValue={editingIncome?.source}
                        placeholder="Название компании, проекта и т.д."
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Дата</Label>
                      <Input 
                        id="date" 
                        name="date" 
                        type="date" 
                        required 
                        defaultValue={editingIncome?.date}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isRecurring" 
                        name="isRecurring" 
                        defaultChecked={editingIncome?.isRecurring}
                      />
                      <Label htmlFor="isRecurring">Регулярный доход</Label>
                    </div>
                    <div>
                      <Label htmlFor="recurringPeriod">Период повтора</Label>
                      <Select name="recurringPeriod" defaultValue={editingIncome?.recurringPeriod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите период" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Еженедельно</SelectItem>
                          <SelectItem value="monthly">Ежемесячно</SelectItem>
                          <SelectItem value="quarterly">Раз в квартал</SelectItem>
                          <SelectItem value="yearly">Ежегодно</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tags">Теги (через запятую)</Label>
                      <Input 
                        id="tags" 
                        name="tags" 
                        defaultValue={editingIncome?.tags?.join(", ")}
                        placeholder="проект, клиент, бонус"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        defaultValue={editingIncome?.description}
                        placeholder="Дополнительная информация"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingIncome ? "Обновить" : "Добавить"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsIncomeDialogOpen(false);
                          setEditingIncome(null);
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incomes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет добавленных доходов. Начните с добавления первого дохода.
                  </p>
                ) : (
                  incomes.map(income => (
                    <div key={income.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4>{income.source}</h4>
                          {income.isRecurring && (
                            <Badge variant="secondary" className="text-xs">
                              Регулярный
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {income.categoryName} • {new Date(income.date).toLocaleDateString("ru-RU")}
                        </p>
                        {income.tags && income.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {income.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-green-600">
                          {income.amount.toLocaleString("kk-KZ")} ₸
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingIncome(income);
                            setIsIncomeDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteIncome(income.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Цели по доходам</CardTitle>
              <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить цель
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingGoal ? "Редактировать цель" : "Добавить цель"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleGoalSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название цели</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        required 
                        defaultValue={editingGoal?.name}
                        placeholder="Например: Достичь 500,000 ₸ в месяц"
                      />
                    </div>
                    <div>
                      <Label htmlFor="targetAmount">Целевая сумма (₸)</Label>
                      <Input 
                        id="targetAmount" 
                        name="targetAmount" 
                        type="number" 
                        step="0.01" 
                        required 
                        defaultValue={editingGoal?.targetAmount}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deadline">Срок достижения</Label>
                      <Input 
                        id="deadline" 
                        name="deadline" 
                        type="date" 
                        required 
                        defaultValue={editingGoal?.deadline}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Категория</Label>
                      <Input 
                        id="category" 
                        name="category" 
                        defaultValue={editingGoal?.category}
                        placeholder="Зарплата, фриланс и т.д."
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        defaultValue={editingGoal?.description}
                        placeholder="План достижения цели"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingGoal ? "Обновить" : "Добавить"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsGoalDialogOpen(false);
                          setEditingGoal(null);
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {goals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет целей по доходам. Поставьте первую цель для мотивации.
                  </p>
                ) : (
                  goals.map(goal => {
                    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                    const isExpired = new Date(goal.deadline) < new Date();
                    
                    return (
                      <div key={goal.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4>{goal.name}</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGoal(goal);
                                setIsGoalDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteGoal(goal.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>Прогресс: {progress.toFixed(1)}%</span>
                            <span>
                              {goal.currentAmount.toLocaleString("kk-KZ")} ₸ / {goal.targetAmount.toLocaleString("kk-KZ")} ₸
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Срок: {new Date(goal.deadline).toLocaleDateString("ru-RU")}
                          </span>
                          {isExpired && (
                            <Badge variant="destructive">Просрочено</Badge>
                          )}
                          {goal.category && (
                            <Badge variant="outline">{goal.category}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Доходы по категориям */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Доходы по категориям</CardTitle>
              </CardHeader>
              <CardContent>
                {getIncomeByCategory().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getIncomeByCategory()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value.toLocaleString("kk-KZ")} ₸`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getIncomeByCategory().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для анализа. Добавьте доходы для отображения аналитики.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Динамика доходов по месяцам */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Динамика доходов</CardTitle>
              </CardHeader>
              <CardContent>
                {getMonthlyIncomeData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getMonthlyIncomeData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Bar dataKey="amount" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для отображения динамики. Добавьте доходы за несколько месяцев.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Income;