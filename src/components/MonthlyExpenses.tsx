import { useState, useEffect } from "react";
import { Wallet, Plus, Edit, Trash2, Target, Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
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
import type { MonthlyExpense, MonthlyBudget, ExpenseCategory, Income, Account } from "../types";

// Моковые данные категорий расходов
const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "1", name: "Питание", color: "#ef4444", description: "Продукты и еда", isDefault: true },
  { id: "2", name: "Транспорт", color: "#3b82f6", description: "Проезд и топливо", isDefault: true },
  { id: "3", name: "Развлечения", color: "#8b5cf6", description: "Отдых и досуг", isDefault: true },
  { id: "4", name: "Здоровье", color: "#10b981", description: "Медицина и спорт", isDefault: true },
  { id: "5", name: "Покупки", color: "#f59e0b", description: "Одежда и прочее", isDefault: true },
  { id: "6", name: "Образование", color: "#06b6d4", description: "Обучение и книги", isDefault: true },
  { id: "7", name: "Прочее", color: "#6b7280", description: "Другие расходы", isDefault: true }
];

function MonthlyExpenses() {
  const { addNotification } = useAppActions();
  const [budgets, setBudgets] = useLocalStorage<MonthlyBudget[]>("monthly-budgets", []);
  const [categories] = useLocalStorage<ExpenseCategory[]>("expense-categories", DEFAULT_EXPENSE_CATEGORIES);
  const [incomes, setIncomes] = useLocalStorage<Income[]>("incomes", []);
  const [accounts, setAccounts] = useLocalStorage<Account[]>("accounts", []);
  
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpense | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>("");

  // Получаем текущий бюджет
  const getCurrentBudget = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return budgets.find(budget => `${budget.year}-${budget.month.padStart(2, '0')}` === currentMonth);
  };

  // Расчеты для статистики
  const getCurrentMonthPlanned = () => {
    const currentBudget = getCurrentBudget();
    return currentBudget?.totalPlanned || 0;
  };

  const getCurrentMonthActual = () => {
    const currentBudget = getCurrentBudget();
    return currentBudget?.totalActual || 0;
  };

  const getOverdueExpensesCount = () => {
    const currentBudget = getCurrentBudget();
    if (!currentBudget) return 0;
    
    const today = new Date();
    return currentBudget.expenses.filter(expense => {
      const dueDate = new Date(expense.dueDate);
      return dueDate < today && expense.status === "planned";
    }).length;
  };

  // Данные для аналитики
  const getBudgetComparison = () => {
    return budgets.map(budget => ({
      month: `${budget.month}/${budget.year}`,
      planned: budget.totalPlanned,
      actual: budget.totalActual,
      difference: budget.totalActual - budget.totalPlanned
    })).slice(-6); // Последние 6 месяцев
  };

  const getExpensesByCategory = () => {
    const currentBudget = getCurrentBudget();
    if (!currentBudget) return [];

    const categoryTotals = currentBudget.expenses.reduce((acc, expense) => {
      const category = categories.find(cat => cat.id === expense.categoryId);
      const categoryName = category?.name || "Неизвестно";
      const categoryColor = category?.color || "#6b7280";
      
      if (!acc[categoryName]) {
        acc[categoryName] = { name: categoryName, value: 0, color: categoryColor };
      }
      acc[categoryName].value += expense.actualAmount || expense.plannedAmount;
      return acc;
    }, {} as Record<string, { name: string; value: number; color: string }>);

    return Object.values(categoryTotals);
  };

  // Обработчики форм
  const handleBudgetSubmit = (formData: FormData) => {
    const monthYear = formData.get("monthYear") as string;
    const [year, month] = monthYear.split("-");
    
    const budgetData = {
      id: Date.now().toString(),
      month: month,
      year: parseInt(year),
      totalPlanned: 0,
      totalActual: 0,
      expenses: []
    };

    setBudgets(prev => [...prev, budgetData]);
    addNotification({ message: "Бюджет на месяц создан", type: "success" });

    setIsBudgetDialogOpen(false);
  };

  const handleExpenseSubmit = (formData: FormData) => {
    const incomeIdValue = formData.get("incomeId") as string;
    const accountIdValue = formData.get("accountId") as string;
    
    const expenseData: MonthlyExpense = {
      id: editingExpense?.id || Date.now().toString(),
      categoryId: formData.get("categoryId") as string,
      name: formData.get("name") as string,
      plannedAmount: parseFloat(formData.get("plannedAmount") as string),
      actualAmount: editingExpense?.actualAmount,
      dueDate: formData.get("dueDate") as string,
      isRecurring: formData.get("isRecurring") === "on",
      status: editingExpense?.status || "planned" as const,
      description: formData.get("description") as string || undefined,
      incomeId: incomeIdValue && incomeIdValue !== "" ? incomeIdValue : undefined,
      accountId: accountIdValue && accountIdValue !== "" ? accountIdValue : undefined,
    };

    // Обновляем бюджет
    setBudgets(prev => prev.map(budget => {
      if (budget.id === selectedBudgetId) {
        const updatedExpenses = editingExpense 
          ? budget.expenses.map(expense => expense.id === editingExpense.id ? expenseData : expense)
          : [...budget.expenses, expenseData];
        
        const totalPlanned = updatedExpenses.reduce((sum, exp) => sum + exp.plannedAmount, 0);
        const totalActual = updatedExpenses.reduce((sum, exp) => sum + (exp.actualAmount || 0), 0);
        
        return {
          ...budget,
          expenses: updatedExpenses,
          totalPlanned,
          totalActual
        };
      }
      return budget;
    }));

    addNotification({ 
      message: editingExpense ? "Расход обновлен" : "Расход добавлен", 
      type: "success" 
    });

    setIsExpenseDialogOpen(false);
    setEditingExpense(null);
    setSelectedBudgetId("");
  };

  const markExpenseAsPaid = (budgetId: string, expenseId: string, amount: number) => {
    setBudgets(prev => prev.map(budget => {
      if (budget.id === budgetId) {
        const updatedExpenses = budget.expenses.map(expense => 
          expense.id === expenseId 
            ? { ...expense, actualAmount: amount, status: "paid" as const }
            : expense
        );
        
        const totalActual = updatedExpenses.reduce((sum, exp) => sum + (exp.actualAmount || 0), 0);
        
        return {
          ...budget,
          expenses: updatedExpenses,
          totalActual
        };
      }
      return budget;
    }));

    addNotification({ message: "Расход отмечен как оплаченный", type: "success" });
  };

  const deleteExpense = (budgetId: string, expenseId: string) => {
    setBudgets(prev => prev.map(budget => {
      if (budget.id === budgetId) {
        const updatedExpenses = budget.expenses.filter(expense => expense.id !== expenseId);
        const totalPlanned = updatedExpenses.reduce((sum, exp) => sum + exp.plannedAmount, 0);
        const totalActual = updatedExpenses.reduce((sum, exp) => sum + (exp.actualAmount || 0), 0);
        
        return {
          ...budget,
          expenses: updatedExpenses,
          totalPlanned,
          totalActual
        };
      }
      return budget;
    }));

    addNotification({ message: "Расход удален", type: "info" });
  };

  const deleteBudget = (budgetId: string) => {
    setBudgets(prev => prev.filter(budget => budget.id !== budgetId));
    addNotification({ message: "Бюджет удален", type: "info" });
  };

  return (
    <div className="space-y-6">
      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">Запланировано</span>
            </div>
            <p className="text-2xl text-blue-900 dark:text-blue-100">
              {getCurrentMonthPlanned().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Потрачено</span>
            </div>
            <p className="text-2xl text-green-900 dark:text-green-100">
              {getCurrentMonthActual().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-700 dark:text-orange-300">Просрочено</span>
            </div>
            <p className="text-2xl text-orange-900 dark:text-orange-100">
              {getOverdueExpensesCount()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Текущий месяц</TabsTrigger>
          <TabsTrigger value="budgets">Все бюджеты</TabsTrigger>
          <TabsTrigger value="planning">Планирование</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Расходы текущего месяца</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const currentBudget = getCurrentBudget();
                
                if (!currentBudget) {
                  return (
                    <div className="text-center py-8">
                      <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Бюджет на текущий месяц не создан</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Перейдите во вкладку "Планирование", чтобы создать бюджет
                      </p>
                    </div>
                  );
                }

                // Получаем текущую дату и месяц
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // Фильтруем только расходы текущего месяца
                const currentMonthExpenses = currentBudget.expenses.filter(expense => {
                  const dueDate = new Date(expense.dueDate);
                  return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
                });

                const budgetProgress = currentBudget.totalPlanned > 0 
                  ? (currentBudget.totalActual / currentBudget.totalPlanned) * 100 
                  : 0;

                return (
                  <div className="space-y-6">
                    {/* Прогресс бюджета */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span>Прогресс бюджета</span>
                        <span className={`${budgetProgress > 100 ? 'text-red-600' : 'text-green-600'}`}>
                          {budgetProgress.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.min(budgetProgress, 100)} className="h-2 mb-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Потрачено: {currentBudget.totalActual.toLocaleString("kk-KZ")} ₸</span>
                        <span>План: {currentBudget.totalPlanned.toLocaleString("kk-KZ")} ₸</span>
                      </div>
                    </div>

                    {/* Расходы текущего месяца */}
                    <div className="space-y-3">
                      {currentMonthExpenses.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          Нет расходов, запланированных на текущий месяц
                        </p>
                      ) : (
                        currentMonthExpenses.map(expense => {
                          const category = categories.find(cat => cat.id === expense.categoryId);
                          const isOverdue = new Date(expense.dueDate) < now && expense.status === "planned";
                          
                          return (
                            <div key={expense.id} className={`p-4 border rounded-lg ${isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category?.color || "#6b7280" }} />
                                  <h4>{expense.name}</h4>
                                  <Badge variant={expense.status === "paid" ? "default" : isOverdue ? "destructive" : "secondary"}>
                                    {expense.status === "paid" ? "Оплачено" : isOverdue ? "Просрочено" : "Запланировано"}
                                  </Badge>
                                  {expense.isRecurring && (
                                    <Badge variant="outline">Регулярный</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {expense.status === "planned" && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="outline">
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Оплатить
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-sm">
                                        <DialogHeader>
                                          <DialogTitle>Отметить как оплаченное</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={(e) => {
                                          e.preventDefault();
                                          const formData = new FormData(e.target as HTMLFormElement);
                                          const amount = parseFloat(formData.get("amount") as string);
                                          markExpenseAsPaid(currentBudget.id, expense.id, amount);
                                        }}>
                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="amount">Фактическая сумма (₸)</Label>
                                              <Input 
                                                id="amount" 
                                                name="amount" 
                                                type="number" 
                                                step="0.01" 
                                                required 
                                                defaultValue={expense.plannedAmount}
                                              />
                                            </div>
                                            <Button type="submit" className="w-full">
                                              Подтвердить оплату
                                            </Button>
                                          </div>
                                        </form>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingExpense(expense);
                                      setSelectedBudgetId(currentBudget.id);
                                      setIsExpenseDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteExpense(currentBudget.id, expense.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Категория</p>
                                  <p>{category?.name || "Неизвестно"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Срок оплаты</p>
                                  <p className={isOverdue ? "text-red-600" : ""}>
                                    {new Date(expense.dueDate).toLocaleDateString("ru-RU")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Сумма</p>
                                  <p className={expense.actualAmount ? "text-green-600" : ""}>
                                    {expense.actualAmount 
                                      ? `${expense.actualAmount.toLocaleString("kk-KZ")} ₸ (факт)`
                                      : `${expense.plannedAmount.toLocaleString("kk-KZ")} ₸ (план)`
                                    }
                                  </p>
                                </div>
                              </div>
                              {expense.description && (
                                <p className="text-sm text-muted-foreground mt-2">{expense.description}</p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Диалог добавления расхода */}
          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Редактировать расход" : "Добавить расход"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleExpenseSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                <div>
                  <Label htmlFor="categoryId">Категория</Label>
                  <Select name="categoryId" defaultValue={editingExpense?.categoryId}>
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
                  <Label htmlFor="name">Название расхода</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    required 
                    defaultValue={editingExpense?.name}
                    placeholder="Например: Продукты на неделю"
                  />
                </div>
                <div>
                  <Label htmlFor="plannedAmount">Запланированная сумма (₸)</Label>
                  <Input 
                    id="plannedAmount" 
                    name="plannedAmount" 
                    type="number" 
                    step="0.01" 
                    required 
                    defaultValue={editingExpense?.plannedAmount}
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Срок оплаты</Label>
                  <Input 
                    id="dueDate" 
                    name="dueDate" 
                    type="date" 
                    required 
                    defaultValue={editingExpense?.dueDate}
                  />
                </div>
                
                <div>
                  <Label htmlFor="incomeId">Источник средств (необязательно)</Label>
                  <Select name="incomeId" defaultValue={editingExpense?.incomeId || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите доход" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Не указывать</SelectItem>
                      {incomes
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 20)
                        .map(income => (
                          <SelectItem key={income.id} value={income.id}>
                            {income.source} - {income.amount.toLocaleString("kk-KZ")} ₸ ({new Date(income.date).toLocaleDateString("ru-RU")})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Укажите, из какого дохода планируете оплатить этот расход
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="accountId">Место хранения средств (необязательно)</Label>
                  <Select name="accountId" defaultValue={editingExpense?.accountId || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите счет" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Не указывать</SelectItem>
                      {accounts
                        .filter(account => account.isActive)
                        .map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.type === "cash" ? "Наличные" : account.type === "card" ? "Карта" : "Банк"}) - {account.balance.toLocaleString("kk-KZ")} ₸
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Укажите, на каком счете храните средства до момента оплаты
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isRecurring" 
                    name="isRecurring" 
                    defaultChecked={editingExpense?.isRecurring}
                  />
                  <Label htmlFor="isRecurring">Регулярный расход</Label>
                </div>
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    defaultValue={editingExpense?.description}
                    placeholder="Дополнительная информация"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingExpense ? "Обновить" : "Добавить"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsExpenseDialogOpen(false);
                      setEditingExpense(null);
                      setSelectedBudgetId("");
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="budgets">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Все бюджеты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgets.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет созданных бюджетов. Перейдите во вкладку "Планирование" для создания бюджета.
                  </p>
                ) : (
                  budgets
                    .sort((a, b) => new Date(`${b.year}-${b.month}`).getTime() - new Date(`${a.year}-${a.month}`).getTime())
                    .map(budget => {
                      const budgetProgress = budget.totalPlanned > 0 
                        ? (budget.totalActual / budget.totalPlanned) * 100 
                        : 0;

                      return (
                        <div key={budget.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4>{budget.month}/{budget.year}</h4>
                              <p className="text-sm text-muted-foreground">
                                {budget.expenses.length} расходов
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Исполнение</p>
                                <p className={`${budgetProgress > 100 ? 'text-red-600' : 'text-green-600'}`}>
                                  {budgetProgress.toFixed(1)}%
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteBudget(budget.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Запланировано</p>
                              <p className="text-lg">{budget.totalPlanned.toLocaleString("kk-KZ")} ₸</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Потрачено</p>
                              <p className="text-lg">{budget.totalActual.toLocaleString("kk-KZ")} ₸</p>
                            </div>
                          </div>
                          <Progress value={Math.min(budgetProgress, 100)} className="h-2" />
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Планирование бюджета текущего месяца</CardTitle>
              {!getCurrentBudget() && (
                <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Создать бюджет
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Создать бюджет на текущий месяц</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { 
                      e.preventDefault(); 
                      const now = new Date();
                      const monthYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                      const formData = new FormData();
                      formData.set("monthYear", monthYear);
                      handleBudgetSubmit(formData);
                    }} className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Будет создан бюджет на {new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                      </p>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          Создать
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsBudgetDialogOpen(false);
                          }}
                        >
                          Отмена
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {(() => {
                const currentBudget = getCurrentBudget();
                
                if (!currentBudget) {
                  return (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Бюджет на текущий месяц не создан</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Создайте бюджет и начните планировать расходы
                      </p>
                    </div>
                  );
                }

                const budgetProgress = currentBudget.totalPlanned > 0 
                  ? (currentBudget.totalActual / currentBudget.totalPlanned) * 100 
                  : 0;
                const now = new Date();
                const monthYear = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

                return (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4>{monthYear}</h4>
                          <p className="text-sm text-muted-foreground">
                            {currentBudget.expenses.length} расходов запланировано
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBudgetId(currentBudget.id);
                              setIsExpenseDialogOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Добавить расход
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBudget(currentBudget.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Запланировано</p>
                          <p className="text-lg">{currentBudget.totalPlanned.toLocaleString("kk-KZ")} ₸</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Потрачено</p>
                          <p className="text-lg">{currentBudget.totalActual.toLocaleString("kk-KZ")} ₸</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Исполнение</p>
                          <p className={`text-lg ${budgetProgress > 100 ? 'text-red-600' : 'text-green-600'}`}>
                            {budgetProgress.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      <Progress value={Math.min(budgetProgress, 100)} className="h-2 mb-3" />
                      
                      {/* Список расходов бюджета */}
                      {currentBudget.expenses.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm mb-2">Расходы:</p>
                          {currentBudget.expenses.map(expense => {
                            const category = categories.find(cat => cat.id === expense.categoryId);
                            const income = expense.incomeId ? incomes.find(i => i.id === expense.incomeId) : null;
                            const account = expense.accountId ? accounts.find(a => a.id === expense.accountId) : null;
                            
                            return (
                              <div key={expense.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category?.color || "#6b7280" }} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span>{expense.name}</span>
                                      <Badge variant={expense.status === "paid" ? "default" : "outline"} className="text-xs">
                                        {expense.status === "paid" ? "Оплачено" : "План"}
                                      </Badge>
                                    </div>
                                    {(income || account) && (
                                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                        {income && <span>Из: {income.source}</span>}
                                        {account && <span>→ {account.name}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>{expense.plannedAmount.toLocaleString("kk-KZ")} ₸</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingExpense(expense);
                                      setSelectedBudgetId(currentBudget.id);
                                      setIsExpenseDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteExpense(currentBudget.id, expense.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Пока нет запланированных расходов
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Сравнение бюджетов */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Сравнение план/факт по месяцам</CardTitle>
              </CardHeader>
              <CardContent>
                {getBudgetComparison().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getBudgetComparison()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Bar dataKey="planned" fill="#3b82f6" name="Планы" />
                      <Bar dataKey="actual" fill="#10b981" name="Факт" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для анализа. Создайте бюджеты и добавьте расходы.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Расходы по категориям */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Расходы по категориям (текущий месяц)</CardTitle>
              </CardHeader>
              <CardContent>
                {getExpensesByCategory().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getExpensesByCategory()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value.toLocaleString("kk-KZ")} ₸`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getExpensesByCategory().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для анализа расходов по категориям.
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

export default MonthlyExpenses;