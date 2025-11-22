import { useState, useEffect } from "react";
import { Plus, Calculator, ArrowRightLeft, Loader2, CheckCircle2, History, Wallet, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { apiService } from "../services/api";
import type { MonthlyExpense, DepositTransaction } from "../types";

interface ExpenseTransaction {
  _id: string;
  amount: number;
  date: string;
  description: string;
  expenseId: {
    name: string;
    category?: {
      name: string;
      color?: string;
    }
  };
}

function QuickExpenseAdd() {
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
  // Меняем тип стейта, если был строгий
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    expenseId: "",
    amount: 0,
    description: "",
    date: new Date().toISOString().split('T')[0],
  });

  const [quickAmounts] = useState([500, 1000, 2000, 5000, 10000, 20000]);

  // 1. Загрузка списка расходов для формы (Левая часть)
  const fetchMonthlyExpenses = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-11

      // ИСПРАВЛЕНИЕ 1: Правильная установка времени для endDate (конец дня)
      // Это предотвращает потерю данных за последний день месяца при конвертации в UTC
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

      // Логируем, что отправляем (поможет понять, верно ли уходят даты)
      console.log("Fetching expenses with:", { startDate, endDate, month: month + 1, year });

      const response = await apiService.getMonthlyExpenses({
        startDate,
        endDate,
        // Добавляем month и year на случай, если бэкенд использует их приоритетно
        month: month + 1,
        year: year
      });

      console.log("Expenses response:", response); // Смотрим, что пришло

      if (response.success || response) { // Иногда success может отсутствовать, проверяем наличие ответа
        // ИСПРАВЛЕНИЕ 2: Более гибкий поиск массива с данными
        // Проверяем разные варианты вложенности, которые могут быть на бэкенде
        const rawData = response.data || response;

        const expensesData =
          rawData.expenses ||
          rawData.monthlyExpenses ||
          rawData.docs ||
          rawData;

        if (Array.isArray(expensesData)) {
          setMonthlyExpenses(expensesData);
        } else {
          console.warn("Полученные данные не являются массивом:", expensesData);
          setMonthlyExpenses([]);
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке расходов:", error);
      toast.error("Не удалось загрузить список расходов");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Загрузка истории операций (Правая часть)
  const fetchTransactions = async () => {
    try {
      setIsHistoryLoading(true);
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // !!! ЗАМЕНА МЕТОДА !!!
      // Теперь берем историю оплат расходов, а не списаний депозитов
      const response = await apiService.getExpenseTransactionsHistory({
        startDate,
        endDate
      });

      if (response.success) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error("Ошибка загрузки истории:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyExpenses();
    fetchTransactions();
  }, []);

  const getExpenseValues = (expense: any) => {
    const planned = Number(expense.amount || expense.plannedAmount || 0);
    const actual = Number(expense.actualAmount || 0);
    const remaining = planned - actual;
    return { planned, actual, remaining };
  };

  const handleExpenseSelect = (expenseId: string) => {
    const expense = monthlyExpenses.find(e => (e.id || e._id) === expenseId);
    if (expense) {
      const { remaining } = getExpenseValues(expense);
      setFormData(prev => ({
        ...prev,
        expenseId,
        amount: remaining > 0 ? remaining : 0
      }));
    } else {
      setFormData(prev => ({ ...prev, expenseId }));
    }
  };

  const handleQuickAmount = (amount: number) => {
    setFormData(prev => ({ ...prev, amount }));
  };

  const handleAddExpense = async () => {
    if (!formData.expenseId || !formData.amount) {
      toast.error("Выберите расход и укажите сумму");
      return;
    }

    const selectedExpense = monthlyExpenses.find(e => (e.id || e._id) === formData.expenseId);
    if (!selectedExpense) return;

    try {
      setIsSubmitting(true);

      const { planned, actual } = getExpenseValues(selectedExpense);
      const newActualAmount = actual + formData.amount;

      let newStatus = selectedExpense.status;
      if (newActualAmount >= planned) {
        newStatus = "paid";
      } else if (selectedExpense.status === "planned" && newActualAmount > 0) {
        newStatus = "planned";
      }

      const updatePayload = {
        actualAmount: newActualAmount,
        status: newStatus,
        date: formData.date, // <-- Важно передать дату, чтобы транзакция записалась нужным числом
        description: formData.description // <-- Передаем описание для транзакции
          ? (selectedExpense.description ? `${selectedExpense.description}\n${formData.description}` : formData.description)
          : selectedExpense.description
      };

      const idToUpdate = selectedExpense.id || selectedExpense._id;
      if (!idToUpdate) throw new Error("ID расхода не найден");

      await apiService.updateMonthlyExpense(idToUpdate, updatePayload);

      toast.success(`Расход "${selectedExpense.name}" обновлен!`);

      // Обновляем оба списка: и состояние расходов, и историю операций
      await Promise.all([
        fetchMonthlyExpenses(),
        fetchTransactions()
      ]);

      setFormData(prev => ({
        ...prev,
        expenseId: "",
        amount: 0,
        description: ""
      }));

    } catch (error) {
      console.error("Ошибка сохранения:", error);
      toast.error("Ошибка при сохранении расхода");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedExpensesForSelect = [...monthlyExpenses].sort((a, b) => {
    const valA = getExpenseValues(a);
    const valB = getExpenseValues(b);
    const aPaid = valA.actual >= valA.planned;
    const bPaid = valB.actual >= valB.planned;
    if (aPaid === bPaid) return 0;
    return aPaid ? 1 : -1;
  });

  const totalStats = monthlyExpenses.reduce((acc, curr) => {
    const vals = getExpenseValues(curr);
    return {
      planned: acc.planned + vals.planned,
      actual: acc.actual + vals.actual
    };
  }, { planned: 0, actual: 0 });

  return (
    <div className="space-y-6">
      {/* Верхняя панель: Обзор расходов */}
      <Card className="rounded-2xl border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              <span>Состояние расходов ({new Date().toLocaleString('ru', { month: 'long' })})</span>
            </div>
          </CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <div>Всего по плану: <span className="text-foreground font-medium">{totalStats.planned.toLocaleString("kk-KZ")} ₸</span></div>
            <div>Потрачено: <span className="text-foreground font-medium">{totalStats.actual.toLocaleString("kk-KZ")} ₸</span></div>
          </div>
        </CardHeader>
        <CardContent className="px-0 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : monthlyExpenses.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-xl border">
              <p className="text-muted-foreground">Нет расходов на этот месяц</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {monthlyExpenses.map((expense) => {
                const expId = expense.id || expense._id || Math.random().toString();
                const { planned, actual, remaining } = getExpenseValues(expense);

                const isPaid = actual >= planned;
                const isOverBudget = actual > planned;
                const indicatorColor = isPaid ? "bg-green-500" : (isOverBudget ? "bg-red-500" : "bg-blue-500");

                return (
                  <div key={expId} className="bg-black/95 dark:bg-black border border-gray-800 rounded-xl p-4 text-white shadow-sm">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <div className={`w-2 h-2 rounded-full ${indicatorColor}`} />
                      <span className="font-bold text-lg truncate mr-2">{expense.name}</span>
                      <Badge variant="secondary" className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-0 text-xs font-normal">
                        {expense.status === 'paid' ? 'Оплачено' : 'Запланировано'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 mb-1">Категория</div>
                        <div className="font-medium">{expense.category?.name || "Без категории"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Заложено</div>
                        <div className="font-bold">{planned.toLocaleString("kk-KZ")} ₸</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Потратил</div>
                        <div className="font-medium">{actual > 0 ? `${actual.toLocaleString("kk-KZ")} ₸` : "-"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Остаток</div>
                        <div className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-red-500'}`}>
                          {remaining.toLocaleString("kk-KZ")} ₸
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Основная рабочая область */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ФОРМА (Слева) */}
        <Card className="rounded-2xl border-blue-100 dark:border-blue-900/30 shadow-lg h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Внести оплату
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="expense-select">Выберите расход *</Label>
              <Select
                value={formData.expenseId}
                onValueChange={handleExpenseSelect}
                disabled={isLoading}
              >
                <SelectTrigger id="expense-select" className="h-12">
                  <SelectValue placeholder="Выберите расход из списка" />
                </SelectTrigger>
                <SelectContent>
                  {sortedExpensesForSelect.map((expense) => {
                    const expId = expense.id || expense._id;
                    const { remaining } = getExpenseValues(expense);
                    const isPaid = remaining <= 0;
                    return (
                      <SelectItem key={expId} value={expId!} className="py-3">
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{expense.name}</span>
                          <span className={`text-xs ${isPaid ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {isPaid ? "Оплачено" : `Остаток: ${remaining.toLocaleString("kk-KZ")} ₸`}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Сумма оплаты (₸)</Label>
              <div className="relative mt-1">
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  placeholder="0"
                  className="pl-4 h-12 text-lg font-medium"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(amount)}
                    className="text-xs hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                  >
                    +{amount.toLocaleString("kk-KZ")}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Дата</Label>
                <Input
                  id="date"
                  type="date"
                  className="date-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Комментарий</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Например: Оплата части долга"
                rows={2}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleAddExpense}
              className="w-full h-12 text-base"
              disabled={!formData.amount || !formData.expenseId || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Внести расход
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ИСТОРИЯ ОПЕРАЦИЙ (Справа) */}
        <Card className="rounded-2xl h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Операции в этом месяце
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                Транзакции
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isHistoryLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                <Wallet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p>В этом месяце еще не было операций</p>
                <p className="text-xs text-muted-foreground mt-1">Здесь отображаются списания с депозитов</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {transactions.map((tx) => (
                  <div key={tx._id || Math.random().toString()} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 animate-in fade-in">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                        {/* Иконка чека/оплаты вместо графика */}
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium text-sm truncate whitespace-nowrap">
                          {/* Выводим Имя расхода, если есть populate, иначе описание */}
                          {tx.expenseId?.name || tx.description || "Оплата"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        -{Number(tx.amount).toLocaleString("kk-KZ")} ₸
                      </p>
                      {/* Можно добавить название категории мелко */}
                      {tx.expenseId?.category && (
                        <p className="text-[10px] text-muted-foreground">{tx.expenseId.category.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default QuickExpenseAdd;