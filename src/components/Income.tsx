import { useState, useEffect } from "react";
import { TrendingUp, Plus, DollarSign, Briefcase, Edit, Trash2, Calendar, BarChart3, Loader2, RefreshCw, AlertCircle, Power, PowerOff, History, Play } from "lucide-react";
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

// Типы для доходов из API
interface ApiIncome {
  _id: string;
  userId: string;
  source: string;
  amount: string;
  description?: string;
  date: string;
  type: 'salary' | 'bonus' | 'investment' | 'freelance' | 'other';
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
  type: string;
  isAutoCreated?: boolean;
  recurringIncomeId?: string;
}

// Типы для регулярных доходов
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

// Маппинг типов доходов для отображения
const INCOME_TYPE_LABELS: Record<string, string> = {
  salary: "Зарплата",
  bonus: "Бонус",
  investment: "Инвестиции",
  freelance: "Фриланс",
  other: "Другое"
};

const INCOME_TYPE_COLORS: Record<string, string> = {
  salary: "#10b981",
  bonus: "#3b82f6",
  investment: "#8b5cf6",
  freelance: "#f59e0b",
  other: "#6b7280"
};

function Income() {
  const { addNotification } = useAppActions();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringIncome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringIncome | null>(null);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
  }, []);

const loadData = async () => {
  try {
    setIsLoading(true);
    await Promise.all([loadIncomes(), loadRecurringIncomes()]);
    
    // Автоматическая обработка после загрузки
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

const autoProcessRecurringIncomes = async () => {
  try {
    const response = await apiService.processRecurringIncomes();
    
    if (response.success && response.created > 0) {
      addNotification({ 
        message: `🎉 Автоматически создано доходов: ${response.created}`, 
        type: 'success' 
      });
      // Перезагружаем только доходы
      await loadIncomes();
    }
  } catch (error: any) {
    console.error('Auto process error:', error);
    // Тихо игнорируем ошибки автоматической обработки
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
          type: income.type,
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

  // Обработка регулярных доходов (автоматическое создание)
  const handleProcessRecurring = async () => {
    try {
      setIsProcessing(true);
      const response = await apiService.processRecurringIncomes();
      
      if (response.success) {
        if (response.created > 0) {
          addNotification({ 
            message: response.message, 
            type: 'success' 
          });
          await loadData(); // Перезагружаем данные
        } else {
          addNotification({ 
            message: 'Нет доходов для автоматического создания', 
            type: 'info' 
          });
        }
      }
    } catch (error: any) {
      console.error('Process recurring error:', error);
      addNotification({ 
        message: error.response?.data?.message || 'Ошибка обработки регулярных доходов', 
        type: 'error' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Обработчики для обычных доходов
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
      addNotification({ 
        message: error.response?.data?.message || 'Ошибка сохранения дохода', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteIncome = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот доход?')) {
      return;
    }

    try {
      const response = await apiService.deleteIncome(id);
      if (response.success) {
        await loadIncomes();
        addNotification({ message: "Доход удален", type: "info" });
      }
    } catch (error: any) {
      console.error('Delete income error:', error);
      addNotification({ 
        message: error.response?.data?.message || 'Ошибка удаления дохода', 
        type: 'error' 
      });
    }
  };

  // Обработчики для регулярных доходов
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
      addNotification({ 
        message: error.response?.data?.message || 'Ошибка сохранения шаблона', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecurring = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот шаблон? Созданные доходы сохранятся.')) {
      return;
    }

    try {
      const response = await apiService.deleteRecurringIncome(id);
      if (response.success) {
        await loadRecurringIncomes();
        addNotification({ message: "Шаблон удален", type: "info" });
      }
    } catch (error: any) {
      console.error('Delete recurring error:', error);
      addNotification({ 
        message: error.response?.data?.message || 'Ошибка удаления шаблона', 
        type: 'error' 
      });
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
      addNotification({ 
        message: error.response?.data?.message || 'Ошибка изменения статуса', 
        type: 'error' 
      });
    }
  };

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
    return recurringIncomes
      .filter(rec => rec.isActive)
      .reduce((sum, rec) => sum + rec.amount, 0);
  };

  // Данные для аналитики
  const getIncomeByType = () => {
    const typeTotals = incomes.reduce((acc, income) => {
      const typeName = INCOME_TYPE_LABELS[income.type] || income.type;
      const typeColor = INCOME_TYPE_COLORS[income.type] || "#6b7280";
      
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

    return Object.values(monthlyData)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incomes">Доходы</TabsTrigger>
          <TabsTrigger value="recurring">
            Шаблоны ({recurringIncomes.length})
          </TabsTrigger>
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
                      <Select name="type" defaultValue={editingIncome?.type || "salary"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salary">Зарплата</SelectItem>
                          <SelectItem value="bonus">Бонус</SelectItem>
                          <SelectItem value="investment">Инвестиции</SelectItem>
                          <SelectItem value="freelance">Фриланс</SelectItem>
                          <SelectItem value="other">Другое</SelectItem>
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
                              {INCOME_TYPE_LABELS[income.type] || income.type}
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
                        <Select name="type" defaultValue={editingRecurring?.type || "salary"}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="salary">Зарплата</SelectItem>
                            <SelectItem value="bonus">Бонус</SelectItem>
                            <SelectItem value="investment">Инвестиции</SelectItem>
                            <SelectItem value="freelance">Фриланс</SelectItem>
                            <SelectItem value="other">Другое</SelectItem>
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
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          recurring.isActive 
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
                              {INCOME_TYPE_LABELS[recurring.type] || recurring.type}
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
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
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
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
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
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${INCOME_TYPE_COLORS[recurring.type]}20` }}>
                              <Briefcase className="w-5 h-5" style={{ color: INCOME_TYPE_COLORS[recurring.type] }} />
                            </div>
                            <div>
                              <p className="font-medium">{recurring.source}</p>
                              <p className="text-xs text-muted-foreground">
                                Каждое {recurring.recurringDay} число • {INCOME_TYPE_LABELS[recurring.type]}
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