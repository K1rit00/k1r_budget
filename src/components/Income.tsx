import { useState, useEffect } from "react";
import { TrendingUp, Plus, DollarSign, Briefcase, Edit, Trash2, Target, Calendar, BarChart3, Filter, FileText, Loader2, RefreshCw, AlertCircle } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { apiService } from "../services/api";
import type { IncomeGoal, IncomeCategory } from "../types";

// Типы для доходов из API
interface ApiIncome {
  _id: string;
  userId: string;
  source: string;
  amount: string;
  description?: string;
  date: string;
  type: 'salary' | 'bonus' | 'investment' | 'freelance' | 'other';
  isRecurring: boolean;
  recurringDay?: number;
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
  isRecurring: boolean;
  recurringDay?: number;
  isAutoCreated?: boolean; // Флаг автоматически созданного дохода
  sourceRecurringId?: string; // ID шаблона, из которого создан
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);
  const [recurringIncomes, setRecurringIncomes] = useState<Income[]>([]);
  const [pendingRecurringCount, setPendingRecurringCount] = useState(0);
  
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [recurringDayEnabled, setRecurringDayEnabled] = useState(false);

  // Загрузка доходов при монтировании
  useEffect(() => {
    loadIncomes();
  }, []);

  // Проверка регулярных доходов при загрузке
  useEffect(() => {
    if (incomes.length > 0) {
      checkAndCreateRecurringIncomes();
    }
  }, [incomes]);

  const loadIncomes = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getIncome();
      
      if (response.success) {
        const mappedIncomes = response.data.map((income: ApiIncome) => ({
          id: income._id,
          source: income.source,
          amount: parseFloat(income.amount),
          description: income.description,
          date: income.date,
          type: income.type,
          isRecurring: income.isRecurring,
          recurringDay: income.recurringDay,
          isAutoCreated: income.description?.includes('[AUTO]') || false,
        }));
        setIncomes(mappedIncomes);
        
        // Сохраняем регулярные доходы отдельно
        const recurring = mappedIncomes.filter((inc: Income) => inc.isRecurring);
        setRecurringIncomes(recurring);
      }
    } catch (error: any) {
      console.error('Load incomes error:', error);
      addNotification({ 
        message: error.response?.data?.message || 'Ошибка загрузки доходов', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Автоматическое создание регулярных доходов
  const checkAndCreateRecurringIncomes = async () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    let createdCount = 0;
    const createdIncomes: string[] = [];

    for (const income of recurringIncomes) {
      if (!income.recurringDay) continue;

      // Проверяем, был ли уже создан доход в этом месяце из этого шаблона
      const existsThisMonth = incomes.some(inc => {
        const incDate = new Date(inc.date);
        return inc.source === income.source &&
               inc.amount === income.amount &&
               inc.type === income.type &&
               incDate.getMonth() === currentMonth &&
               incDate.getFullYear() === currentYear &&
               !inc.isRecurring; // Проверяем только реальные доходы
      });

      // Если день наступил и дохода в этом месяце еще нет
      if (currentDay >= income.recurringDay && !existsThisMonth) {
        try {
          // Создаем новый доход с датой = recurringDay текущего месяца
          const incomeDate = new Date(currentYear, currentMonth, income.recurringDay);
          
          const newIncomeData = {
            source: income.source,
            amount: income.amount.toString(),
            date: incomeDate.toISOString().split('T')[0],
            type: income.type,
            description: `[AUTO] ${income.description || 'Регулярный доход создан автоматически'}`,
            isRecurring: false,
            recurringDay: undefined
          };

          const response = await apiService.createIncome(newIncomeData);
          
          if (response.success) {
            createdCount++;
            createdIncomes.push(income.source);
          }
        } catch (error) {
          console.error('Error creating recurring income:', error);
        }
      }
    }

    // Уведомляем пользователя о созданных доходах
    if (createdCount > 0) {
      await loadIncomes(); // Обновляем список
      addNotification({ 
        message: `Автоматически создано доходов: ${createdCount} (${createdIncomes.join(', ')})`, 
        type: 'success',
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
    return recurringIncomes.reduce((sum, income) => sum + income.amount, 0);
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
      .slice(-12); // Последние 12 месяцев
  };

  // Обработчики форм
  const handleIncomeSubmit = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      
      const isRecurring = formData.get("isRecurring") === "on";
      const recurringDay = formData.get("recurringDay") ? parseInt(formData.get("recurringDay") as string) : undefined;

      const incomeData = {
        source: formData.get("source") as string,
        amount: formData.get("amount") as string,
        date: formData.get("date") as string,
        type: formData.get("type") as string,
        description: formData.get("description") as string || undefined,
        isRecurring,
        recurringDay: isRecurring ? recurringDay : undefined,
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
        await loadIncomes(); // Перезагружаем список
        setIsIncomeDialogOpen(false);
        setEditingIncome(null);
        setRecurringDayEnabled(false);
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

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setRecurringDayEnabled(income.isRecurring);
    setIsIncomeDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsIncomeDialogOpen(false);
    setEditingIncome(null);
    setRecurringDayEnabled(false);
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
              {recurringIncomes.length} шаблонов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs defaultValue="incomes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incomes">Доходы</TabsTrigger>
          <TabsTrigger value="recurring">
            Регулярные ({recurringIncomes.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

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
                    <div className="space-y-3 border p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="isRecurring" 
                          name="isRecurring" 
                          defaultChecked={editingIncome?.isRecurring}
                          onCheckedChange={(checked) => setRecurringDayEnabled(!!checked)}
                        />
                        <Label htmlFor="isRecurring" className="font-medium">
                          Регулярный доход (шаблон)
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Регулярный доход - это шаблон, который не учитывается в статистике. 
                        Система автоматически создаст реальные доходы в нужные дни месяца.
                      </p>
                      {(recurringDayEnabled || editingIncome?.isRecurring) && (
                        <div>
                          <Label htmlFor="recurringDay">День месяца для автоматического создания</Label>
                          <Input 
                            id="recurringDay" 
                            name="recurringDay" 
                            type="number"
                            min="1"
                            max="31"
                            defaultValue={editingIncome?.recurringDay || 1}
                            placeholder="1-31"
                            required={recurringDayEnabled}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Например: 5 = каждое 5 число месяца
                          </p>
                        </div>
                      )}
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
                        onClick={handleCloseDialog}
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
                {incomes.filter(inc => !inc.isRecurring).length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Пока нет добавленных доходов. Начните с добавления первого дохода.
                    </p>
                  </div>
                ) : (
                  incomes
                    .filter(inc => !inc.isRecurring) // Показываем только реальные доходы
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
                            onClick={() => handleEditIncome(income)}
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

        <TabsContent value="recurring">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Шаблоны регулярных доходов</CardTitle>
              <p className="text-sm text-muted-foreground">
                Эти доходы не учитываются в статистике. Система автоматически создаст реальные доходы в указанные дни месяца.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recurringIncomes.length === 0 ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Нет регулярных доходов. Создайте доход с отметкой "Регулярный доход".
                    </p>
                  </div>
                ) : (
                  recurringIncomes.map(income => (
                    <div key={income.id} className="flex items-center justify-between p-4 border rounded-lg bg-purple-50/50 dark:bg-purple-950/10">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <RefreshCw className="w-4 h-4 text-purple-600" />
                          <h4 className="font-medium">{income.source}</h4>
                          <Badge variant="secondary" className="text-xs">
                            Шаблон
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {INCOME_TYPE_LABELS[income.type] || income.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Автоматически создается каждое {income.recurringDay} число месяца
                        </p>
                        {income.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {income.description.replace('[AUTO] ', '')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-purple-600">
                          {income.amount.toLocaleString("kk-KZ")} ₸
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditIncome(income)}
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