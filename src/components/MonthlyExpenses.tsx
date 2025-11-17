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
import { apiService } from "../services/api";
import type { MonthlyExpense, MonthlyBudget, Category } from "../types";

function MonthlyExpenses() {
  const { addNotification } = useAppActions();
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpense | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>("");

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Загружаем категории расходов
      const categoriesRes = await apiService.getCategories('expense');
      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }

      // Загружаем ежемесячные расходы
      const expensesRes = await apiService.getMonthlyExpenses();
      if (expensesRes.success) {
        // Группируем расходы по месяцам
        const groupedBudgets = groupExpensesByMonth(expensesRes.data);
        setBudgets(groupedBudgets);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      addNotification({
        message: error.response?.data?.message || 'Ошибка загрузки данных',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Группировка расходов по месяцам
  const groupExpensesByMonth = (expenses: any[]): MonthlyBudget[] => {
    const grouped: { [key: string]: MonthlyBudget } = {};

    expenses.forEach(expense => {
      const date = new Date(expense.dueDate);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!grouped[monthKey]) {
        const [year, month] = monthKey.split('-');
        grouped[monthKey] = {
          id: monthKey,
          month: month,
          year: parseInt(year),
          totalPlanned: 0,
          totalActual: 0,
          expenses: []
        };
      }

      const mappedExpense: MonthlyExpense = {
        id: expense._id || expense.id,
        categoryId: expense.category,
        name: expense.name,
        plannedAmount: parseFloat(expense.amount),
        actualAmount: expense.actualAmount ? parseFloat(expense.actualAmount) : undefined,
        dueDate: expense.dueDate,
        isRecurring: expense.isRecurring || false,
        status: expense.status || 'planned',
        description: expense.description
      };

      grouped[monthKey].expenses.push(mappedExpense);
      grouped[monthKey].totalPlanned += mappedExpense.plannedAmount;
      grouped[monthKey].totalActual += mappedExpense.actualAmount || 0;
    });

    return Object.values(grouped).sort((a, b) => {
      return new Date(`${b.year}-${b.month}`).getTime() - new Date(`${a.year}-${a.month}`).getTime();
    });
  };

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
    })).slice(-6);
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

  // Обработчик создания бюджета
  const handleBudgetSubmit = async (formData: FormData) => {
    const monthYear = formData.get("monthYear") as string;

    // Просто перезагружаем данные - бюджет создастся автоматически при добавлении первого расхода
    setIsBudgetDialogOpen(false);
    setSelectedMonthYear(monthYear);
    addNotification({ message: "Готово! Теперь добавьте расходы для этого месяца", type: "success" });
  };

  // Обработчик добавления/редактирования расхода
  const handleExpenseSubmit = async (formData: FormData) => {
    try {
      const expenseData = {
        category: formData.get("categoryId") as string,
        name: formData.get("name") as string,
        amount: parseFloat(formData.get("plannedAmount") as string),
        dueDate: formData.get("dueDate") as string,
        isRecurring: formData.get("isRecurring") === "on",
        status: editingExpense?.status || "planned",
        description: formData.get("description") as string || undefined,
        actualAmount: editingExpense?.actualAmount
      };

      if (editingExpense) {
        // Обновление
        await apiService.updateMonthlyExpense(editingExpense.id, expenseData);
        addNotification({ message: "Расход обновлен", type: "success" });
      } else {
        // Создание
        await apiService.createMonthlyExpense(expenseData);
        addNotification({ message: "Расход добавлен", type: "success" });
      }

      // Перезагружаем данные
      await loadData();

      setIsExpenseDialogOpen(false);
      setEditingExpense(null);
      setSelectedBudgetId("");
    } catch (error: any) {
      console.error('Error saving expense:', error);
      addNotification({
        message: error.response?.data?.message || 'Ошибка сохранения расхода',
        type: 'error'
      });
    }
  };

  // Отметить расход как оплаченный
  const markExpenseAsPaid = async (budgetId: string, expenseId: string, amount: number) => {
    try {
      await apiService.updateMonthlyExpense(expenseId, {
        actualAmount: amount,
        status: "paid"
      });

      addNotification({ message: "Расход отмечен как оплаченный", type: "success" });
      await loadData();
    } catch (error: any) {
      console.error('Error marking expense as paid:', error);
      addNotification({
        message: error.response?.data?.message || 'Ошибка обновления расхода',
        type: 'error'
      });
    }
  };

  // Удаление расхода
  const deleteExpense = async (budgetId: string, expenseId: string) => {
    try {
      await apiService.deleteMonthlyExpense(expenseId);
      addNotification({ message: "Расход удален", type: "info" });
      await loadData();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      addNotification({
        message: error.response?.data?.message || 'Ошибка удаления расхода',
        type: 'error'
      });
    }
  };

  // Удаление бюджета (всех расходов за месяц)
  const deleteBudget = async (budgetId: string) => {
    try {
      const budget = budgets.find(b => b.id === budgetId);
      if (!budget) return;

      // Удаляем все расходы этого бюджета
      await Promise.all(
        budget.expenses.map(expense => apiService.deleteMonthlyExpense(expense.id))
      );

      addNotification({ message: "Бюджет удален", type: "info" });
      await loadData();
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      addNotification({
        message: error.response?.data?.message || 'Ошибка удаления бюджета',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

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
                      <Button
                        className="mt-4"
                        onClick={() => {
                          const now = new Date();
                          const monthYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                          setSelectedMonthYear(monthYear);
                          setSelectedBudgetId(monthYear);
                          setIsExpenseDialogOpen(true);
                        }}
                      >
                        Добавить первый расход
                      </Button>
                    </div>
                  );
                }

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
                      <Progress
                        value={Math.min(budgetProgress, 100)}
                        className="h-3 mb-2"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Потрачено: {currentBudget.totalActual.toLocaleString("kk-KZ")} ₸</span>
                        <span>Бюджет: {currentBudget.totalPlanned.toLocaleString("kk-KZ")} ₸</span>
                      </div>
                      {budgetProgress > 100 && (
                        <p className="text-sm text-red-600 mt-2">
                          Превышение бюджета на {(currentBudget.totalActual - currentBudget.totalPlanned).toLocaleString("kk-KZ")} ₸
                        </p>
                      )}
                    </div>

                    {/* Список расходов */}
                    <div className="flex justify-between items-center">
                      <h3>Расходы</h3>
                      <Button
                        onClick={() => {
                          setSelectedBudgetId(currentBudget.id);
                          setIsExpenseDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить расход
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {currentBudget.expenses.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          Пока нет запланированных расходов
                        </p>
                      ) : (
                        currentBudget.expenses.map(expense => {
                          const category = categories.find(cat => cat.id === expense.categoryId);
                          const isOverdue = new Date(expense.dueDate) < new Date() && expense.status === "planned";

                          return (
                            <div key={expense.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category?.color }}
                                  />
                                  <h4>{expense.name}</h4>
                                  <Badge variant={
                                    expense.status === "paid" ? "default" :
                                      isOverdue ? "destructive" : "secondary"
                                  }>
                                    {expense.status === "paid" ? "Оплачено" :
                                      isOverdue ? "Просрочено" : "Запланировано"}
                                  </Badge>
                                  {expense.isRecurring && (
                                    <Badge variant="outline">Регулярно</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                      {category?.name} • {new Date(expense.dueDate).toLocaleDateString("ru-RU")}
                                    </p>
                                    <p className="text-lg">
                                      {expense.actualAmount
                                        ? `${expense.actualAmount.toLocaleString("kk-KZ")} ₸`
                                        : `${expense.plannedAmount.toLocaleString("kk-KZ")} ₸`
                                      }
                                    </p>
                                  </div>
                                  {expense.status === "planned" && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="outline">
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
                              {expense.description && (
                                <p className="text-sm text-muted-foreground">{expense.description}</p>
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
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                // Добавляем categoryId в FormData вручную
                if (selectedCategory) {
                  formData.set("categoryId", selectedCategory);
                }
                handleExpenseSubmit(formData);
              }} className="space-y-4">
                <div>
                  <Label htmlFor="categoryId">Категория</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(value) => setSelectedCategory(value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="categoryId" value={selectedCategory} />
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
                      setSelectedCategory("");
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Все бюджеты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgets.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет созданных бюджетов. Создайте первый бюджет для планирования расходов.
                  </p>
                ) : (
                  budgets.map(budget => {
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
            <CardHeader>
              <CardTitle>Планирование бюджета</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Функционал планирования бюджета в разработке.
                Здесь будут инструменты для создания бюджетных планов на основе истории трат.
              </p>
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