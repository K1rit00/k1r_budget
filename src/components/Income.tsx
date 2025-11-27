import { useState, useEffect } from "react";
import {
  TrendingUp, Plus, DollarSign, Briefcase, Edit, Trash2, Calendar,
  BarChart3, Loader2, RefreshCw, AlertCircle, Power, PowerOff,
  History, Play, ArrowRight, Wallet, PiggyBank
} from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { apiService } from "../services/api";

// --- Интерфейсы ---

interface ApiIncome {
  _id: string;
  userId: string;
  source: string;
  amount: string;
  description?: string;
  date: string;
  type: any;
  isAutoCreated?: boolean;
  recurringIncomeId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Income {
  id: string;
  source: string;
  amount: number;
  description?: string;
  date: string;
  type: IncomeCategory;
  isAutoCreated?: boolean;
  recurringIncomeId?: string;
}

interface ApiRecurringIncome {
  _id: string;
  userId: string;
  source: string;
  amount: string;
  description?: string;
  type: string;
  recurringDay: number;
  isActive: boolean;
  autoCreate: boolean;
  lastCreated?: {
    month: number;
    year: number;
  };
  createdIncomes: any[];
  createdAt: string;
  updatedAt: string;
}

interface RecurringIncome {
  id: string;
  source: string;
  amount: number;
  description?: string;
  type: string;
  recurringDay: number;
  isActive: boolean;
  autoCreate: boolean;
  lastCreated?: {
    month: number;
    year: number;
  };
  createdCount: number;
}

interface IncomeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Новый интерфейс для транзакции использования
interface IncomeUsageTransaction {
  id: string;
  incomeId: {
    _id: string;
    source: string;
  };
  usedAmount: number;
  usageType: 'deposit' | 'other';
  depositTransactionId?: string; // ID транзакции депозита
  description?: string;
  usageDate: string;
}

function Income() {
  const { addNotification } = useAppActions();

  // State
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringIncome[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [usageHistory, setUsageHistory] = useState<IncomeUsageTransaction[]>([]); // State для истории

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringIncome | null>(null);

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadIncomes(),
        loadRecurringIncomes(),
        loadIncomeCategories(),
        loadUsageHistory() // Загружаем историю
      ]);

      await autoProcessRecurringIncomes();
    } catch (error: any) {
      console.error('Load data error:', error);
      addNotification({
        message: 'Ошибка загрузки данных',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadIncomeCategories = async () => {
    try {
      const response = await apiService.getCategories('income');
      if (response.success) {
        const mappedCategories = response.data.map((cat: any) => ({
          id: cat._id,
          name: cat.name,
          icon: cat.icon || 'circle',
          color: cat.color || '#6366f1',
        }));
        setIncomeCategories(mappedCategories);
      }
    } catch (error: any) {
      console.error('Load income categories error:', error);
    }
  };

  const autoProcessRecurringIncomes = async () => {
    try {
      const response = await apiService.processRecurringIncomes();
      if (response.success && response.created > 0) {
        addNotification({
          message: `🎉 Автоматически создано доходов: ${response.created}`,
          type: 'success'
        });
        await loadIncomes();
      }
    } catch (error: any) {
      console.error('Auto process error:', error);
    }
  };

  const loadIncomes = async () => {
    try {
      const response = await apiService.getIncome();
      if (response.success) {
        const mappedIncomes = response.data.map((income: ApiIncome) => ({
          id: income._id,
          source: income.source,
          amount: parseFloat(income.amount),
          description: income.description,
          date: income.date,
          type: {
            id: (income.type as any)._id,
            name: (income.type as any).name,
            icon: (income.type as any).icon || 'circle',
            color: (income.type as any).color || '#6366f1',
          },
          isAutoCreated: income.isAutoCreated || false,
          recurringIncomeId: income.recurringIncomeId,
        }));
        setIncomes(mappedIncomes);
      }
    } catch (error: any) {
      console.error('Load incomes error:', error);
      throw error;
    }
  };

  const loadRecurringIncomes = async () => {
    try {
      const response = await apiService.getRecurringIncomes();
      if (response.success) {
        const mappedRecurring = response.data.map((rec: ApiRecurringIncome) => ({
          id: rec._id,
          source: rec.source,
          amount: parseFloat(rec.amount),
          description: rec.description,
          type: rec.type,
          recurringDay: rec.recurringDay,
          isActive: rec.isActive,
          autoCreate: rec.autoCreate,
          lastCreated: rec.lastCreated,
          createdCount: rec.createdIncomes?.length || 0,
        }));
        setRecurringIncomes(mappedRecurring);
      }
    } catch (error: any) {
      console.error('Load recurring incomes error:', error);
      throw error;
    }
  };

  // Загрузка истории использования (Транзакции)
  const loadUsageHistory = async () => {
    try {
      // Используем новый метод API
      const response = await apiService.getIncomeUsageHistory();
      if (response.success) {
        const mappedHistory = response.data.map((item: any) => ({
          id: item._id,
          incomeId: item.incomeId, // Предполагаем, что populate вернул объект
          usedAmount: item.usedAmount,
          usageType: item.usageType,
          depositTransactionId: item.depositTransactionId,
          description: item.description,
          usageDate: item.usageDate
        }));
        setUsageHistory(mappedHistory);
      }
    } catch (error: any) {
      console.error('Load usage history error:', error);
      // Не выбрасываем ошибку, чтобы не блокировать загрузку остальной страницы
      // Если эндпоинта пока нет, просто оставим список пустым
    }
  };

  const handleProcessRecurring = async () => {
    try {
      setIsProcessing(true);
      const response = await apiService.processRecurringIncomes();
      if (response.success) {
        if (response.created > 0) {
          addNotification({ message: response.message, type: 'success' });
          await loadData();
        } else {
          addNotification({ message: 'Нет доходов для автоматического создания', type: 'info' });
        }
      }
    } catch (error: any) {
      console.error('Process recurring error:', error);
      addNotification({ message: error.response?.data?.message || 'Ошибка обработки', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIncomeSubmit = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const incomeData = {
        source: formData.get("source") as string,
        amount: formData.get("amount") as string,
        date: formData.get("date") as string,
        type: formData.get("type") as string,
        description: formData.get("description") as string || undefined,
      };

      let response;
      if (editingIncome) {
        response = await apiService.updateIncome(editingIncome.id, incomeData);
        addNotification({ message: "Доход успешно обновлен", type: "success" });
      } else {
        response = await apiService.createIncome(incomeData);
        addNotification({ message: "Доход успешно добавлен", type: "success" });
      }

      if (response.success) {
        await loadIncomes();
        setIsIncomeDialogOpen(false);
        setEditingIncome(null);
      }
    } catch (error: any) {
      console.error('Submit income error:', error);
      addNotification({ message: error.response?.data?.message || 'Ошибка сохранения', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteIncome = async (id: string) => {
    if (!confirm('Вы уверены?')) return;
    try {
      const response = await apiService.deleteIncome(id);
      if (response.success) {
        await loadIncomes();
        addNotification({ message: "Доход удален", type: "info" });
      }
    } catch (error: any) {
      console.error('Delete income error:', error);
      addNotification({ message: error.response?.data?.message || 'Ошибка удаления', type: 'error' });
    }
  };

  const handleRecurringSubmit = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const recurringData = {
        source: formData.get("source") as string,
        amount: formData.get("amount") as string,
        type: formData.get("type") as string,
        recurringDay: parseInt(formData.get("recurringDay") as string),
        description: formData.get("description") as string || undefined,
        autoCreate: formData.get("autoCreate") === "on",
      };

      let response;
      if (editingRecurring) {
        response = await apiService.updateRecurringIncome(editingRecurring.id, recurringData);
        addNotification({ message: "Шаблон успешно обновлен", type: "success" });
      } else {
        response = await apiService.createRecurringIncome(recurringData);
        addNotification({ message: "Шаблон успешно создан", type: "success" });
      }

      if (response.success) {
        await loadRecurringIncomes();
        setIsRecurringDialogOpen(false);
        setEditingRecurring(null);
      }
    } catch (error: any) {
      console.error('Submit recurring error:', error);
      addNotification({ message: error.response?.data?.message || 'Ошибка сохранения', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecurring = async (id: string) => {
    if (!confirm('Вы уверены?')) return;
    try {
      const response = await apiService.deleteRecurringIncome(id);
      if (response.success) {
        await loadRecurringIncomes();
        addNotification({ message: "Шаблон удален", type: "info" });
      }
    } catch (error: any) {
      console.error('Delete recurring error:', error);
      addNotification({ message: error.response?.data?.message || 'Ошибка удаления', type: 'error' });
    }
  };

  const toggleRecurring = async (id: string) => {
    try {
      const response = await apiService.toggleRecurringIncome(id);
      if (response.success) {
        await loadRecurringIncomes();
        addNotification({ message: response.message, type: "success" });
      }
    } catch (error: any) {
      console.error('Toggle recurring error:', error);
      addNotification({ message: error.response?.data?.message || 'Ошибка статуса', type: 'error' });
    }
  };

  // --- Helpers ---

  const getCategoryById = (id: string) => incomeCategories.find(cat => cat.id === id);
  const getCategoryName = (id: string) => getCategoryById(id)?.name || id;
  const getCategoryColor = (id: string) => getCategoryById(id)?.color || '#6b7280';

  const getCurrentMonthTotal = () => {
    const now = new Date();
    return incomes
      .filter(income => {
        const d = new Date(income.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, income) => sum + income.amount, 0);
  };

  const getTotalYearIncome = () => {
    const year = new Date().getFullYear();
    return incomes
      .filter(income => new Date(income.date).getFullYear() === year)
      .reduce((sum, income) => sum + income.amount, 0);
  };

  const getRecurringMonthlyIncome = () => {
    return recurringIncomes
      .filter(rec => rec.isActive)
      .reduce((sum, rec) => sum + rec.amount, 0);
  };

  // --- Analytics Data ---

  const getIncomeByType = () => {
    const typeTotals = incomes.reduce((acc, income) => {
      const typeName = income.type.name;
      const typeColor = income.type.color;
      if (!acc[typeName]) {
        acc[typeName] = { name: typeName, value: 0, color: typeColor };
      }
      acc[typeName].value += income.amount;
      return acc;
    }, {} as Record<string, { name: string; value: number; color: string }>);
    return Object.values(typeTotals);
  };

  const getMonthlyIncomeData = () => {
    const monthlyData = incomes.reduce((acc, income) => {
      const date = new Date(income.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthName, amount: 0, sortKey: monthKey };
      }
      acc[monthKey].amount += income.amount;
      return acc;
    }, {} as Record<string, { month: string; amount: number; sortKey: string }>);
    return Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-12);
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
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {recurringIncomes.filter(r => r.isActive).length} активных шаблонов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs defaultValue="incomes" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="incomes">Доходы</TabsTrigger>
          <TabsTrigger value="transactions">История операций</TabsTrigger>
          <TabsTrigger value="recurring">Шаблоны ({recurringIncomes.length})</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        {/* Вкладка: Доходы */}
        <TabsContent value="incomes">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Управление доходами</CardTitle>
              <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingIncome(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить доход
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingIncome ? "Редактировать доход" : "Добавить доход"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleIncomeSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                    <div>
                      <Label htmlFor="type">Тип дохода</Label>
                      <Select
                        name="type"
                        defaultValue={editingIncome?.type.id || (incomeCategories[0]?.id || "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          {incomeCategories.length === 0 ? (
                            <SelectItem value="no-categories" disabled>
                              Нет доступных категорий
                            </SelectItem>
                          ) : (
                            incomeCategories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))
                          )}
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
                        placeholder="0.00"
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
                        className="date-input"
                        required
                        defaultValue={editingIncome?.date ? new Date(editingIncome.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingIncome?.description}
                        placeholder="Дополнительная информация"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          editingIncome ? "Обновить" : "Добавить"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsIncomeDialogOpen(false);
                          setEditingIncome(null);
                        }}
                        disabled={isSubmitting}
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
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Пока нет добавленных доходов. Начните с добавления первого дохода.
                    </p>
                  </div>
                ) : (
                  incomes
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(income => (
                      <div key={income.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{income.source}</h4>
                            {income.isAutoCreated && (
                              <Badge variant="secondary" className="text-xs bg-blue text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Авто
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {income.type.name}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(income.date).toLocaleDateString("ru-RU", {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          {income.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {income.description.replace('[AUTO] ', '')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-green-600">
                            +{income.amount.toLocaleString("kk-KZ")} ₸
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

        {/* Вкладка: История операций (Движение средств) */}
        <TabsContent value="transactions">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">История распределения</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Движение средств от доходов к накоплениям и целям
                  </p>
                </div>

                {/* Badge — всего операций */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border">
                  <History className="w-3.5 h-3.5" />
                  Всего операций: {usageHistory.length}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Если пусто */}
              {usageHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-medium text-lg text-foreground">История пуста</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mt-1">
                    Здесь появятся записи, когда вы начнёте распределять доходы между депозитами и целями.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {usageHistory
                    .sort((a, b) => new Date(b.usageDate).getTime() - new Date(a.usageDate).getTime())
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-all duration-200 group"
                      >
                        {/* Левая часть */}
                        <div className="flex items-start gap-4">
                          {/* Иконка */}
                          <div
                            className={`
                      mt-1 sm:mt-0 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm
                      ${transaction.usageType === 'deposit'
                                ? 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400'
                                : 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                              }
                    `}
                          >
                            {transaction.usageType === 'deposit' ? (
                              <PiggyBank className="w-5 h-5" />
                            ) : (
                              <Wallet className="w-5 h-5" />
                            )}
                          </div>

                          {/* Текстовая часть */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm sm:text-base text-foreground">
                                {transaction.usageType === 'deposit'
                                  ? 'Пополнение депозита'
                                  : 'Использование средств'}
                              </span>

                              {/* Время */}
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground"
                              >
                                {new Date(transaction.usageDate).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Badge>
                            </div>

                            {/* Источник */}
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <span className="truncate max-w-[200px]">
                                {transaction.incomeId?.source || 'Неизвестный источник'}
                              </span>

                              <ArrowRight className="w-3 h-3 text-muted-foreground/60" />

                              <span className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border">
                                Источник
                              </span>
                            </div>

                            {/* Дата (мобильная версия) */}
                            <p className="text-xs text-muted-foreground/60 sm:hidden">
                              {new Date(transaction.usageDate).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>

                            {/* Описание */}
                            {transaction.description && (
                              <p className="text-xs text-muted-foreground/70 italic max-w-[240px] truncate">
                                {transaction.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Правая часть: сумма + дата */}
                        <div className="mt-3 sm:mt-0 pl-14 sm:pl-0 text-left sm:text-right">
                          <div className="font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400 tracking-tight">
                            {Number(transaction.usedAmount).toLocaleString('kk-KZ')} ₸
                          </div>

                          <div className="text-xs text-muted-foreground hidden sm:block mt-0.5">
                            {new Date(transaction.usageDate).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Вкладка: Шаблоны регулярных доходов */}
        <TabsContent value="recurring">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Шаблоны регулярных доходов</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Система автоматически создаст доходы в указанные дни месяца
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleProcessRecurring}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Запустить
                    </>
                  )}
                </Button>
                <Dialog open={isRecurringDialogOpen} onOpenChange={setIsRecurringDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingRecurring(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Создать шаблон
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingRecurring ? "Редактировать шаблон" : "Создать шаблон"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleRecurringSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                      <div>
                        <Label htmlFor="rec-type">Тип дохода</Label>
                        <Select name="type" defaultValue={editingRecurring?.type || (incomeCategories[0]?.id || "")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                          <SelectContent>
                            {incomeCategories.length === 0 ? (
                              <SelectItem value="no-categories" disabled>
                                Нет доступных категорий
                              </SelectItem>
                            ) : (
                              incomeCategories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="rec-amount">Сумма (₸)</Label>
                        <Input
                          id="rec-amount"
                          name="amount"
                          type="number"
                          step="0.01"
                          required
                          defaultValue={editingRecurring?.amount}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rec-source">Источник</Label>
                        <Input
                          id="rec-source"
                          name="source"
                          required
                          defaultValue={editingRecurring?.source}
                          placeholder="Название компании, проекта и т.д."
                        />
                      </div>
                      <div>
                        <Label htmlFor="recurringDay">День месяца для создания</Label>
                        <Input
                          id="recurringDay"
                          name="recurringDay"
                          type="number"
                          min="1"
                          max="31"
                          required
                          defaultValue={editingRecurring?.recurringDay || 1}
                          placeholder="1-31"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Например: 5 = каждое 5 число месяца
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 border p-3 rounded-lg bg-muted/30">
                        <Checkbox
                          id="autoCreate"
                          name="autoCreate"
                          defaultChecked={editingRecurring?.autoCreate !== false}
                        />
                        <Label htmlFor="autoCreate" className="font-medium cursor-pointer">
                          Автоматически создавать доходы
                        </Label>
                      </div>
                      <div>
                        <Label htmlFor="rec-description">Описание</Label>
                        <Textarea
                          id="rec-description"
                          name="description"
                          defaultValue={editingRecurring?.description}
                          placeholder="Дополнительная информация"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Сохранение...
                            </>
                          ) : (
                            editingRecurring ? "Обновить" : "Создать"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsRecurringDialogOpen(false);
                            setEditingRecurring(null);
                          }}
                          disabled={isSubmitting}
                        >
                          Отмена
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {recurringIncomes.length > 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Автоматическое создание</AlertTitle>
                  <AlertDescription>
                    Нажмите кнопку "Запустить" для проверки и создания доходов из активных шаблонов,
                    или дождитесь автоматической обработки при входе в систему.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {recurringIncomes.length === 0 ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Нет регулярных доходов. Создайте шаблон для автоматического создания доходов.
                    </p>
                  </div>
                ) : (
                  recurringIncomes
                    .sort((a, b) => a.recurringDay - b.recurringDay)
                    .map(recurring => (
                      <div
                        key={recurring.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${recurring.isActive
                          ? 'bg-purple-50/50 dark:bg-purple-950/10 hover:bg-purple-100/50 dark:hover:bg-purple-950/20'
                          : 'bg-muted/30 opacity-60'
                          }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <RefreshCw className={`w-4 h-4 ${recurring.isActive ? 'text-purple-600' : 'text-muted-foreground'}`} />
                            <h4 className="font-medium">{recurring.source}</h4>
                            <Badge variant={recurring.isActive ? "default" : "secondary"} className="text-xs">
                              {recurring.isActive ? "Активен" : "Неактивен"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryName(recurring.type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Каждое {recurring.recurringDay} число</span>
                            </div>
                            {recurring.createdCount > 0 && (
                              <div className="flex items-center gap-1">
                                <History className="w-3 h-3" />
                                <span>Создано: {recurring.createdCount}</span>
                              </div>
                            )}
                          </div>
                          {recurring.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {recurring.description}
                            </p>
                          )}
                          {recurring.lastCreated && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Последнее создание: {new Date(recurring.lastCreated.year, recurring.lastCreated.month).toLocaleDateString("ru-RU", { month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-semibold ${recurring.isActive ? 'text-purple-600' : 'text-muted-foreground'}`}>
                            {recurring.amount.toLocaleString("kk-KZ")} ₸
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRecurring(recurring.id)}
                            title={recurring.isActive ? "Деактивировать" : "Активировать"}
                          >
                            {recurring.isActive ? (
                              <Power className="w-4 h-4 text-green-600" />
                            ) : (
                              <PowerOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRecurring(recurring);
                              setIsRecurringDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRecurring(recurring.id)}
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

        {/* Вкладка: Аналитика */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Доходы по типам */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Доходы по типам</CardTitle>
              </CardHeader>
              <CardContent>
                {getIncomeByType().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getIncomeByType()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value.toLocaleString("kk-KZ")} ₸`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getIncomeByType().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`}
                        contentStyle={{
                          backgroundColor: '#1f2937', // Цвет фона (здесь темно-серый)
                          borderRadius: '12px',       // Закругление углов
                          border: '1px solid #374151', // Цвет рамки
                          color: '#fff'               // Цвет текста (если нужно)
                        }}
                        itemStyle={{ color: '#fff' }} // Цвет текста самих значений
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Нет данных для анализа. Добавьте доходы для отображения аналитики.
                    </p>
                  </div>
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
                      <Tooltip
                        formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`}
                        contentStyle={{
                          backgroundColor: '#1f2937', // Цвет фона (здесь темно-серый)
                          borderRadius: '12px',       // Закругление углов
                          border: '1px solid #374151', // Цвет рамки
                          color: '#fff'               // Цвет текста (если нужно)
                        }}
                        itemStyle={{ color: '#fff' }} // Цвет текста самих значений
                      />
                      <Bar dataKey="amount" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Нет данных для отображения динамики. Добавьте доходы за несколько месяцев.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Сводка по регулярным доходам */}
            {recurringIncomes.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Сводка по регулярным доходам</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recurringIncomes
                      .filter(rec => rec.isActive)
                      .sort((a, b) => b.amount - a.amount)
                      .map(recurring => (
                        <div key={recurring.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${getCategoryColor(recurring.type)}20` }}>
                              <Briefcase className="w-5 h-5" style={{ color: getCategoryColor(recurring.type) }} />
                            </div>
                            <div>
                              <p className="font-medium">{recurring.source}</p>
                              <p className="text-xs text-muted-foreground">
                                Каждое {recurring.recurringDay} число • {getCategoryName(recurring.type)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-purple-600">
                              {recurring.amount.toLocaleString("kk-KZ")} ₸
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {recurring.createdCount} создано
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Ожидаемый ежемесячный доход:</span>
                      <span className="text-lg font-bold text-purple-600">
                        {getRecurringMonthlyIncome().toLocaleString("kk-KZ")} ₸
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Income;