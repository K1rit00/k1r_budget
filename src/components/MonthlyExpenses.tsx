import { useState, useEffect, useCallback } from "react";
import { Wallet, Plus, Edit, Trash2, Target, AlertTriangle, CheckCircle, Loader2, CalendarDays, Info } from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { apiService } from "../services/api";
import type { MonthlyExpense, MonthlyBudget } from "../types";

// Начальное состояние формы
const INITIAL_FORM_STATE = {
  categoryId: "",
  name: "",
  plannedAmount: "",
  incomeId: "none",
  accountId: "none",
  isRecurring: false,
  description: ""
};

function MonthlyExpenses() {
  const { addNotification } = useAppActions();
  
  // Данные
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // Категории расходов
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]); // Категории доходов (для отображения в селекте)
  const [incomes, setIncomes] = useState<any[]>([]); // Доступные доходы
  const [deposits, setDeposits] = useState<any[]>([]);
  
  // UI состояние
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpense | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");

  // Состояние формы
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // 1. Функция обработки данных
  const processExpensesToBudgets = useCallback((expenses: any[]) => {
    const budgetMap = new Map<string, MonthlyBudget>();

    expenses.forEach(expense => {
      const date = new Date(expense.dueDate);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const key = `${year}-${month}`;

      if (!budgetMap.has(key)) {
        budgetMap.set(key, {
          id: key,
          month: month,
          year: year,
          totalPlanned: 0,
          totalActual: 0,
          expenses: []
        });
      }

      const budget = budgetMap.get(key)!;
      
      const mappedExpense: MonthlyExpense = {
        id: expense._id || expense.id,
        categoryId: expense.category?._id || expense.category?.id || expense.category,
        name: expense.name,
        plannedAmount: parseFloat(expense.amount),
        actualAmount: expense.actualAmount ? parseFloat(expense.actualAmount) : 0,
        dueDate: expense.dueDate,
        isRecurring: expense.isRecurring,
        status: expense.status,
        description: expense.description,
        sourceIncome: expense.sourceIncome?._id || expense.sourceIncome?.id || expense.sourceIncome, // ИЗМЕНЕНИЕ
        storageDeposit: expense.storageDeposit?._id || expense.storageDeposit?.id || expense.storageDeposit
      };

      budget.expenses.push(mappedExpense);
      budget.totalPlanned += mappedExpense.plannedAmount;
      if (mappedExpense.actualAmount) {
        budget.totalActual += mappedExpense.actualAmount;
      }
    });

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!budgetMap.has(currentKey)) {
      budgetMap.set(currentKey, {
        id: currentKey,
        month: (now.getMonth() + 1).toString().padStart(2, '0'),
        year: now.getFullYear(),
        totalPlanned: 0,
        totalActual: 0,
        expenses: []
      });
    }

    setBudgets(Array.from(budgetMap.values()));
  }, []);

  // 2. Загрузка данных
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Загружаем доступные доходы (getAvailableIncomes) вместо обычных, чтобы видеть остатки
      const [expensesRes, categoriesRes, incomesRes, depositsRes, incomeCategoriesRes] = await Promise.all([
        apiService.getMonthlyExpenses(),
        apiService.getCategories('expense'),
        apiService.getAvailableIncomes(), 
        apiService.getDeposits(),
        apiService.getCategories('income')
      ]);

      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (incomesRes.success) setIncomes(incomesRes.data);
      if (depositsRes.success) setDeposits(depositsRes.data);
      if (incomeCategoriesRes.success) setIncomeCategories(incomeCategoriesRes.data);
      
      if (expensesRes.success) {
        processExpensesToBudgets(expensesRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [processExpensesToBudgets]); 

  useEffect(() => {
    fetchData();
  }, []); 

  // 3. Управление формой
  useEffect(() => {
    if (isExpenseDialogOpen) {
      if (editingExpense) {
        setFormData({
          categoryId: editingExpense.categoryId || "",
          name: editingExpense.name || "",
          plannedAmount: editingExpense.plannedAmount.toString(),
          incomeId: editingExpense.sourceIncome || "none",
          accountId: editingExpense.storageDeposit || "none",
          isRecurring: editingExpense.isRecurring || false,
          description: editingExpense.description || ""
        });
      } else {
        setFormData(INITIAL_FORM_STATE);
      }
    }
  }, [isExpenseDialogOpen, editingExpense]);

  // Вспомогательные функции
  const getCurrentBudget = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return budgets.find(budget => `${budget.year}-${budget.month.padStart(2, '0')}` === currentMonth);
  };
  
  const getFutureBudgets = () => {
    const now = new Date();
    const currentYearMonth = now.getFullYear() * 12 + now.getMonth();

    return budgets.filter(budget => {
      const budgetYearMonth = budget.year * 12 + (parseInt(budget.month) - 1);
      return budgetYearMonth > currentYearMonth;
    }).sort((a, b) => {
       return (a.year * 12 + parseInt(a.month)) - (b.year * 12 + parseInt(b.month));
    });
  };

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

  const getBudgetComparison = () => {
    return budgets
      .sort((a, b) => new Date(`${a.year}-${a.month}`).getTime() - new Date(`${b.year}-${b.month}`).getTime())
      .map(budget => ({
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
      const category = categories.find(cat => (cat.id || cat._id) === expense.categoryId);
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

  const getItemId = (item: any) => item.id || item._id;

  // Обработчики
  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formDataInput = new FormData(e.target as HTMLFormElement);
    const monthYear = formDataInput.get("monthYear") as string;
    
    if (!monthYear) return;

    const [year, month] = monthYear.split("-");
    const newBudgetKey = `${year}-${month}`;
    const exists = budgets.some(b => `${b.year}-${b.month}` === newBudgetKey);
    
    if (!exists) {
      const newBudget: MonthlyBudget = {
        id: newBudgetKey,
        month: month,
        year: parseInt(year),
        totalPlanned: 0,
        totalActual: 0,
        expenses: []
      };
      setBudgets(prev => [...prev, newBudget]);
      addNotification({ message: `Бюджет на ${month}/${year} создан`, type: "success" });
    } else {
      addNotification({ message: "Бюджет на этот месяц уже существует", type: "info" });
    }

    setIsBudgetDialogOpen(false);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    // АВТОМАТИЧЕСКИЙ РАСЧЕТ ДАТЫ: ПОСЛЕДНЕЕ ЧИСЛО МЕСЯЦА
    let calculatedDate;
    
    if (selectedBudgetId) {
        const [year, month] = selectedBudgetId.split('-');
        calculatedDate = new Date(parseInt(year), parseInt(month), 0);
    } else {
        const now = new Date();
        calculatedDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    calculatedDate.setHours(12, 0, 0, 0);

    const expensePayload = {
      category: formData.categoryId,
      name: formData.name,
      amount: parseFloat(formData.plannedAmount),
      dueDate: calculatedDate.toISOString(), 
      isRecurring: formData.isRecurring,
      description: formData.description || undefined,
      sourceIncome: formData.incomeId !== "none" ? formData.incomeId : undefined,
      storageDeposit: formData.accountId !== "none" ? formData.accountId : undefined,
    };

    if (!expensePayload.category) {
      addNotification({ message: "Пожалуйста, выберите категорию", type: "error" });
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingExpense) {
        await apiService.updateMonthlyExpense(editingExpense.id, expensePayload);
        addNotification({ message: "Расход обновлен", type: "success" });
      } else {
        await apiService.createMonthlyExpense(expensePayload);
        addNotification({ message: "Расход добавлен", type: "success" });
      }
      
      await fetchData();
      setIsExpenseDialogOpen(false);
      setEditingExpense(null);
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка сохранения расхода", 
        type: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ИЗМЕНЕНИЕ: Теперь paymentAmount - это сумма текущего платежа, а не общая сумма.
  const markExpenseAsPaid = async (budgetId: string, expenseId: string, paymentAmount: number) => {
    const budget = budgets.find(b => b.id === budgetId);
    const expense = budget?.expenses.find(e => e.id === expenseId);
    
    if (!expense) return;

    // Расчет новой общей оплаченной суммы
    const oldActualAmount = expense.actualAmount || 0;
    const newActualAmount = oldActualAmount + paymentAmount;
    
    const isFullPayment = newActualAmount >= expense.plannedAmount;
    const newStatus = isFullPayment ? 'paid' : 'planned';

    try {
      await apiService.updateMonthlyExpense(expenseId, {
        status: newStatus,
        actualAmount: newActualAmount // Отправляем новую ОБЩУЮ сумму
      });
      
      addNotification({ 
        message: isFullPayment ? "Расход полностью оплачен" : "Частичная оплата сохранена", 
        type: "success" 
      });
      fetchData();
    } catch (error: any) {
      addNotification({ 
         message: error.response?.data?.message || "Ошибка при оплате", 
         type: "error" 
      });
    }
  };

  const deleteExpense = async (budgetId: string, expenseId: string) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот расход?")) return;
    
    try {
      await apiService.deleteMonthlyExpense(expenseId);
      addNotification({ message: "Расход удален", type: "info" });
      fetchData();
    } catch (error) {
      addNotification({ message: "Ошибка удаления", type: "error" });
    }
  };

  const deleteBudget = (budgetId: string) => {
    setBudgets(prev => prev.filter(budget => budget.id !== budgetId));
    addNotification({ message: "Бюджет скрыт из списка", type: "info" });
  };

  // Рендер списка расходов
  const renderExpenseList = (expenses: MonthlyExpense[], budgetId: string, showPayAction: boolean = true) => {
    if (expenses.length === 0) {
      return <p className="text-muted-foreground text-center py-8">Нет запланированных расходов</p>;
    }

    return (
      <div className="space-y-3 mt-4">
        {expenses.map(expense => {
          const category = categories.find(cat => (cat.id || cat._id) === expense.categoryId);
          const isOverdue = new Date(expense.dueDate) < new Date() && expense.status === "planned";
          const isPartial = expense.actualAmount && expense.actualAmount > 0 && expense.actualAmount < expense.plannedAmount && expense.status === 'planned';
          
          const actual = expense.actualAmount || 0;
          const remaining = expense.plannedAmount - actual;
          const isLowBalance = remaining > 0 && remaining <= 5000 && expense.status !== 'paid';
          const defaultPaymentAmount = remaining > 0 ? remaining : expense.plannedAmount; // Значение по умолчанию

          return (
            <div key={expense.id} className={`p-4 border rounded-lg ${isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category?.color || "#6b7280" }} />
                  <h4 className="font-medium text-base">{expense.name}</h4>
                  <Badge variant={expense.status === "paid" ? "default" : isOverdue ? "destructive" : isPartial ? "outline" : "secondary"}>
                    {expense.status === "paid" ? "Оплачено" : isOverdue ? "Просрочено" : isPartial ? "Частично" : "Запланировано"}
                  </Badge>
                  {expense.isRecurring && (
                    <Badge variant="outline">Регулярный</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {showPayAction && expense.status === "planned" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {isPartial ? "Доплатить" : "Оплатить"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>{isPartial ? "Добавить оплату" : "Отметить как оплаченное"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formDataInput = new FormData(e.target as HTMLFormElement);
                          const amount = parseFloat(formDataInput.get("amount") as string);
                          // Теперь amount - это сумма текущего платежа
                          markExpenseAsPaid(budgetId, expense.id, amount);
                        }}>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="amount">Сумма оплаты (₸)</Label> {/* Изменено */}
                              <Input 
                                id="amount" 
                                name="amount" 
                                type="number" 
                                step="0.01" 
                                required 
                                defaultValue={defaultPaymentAmount}
                              />
                              {isPartial && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Уже оплачено: {expense.actualAmount?.toLocaleString("kk-KZ")} ₸. <br/>
                                  Остаток к оплате: <span className="font-semibold">{remaining.toLocaleString("kk-KZ")} ₸</span>. <br/>
                                  Введите сумму, которую хотите оплатить сейчас.
                                </p>
                              )}
                              {!isPartial && (
                                 <p className="text-xs text-muted-foreground mt-1">
                                    План: {expense.plannedAmount.toLocaleString("kk-KZ")} ₸. Введите сумму оплаты.
                                 </p>
                              )}
                            </div>
                            <Button type="submit" className="w-full">
                              Подтвердить
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
                      setSelectedBudgetId(budgetId);
                      setIsExpenseDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteExpense(budgetId, expense.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Категория</p>
                  <p className="font-medium">{category?.name || "Неизвестно"}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">План</p>
                  <p className="font-medium">
                    {expense.plannedAmount.toLocaleString("kk-KZ")} ₸
                  </p>
                </div>

                <div>
                   <p className="text-xs text-muted-foreground uppercase mb-1">Факт</p>
                   <p className="font-medium">
                      {actual > 0 ? `${actual.toLocaleString("kk-KZ")} ₸` : "-"}
                   </p>
                </div>

                <div>
                   <p className="text-xs text-muted-foreground uppercase mb-1">Остаток</p>
                   {expense.status !== 'paid' ? (
                       <p className={`font-medium ${isLowBalance ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                         {remaining.toLocaleString("kk-KZ")} ₸
                       </p>
                   ) : (
                       <p className="text-green-600 font-medium text-xs flex items-center mt-0.5">
                          <CheckCircle className="w-3 h-3 mr-1"/> Оплачено
                       </p>
                   )}
                </div>
              </div>
              
              {expense.description && (
                <div className="mt-3 pt-2 border-t border-dashed">
                   <p className="text-sm text-muted-foreground">{expense.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
     return <div className="p-8 text-center">Загрузка расходов...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
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
                
                if (!currentBudget || currentBudget.expenses.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Нет расходов на текущий месяц</p>
                      <Button 
                        variant="link" 
                        onClick={() => {
                           const now = new Date();
                           const key = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                           if (!currentBudget) {
                               setIsBudgetDialogOpen(true);
                           }
                        }}
                      >
                        Создать бюджет
                      </Button>
                    </div>
                  );
                }

                const budgetProgress = currentBudget.totalPlanned > 0 
                  ? (currentBudget.totalActual / currentBudget.totalPlanned) * 100 
                  : 0;

                return (
                  <div className="space-y-6">
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

                    {renderExpenseList(currentBudget.expenses, currentBudget.id, true)}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
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
                    Пока нет созданных бюджетов.
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
              <CardTitle>Планирование бюджета</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsBudgetDialogOpen(true)}>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Создать бюджет
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* ТЕКУЩИЙ БЮДЖЕТ */}
              {(() => {
                const currentBudget = getCurrentBudget();
                if (!currentBudget) {
                  return (
                     <div className="text-center py-8 border rounded-lg border-dashed">
                        <p className="text-muted-foreground mb-2">Бюджет на текущий месяц не создан.</p>
                        <Button variant="link" onClick={() => setIsBudgetDialogOpen(true)}>Создать сейчас</Button>
                     </div>
                  );
                }

                return (
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border-l-4 border-blue-500">
                         <div>
                           <h3 className="font-bold text-lg">Текущий месяц ({currentBudget.month}/{currentBudget.year})</h3>
                           <p className="text-sm text-muted-foreground">Всего запланировано: {currentBudget.totalPlanned.toLocaleString("kk-KZ")} ₸</p>
                         </div>
                         <Button 
                           size="sm" 
                           onClick={() => {
                             setSelectedBudgetId(currentBudget.id);
                             setEditingExpense(null);
                             setFormData(INITIAL_FORM_STATE);
                             setIsExpenseDialogOpen(true);
                           }}
                         >
                           <Plus className="w-4 h-4 mr-2" /> Добавить
                         </Button>
                      </div>
                      {renderExpenseList(currentBudget.expenses, currentBudget.id, false)}
                   </div>
                );
              })()}

              {/* БУДУЩИЕ БЮДЖЕТЫ */}
              {(() => {
                  const futureBudgets = getFutureBudgets();
                  
                  if (futureBudgets.length > 0) {
                      return (
                          <div className="space-y-6 pt-6 border-t">
                              <h3 className="text-xl font-semibold text-muted-foreground">Будущие периоды</h3>
                              {futureBudgets.map(budget => (
                                  <div key={budget.id} className="space-y-4">
                                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border-l-4 border-indigo-400">
                                          <div>
                                              <h3 className="font-bold text-lg">{budget.month}/{budget.year}</h3>
                                              <p className="text-sm text-muted-foreground">План: {budget.totalPlanned.toLocaleString("kk-KZ")} ₸</p>
                                          </div>
                                          <Button 
                                            size="sm" 
                                            onClick={() => {
                                              setSelectedBudgetId(budget.id);
                                              setEditingExpense(null);
                                              setFormData(INITIAL_FORM_STATE);
                                              setIsExpenseDialogOpen(true);
                                            }}
                                          >
                                            <Plus className="w-4 h-4 mr-2" /> Добавить
                                          </Button>
                                      </div>
                                      {renderExpenseList(budget.expenses, budget.id, false)}
                                  </div>
                              ))}
                          </div>
                      )
                  }
                  return null;
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
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
                    Нет данных для анализа. Добавьте расходы для отображения статистики.
                  </p>
                )}
              </CardContent>
            </Card>

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

      {/* МОДАЛЬНОЕ ОКНО: ДОБАВИТЬ/РЕДАКТИРОВАТЬ РАСХОД */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Редактировать расход" : "Добавить расход"}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <Label htmlFor="categoryId">Категория</Label>
              <Select 
                value={formData.categoryId} 
                onValueChange={(val: string) => setFormData({...formData, categoryId: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => {
                    const id = getItemId(category);
                    return id ? (
                      <SelectItem key={String(id)} value={String(id)}>{category.name}</SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Название расхода</Label>
              <Input 
                id="name" 
                name="name" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                value={formData.plannedAmount}
                onChange={(e) => setFormData({...formData, plannedAmount: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="incomeId">Источник средств</Label>
              <Select 
                value={formData.incomeId}
                onValueChange={(val: string) => setFormData({...formData, incomeId: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите доход" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указывать</SelectItem>
                  {incomes
                    .filter((income: any) => {
                      // Показываем доход, если есть доступный остаток или он уже выбран (при редактировании)
                      const isSelected = String(getItemId(income)) === formData.incomeId;
                      return income.availableAmount > 0 || isSelected;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 50)
                    .map((income) => {
                      const id = getItemId(income);
                      
                      // Определяем название категории дохода для отображения
                      let categoryName = "Доход";
                      if (typeof income.type === 'object' && income.type !== null) {
                        categoryName = income.type.name;
                      } else if (typeof income.type === 'string') {
                        const foundCat = incomeCategories.find(c => (c.id || c._id) === income.type);
                        if (foundCat) categoryName = foundCat.name;
                      }

                      return id ? (
                        <SelectItem key={String(id)} value={String(id)}>
                           {income.source} ({categoryName}) - Доступно: {income.availableAmount.toLocaleString("kk-KZ")} ₸ (из {income.amount.toLocaleString("kk-KZ")} ₸) - {new Date(income.date).toLocaleDateString("ru-RU")}
                        </SelectItem>
                      ) : null;
                    })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Средства будут списаны из источника и зарезервированы на депозите.
              </p>
            </div>
            
            <div>
              <Label htmlFor="accountId">Место хранения средств (Депозит)</Label>
              <Select 
                value={formData.accountId}
                onValueChange={(val: string) => setFormData({...formData, accountId: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указывать</SelectItem>
                  {deposits
                    .filter(deposit => deposit.status === 'active')
                    .map((deposit) => {
                      const id = getItemId(deposit);
                      // Приоритет названия депозита
                      const displayName = deposit.name ? `${deposit.name} (${deposit.bankName})` : deposit.bankName;
                      
                      return id ? (
                        <SelectItem key={String(id)} value={String(id)}>
                           {displayName} - {deposit.currentBalance.toLocaleString("kk-KZ")} ₸
                        </SelectItem>
                      ) : null;
                    })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Депозит, с которого будет произведена оплата (списание).
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isRecurring" 
                checked={formData.isRecurring}
                onCheckedChange={(checked: boolean | string) => setFormData({...formData, isRecurring: !!checked})}
              />
              <Label htmlFor="isRecurring">Регулярный расход</Label>
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Дополнительная информация"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Сохранение..." : (editingExpense ? "Обновить" : "Добавить")}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                disabled={isSubmitting}
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

      {/* МОДАЛЬНОЕ ОКНО: СОЗДАТЬ БЮДЖЕТ */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Создать новый бюджет</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBudgetSubmit}>
             <div className="space-y-4 py-4">
               <div>
                 <Label htmlFor="monthYear">Выберите месяц и год</Label>
                 <Input 
                    type="month" 
                    id="monthYear" 
                    name="monthYear" 
                    className="date-input"
                    required
                    defaultValue={new Date().toISOString().slice(0, 7)}
                 />
               </div>
               <Button type="submit" className="w-full">Создать</Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MonthlyExpenses;