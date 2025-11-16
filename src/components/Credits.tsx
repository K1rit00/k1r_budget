import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { CreditCard, Plus, Edit, Trash2, AlertCircle, TrendingDown, DollarSign, CheckCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { apiService } from "../services/api";
import { Checkbox } from "./ui/checkbox";

interface Bank {
  _id: string;
  id?: string;
  name: string;
  description?: string;
}

interface IncomeCategory {
  _id: string;
  id?: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'income';
}

interface Credit {
  _id: string;
  id?: string;
  name: string;
  bank: Bank | string;
  amount: number;
  currentBalance: number;
  interestRate: number;
  isOldCredit?: boolean;
  initialDebt?: number;
  monthlyPayment: number;
  monthlyPaymentDate: number;
  startDate: string;
  endDate: string; // Оставляем для расчетов
  termInMonths: number; // <<< ИЗМЕНЕНИЕ: Добавлено
  type: "credit" | "loan" | "installment";
  status: "active" | "paid" | "overdue" | "cancelled";
  description?: string;
  accountNumber?: string;
  contractNumber?: string;
}

interface CreditPayment {
  _id: string;
  id?: string;
  credit: Credit | string;
  amount: number;
  paymentDate: string;
  principalAmount: number;
  interestAmount: number;
  status: "paid" | "pending" | "cancelled";
  notes?: string;
  receiptNumber?: string;
}

interface AvailableIncome {
  _id: string;
  id: string;
  name: string;
  source: string;
  amount: number;
  availableAmount: number;
  usedAmount: number;
  date: string;
  type: string | {
    _id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  description?: string;
}

interface AvailableDeposit {
  _id: string;
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
  type: string;
}

function Credits() {
  const { addNotification } = useAppActions();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);


  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isBulkPaymentDialogOpen, setIsBulkPaymentDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isMonthlyPayment, setIsMonthlyPayment] = useState(false);

  // Новые состояния для источников оплаты
  const [availableIncomes, setAvailableIncomes] = useState<AvailableIncome[]>([]);
  const [availableDeposits, setAvailableDeposits] = useState<AvailableDeposit[]>([]);
  const [selectedSourceType, setSelectedSourceType] = useState<"cash" | "income" | "deposit">("cash");
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>("cash");
  const [isOldCredit, setIsOldCredit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [creditsRes, banksRes, paymentsRes, categoriesRes] = await Promise.all([
        apiService.getCredits(),
        apiService.getBanks(),
        apiService.getAllPayments(),
        apiService.getCategories('income'), // Добавлено
        loadAvailableIncomes(),
        loadAvailableDeposits()
      ]);

      if (creditsRes.success) {
        setCredits(creditsRes.data);
      }
      if (banksRes.success) {
        setBanks(banksRes.data);
      }
      if (paymentsRes.success) {
        setPayments(paymentsRes.data);
      }
      if (categoriesRes.success) {
        setIncomeCategories(categoriesRes.data || []);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      addNotification({
        message: error.response?.data?.message || 'Ошибка при загрузке данных',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (income: AvailableIncome): string => {
    if (typeof income.type === 'object' && income.type !== null) {
      return income.type.name;
    } else if (typeof income.type === 'string') {
      const category = incomeCategories.find(c =>
        (c._id === income.type) || (c.id === income.type)
      );
      return category?.name || "Другое";
    }
    return "Другое";
  };

  const loadAvailableIncomes = async () => {
    try {
      const response = await apiService.getAvailableIncomes();
      setAvailableIncomes(response.data || []);
    } catch (error: any) {
      console.error("Error loading available incomes:", error);
      setAvailableIncomes([]);
    }
  };

  const loadAvailableDeposits = async () => {
    try {
      const response = await apiService.getDeposits({ status: 'active' });
      const activeDeposits = (response.data || [])
        .filter((d: any) => d.currentBalance > 0)
        .map((d: any) => ({
          _id: d._id,
          id: d._id,
          name: d.name || d.bankName,
          bankName: d.bankName,
          accountNumber: d.accountNumber,
          currentBalance: d.currentBalance,
          type: d.type
        }));
      setAvailableDeposits(activeDeposits);
    } catch (error: any) {
      console.error("Error loading available deposits:", error);
      setAvailableDeposits([]);
    }
  };

  const getTotalDebt = () => {
    return credits
      .filter(credit => credit.status === "active")
      .reduce((sum, credit) => sum + credit.currentBalance, 0);
  };

  const getMonthlyPayments = () => {
    return credits
      .filter(credit => credit.status === "active")
      .reduce((sum, credit) => sum + credit.monthlyPayment, 0);
  };

  const getActiveCreditsCount = () => {
    return credits.filter(credit => credit.status === "active").length;
  };

  const getPaymentScheduleData = () => {
    const scheduleData: { [key: string]: { month: string; payments: number } } = {};

    credits.forEach(credit => {
      if (credit.status !== "active") return;

      const startDate = new Date(credit.startDate);
      const endDate = new Date(credit.endDate);

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = currentDate.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });

        if (!scheduleData[monthKey]) {
          scheduleData[monthKey] = { month: monthName, payments: 0 };
        }
        scheduleData[monthKey].payments += credit.monthlyPayment;

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    });

    const today = new Date();
    today.setDate(1); // Устанавливаем 1-е число, чтобы получить ключ именно этого месяца
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    return Object.entries(scheduleData)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([key]) => key >= currentMonthKey) // <-- ДОБАВЛЕН ФИЛЬТР
      .map(([_, value]) => value)
      .slice(0, 12); // Показываем 12 ближайших месяцев, начиная с текущего
  };

  const handleCreditSubmit = async (formData: FormData) => {
    try {
      setActionLoading(true);

      const bankId = formData.get("bank") as string;
      const name = formData.get("name") as string;
      const amount = formData.get("amount") as string;
      const interestRate = formData.get("interestRate") as string;
      const monthlyPayment = formData.get("monthlyPayment") as string;
      const monthlyPaymentDate = formData.get("monthlyPaymentDate") as string;
      const startDate = formData.get("startDate") as string;
      const termInMonths = formData.get("termInMonths") as string; // <<< ИЗМЕНЕНИЕ
      const type = formData.get("type") as "credit" | "loan" | "installment";
      const description = formData.get("description") as string;
      const isOldCredit = formData.get("isOldCredit") === "true";
      const initialDebt = formData.get("initialDebt") as string;

      if (!name || !bankId || !amount || !interestRate || !monthlyPayment ||
        !monthlyPaymentDate || !startDate || !termInMonths || !type) { // <<< ИЗМЕНЕНИЕ
        addNotification({
          message: 'Пожалуйста, заполните все обязательные поля',
          type: 'error'
        });
        return;
      }

      const amountNum = parseFloat(amount);
      const interestRateNum = parseFloat(interestRate);
      const monthlyPaymentNum = parseFloat(monthlyPayment);
      const monthlyPaymentDateNum = parseInt(monthlyPaymentDate);
      const termInMonthsNum = parseInt(termInMonths); // <<< ИЗМЕНЕНИЕ

      // ... (проверки amountNum, interestRateNum, monthlyPaymentNum, monthlyPaymentDateNum)

      // <<< ИЗМЕНЕНИЕ: Новая проверка для termInMonthsNum
      if (isNaN(termInMonthsNum) || termInMonthsNum <= 0) {
        addNotification({ message: 'Срок в месяцах должен быть положительным числом', type: 'error' });
        return;
      }

      const startDateObj = new Date(startDate);

      if (isNaN(startDateObj.getTime())) {
        addNotification({ message: 'Некорректная дата начала', type: 'error' });
        return;
      }

      const creditData = {
        name: name.trim(),
        bank: bankId,
        amount: amountNum,
        interestRate: interestRateNum,
        isOldCredit: isOldCredit,
        initialDebt: isOldCredit && initialDebt ? parseFloat(initialDebt) : undefined,
        monthlyPayment: monthlyPaymentNum,
        monthlyPaymentDate: monthlyPaymentDateNum,
        startDate: startDate,
        termInMonths: termInMonthsNum, // <<< ИЗМЕНЕНИЕ
        type: type,
        description: description?.trim() || undefined,
        accountNumber: undefined,
        contractNumber: undefined
      };

      if (editingCredit) {
        const response = await apiService.updateCredit(editingCredit._id, creditData);

        if (response.success) {
          addNotification({
            message: 'Кредит успешно обновлен',
            type: 'success'
          });
          await loadData();
          setIsCreditDialogOpen(false);
          setEditingCredit(null);
          setIsOldCredit(false);
        }
      } else {
        const response = await apiService.createCredit(creditData);

        if (response.success) {
          addNotification({
            message: 'Кредит успешно добавлен',
            type: 'success'
          });
          await loadData();
          setIsCreditDialogOpen(false);
          setIsOldCredit(false);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };
  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setActionLoading(true);
      const formData = new FormData(e.currentTarget);
      const sourceId = formData.get("sourceId") as string;
      const notes = formData.get("notes") as string;

      // Извлекаем реальный ID депозита, убирая префикс "deposit-"
      let actualSourceId = sourceId;
      if (selectedSourceType === "deposit" && sourceId.startsWith("deposit-")) {
        actualSourceId = sourceId.replace("deposit-", "");
      }

      const paymentData: any = {
        amount: paymentAmount,
        principalAmount: paymentAmount,
        interestAmount: 0,
        notes: notes || undefined
      };

      // Добавляем incomeId или depositId в зависимости от типа источника
      if (selectedSourceType === "income" && actualSourceId && actualSourceId !== "cash") {
        paymentData.incomeId = actualSourceId;
      } else if (selectedSourceType === "deposit" && actualSourceId) {
        paymentData.depositId = actualSourceId;

        // Создаем транзакцию снятия с депозита
        const transactionDescription = `Оплата кредита: ${paymentAmount.toLocaleString("ru-RU")} ₸`;

        try {
          await apiService.createDepositTransaction({
            depositId: actualSourceId,
            type: "withdrawal",
            amount: paymentAmount,
            transactionDate: new Date().toISOString().split('T')[0],
            description: transactionDescription
          });
        } catch (depositError: any) {
          console.error("Error creating deposit transaction:", depositError);
          throw new Error(depositError.response?.data?.message || "Ошибка при снятии средств с депозита");
        }
      }

      const response = await apiService.addPayment(selectedCreditId, paymentData);

      if (response.success) {
        addNotification({ message: "Платеж успешно добавлен", type: "success" });
        await loadData();
        setIsPaymentDialogOpen(false);
        setSelectedCreditId("");
        setPaymentAmount(0);
        setSelectedIncomeId("cash");
        setSelectedSourceType("cash");
        setIsMonthlyPayment(false);
      }
    } catch (error: any) {
      console.error('Error adding payment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Ошибка при добавлении платежа';
      addNotification({
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const payMonthlyPayments = async () => {
    const activeCredits = credits.filter(credit => credit.status === "active");

    if (activeCredits.length === 0) {
      addNotification({ message: "Нет активных кредитов для погашения", type: "info" });
      return;
    }

    // Открываем диалог выбора источника для массового платежа
    setPaymentAmount(getMonthlyPayments());
    setSelectedIncomeId("cash");
    setSelectedSourceType("cash");
    setIsBulkPaymentDialogOpen(true);
  };

  const handleBulkPaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const activeCredits = credits.filter(credit => credit.status === "active");

    if (activeCredits.length === 0) {
      addNotification({ message: "Нет активных кредитов для погашения", type: "info" });
      return;
    }

    try {
      setActionLoading(true);
      const formData = new FormData(e.currentTarget);
      const sourceId = formData.get("sourceId") as string;

      // Извлекаем реальный ID депозита
      let actualSourceId = sourceId;
      if (selectedSourceType === "deposit" && sourceId.startsWith("deposit-")) {
        actualSourceId = sourceId.replace("deposit-", "");
      }

      // Если выбран депозит, сначала создаем транзакцию снятия
      if (selectedSourceType === "deposit" && actualSourceId) {
        const totalAmount = getMonthlyPayments();
        const transactionDescription = `Погашение ежемесячных платежей по ${activeCredits.length} кредитам`;

        try {
          await apiService.createDepositTransaction({
            depositId: actualSourceId,
            type: "withdrawal",
            amount: totalAmount,
            transactionDate: new Date().toISOString().split('T')[0],
            description: transactionDescription
          });
        } catch (depositError: any) {
          console.error("Error creating deposit transaction:", depositError);
          throw new Error(depositError.response?.data?.message || "Ошибка при снятии средств с депозита");
        }
      }

      // Теперь добавляем платежи по каждому кредиту
      const payments = [];
      for (const credit of activeCredits) {
        const paymentData: any = {
          amount: credit.monthlyPayment,
          principalAmount: credit.monthlyPayment,
          interestAmount: 0,
          notes: "Автоматический ежемесячный платеж"
        };

        // Добавляем источник только если не наличка
        if (selectedSourceType === "income" && actualSourceId && actualSourceId !== "cash") {
          paymentData.incomeId = actualSourceId;
        } else if (selectedSourceType === "deposit" && actualSourceId) {
          paymentData.depositId = actualSourceId;
        }

        const response = await apiService.addPayment(credit._id, paymentData);
        if (response.success) {
          payments.push(response.data);
        }
      }

      const totalAmount = payments.reduce((sum, p) => sum + (p.payment?.amount || 0), 0);

      addNotification({
        message: `Погашено ${payments.length} платежей на общую сумму ${totalAmount.toFixed(2)} ₸`,
        type: "success"
      });

      await loadData();
      setIsBulkPaymentDialogOpen(false);
      setSelectedIncomeId("cash");
      setSelectedSourceType("cash");
    } catch (error: any) {
      console.error('Error paying monthly payments:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Ошибка при погашении платежей';
      addNotification({
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCredit = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот кредит?")) return;

    try {
      setActionLoading(true);
      const response = await apiService.deleteCredit(id);

      if (response.success) {
        addNotification({ message: "Кредит удален", type: "info" });
        await loadData();
      }
    } catch (error: any) {
      console.error('Error deleting credit:', error);
      addNotification({
        message: error.response?.data?.message || 'Ошибка при удалении кредита',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openPaymentDialog = (credit: Credit, isMonthly: boolean = false) => {
    setSelectedCreditId(credit._id);
    setPaymentAmount(isMonthly ? credit.monthlyPayment : credit.currentBalance);
    setIsMonthlyPayment(isMonthly);
    setSelectedIncomeId("cash");
    setSelectedSourceType("cash");
    setIsPaymentDialogOpen(true);
  };

  const getPaymentProgress = (credit: Credit) => {
    const paidAmount = credit.amount - credit.currentBalance;
    return (paidAmount / credit.amount) * 100;
  };

  const calculateTotalInterest = (credit: Credit) => {
    const startDate = new Date(credit.startDate);
    const endDate = new Date(credit.endDate);

    let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    monthsDiff -= startDate.getMonth();
    monthsDiff += endDate.getMonth();
    monthsDiff = Math.max(monthsDiff, 0);

    if (monthsDiff === 0) return 0;

    const totalPayments = credit.monthlyPayment * monthsDiff;
    const totalInterest = totalPayments - credit.amount;

    return totalInterest > 0 ? totalInterest : 0;
  };

  const getCreditTerm = (credit: Credit) => {
    const startDate = new Date(credit.startDate);
    const endDate = new Date(credit.endDate);

    let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    monthsDiff -= startDate.getMonth();
    monthsDiff += endDate.getMonth();
    monthsDiff = Math.max(monthsDiff, 0);

    const years = Math.floor(monthsDiff / 12);
    const months = monthsDiff % 12;

    if (years === 0) {
      return `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`;
    } else if (months === 0) {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    } else {
      const yearText = years === 1 ? 'год' : years < 5 ? 'года' : 'лет';
      const monthText = months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев';
      return `${years} ${yearText} ${months} ${monthText}`;
    }
  };

  const getDaysUntilNextPayment = (credit: Credit) => {
    const today = new Date();
    const currentDay = today.getDate();
    const paymentDay = credit.monthlyPaymentDate;

    let nextPaymentDate: Date;

    if (currentDay < paymentDay) {
      nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    } else {
      nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
    }

    const diffTime = nextPaymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getNextPaymentDate = (credit: Credit) => {
    const today = new Date();
    const currentDay = today.getDate();
    const paymentDay = credit.monthlyPaymentDate;

    let nextPaymentDate: Date;

    if (currentDay < paymentDay) {
      nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    } else {
      nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
    }

    return nextPaymentDate.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long"
    });
  };

  const getBankName = (bank: Bank | string) => {
    if (typeof bank === 'string') return bank;
    return bank.name;
  };

  const getItemId = (item: any): string => {
    return item._id || item.id || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">Общий долг</span>
            </div>
            <p className="text-2xl text-red-900 dark:text-red-100">
              {getTotalDebt().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-orange-700 dark:text-orange-300">Ежемесячно</span>
            </div>
            <p className="text-2xl text-orange-900 dark:text-orange-100">
              {getMonthlyPayments().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">Активных кредитов</span>
            </div>
            <p className="text-2xl text-blue-900 dark:text-blue-100">
              {getActiveCreditsCount()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Кнопка погашения ежемесячных платежей */}
      {getActiveCreditsCount() > 0 && (
        <Card className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Погасить ежемесячные платежи
                </h3>
                <p className="text-sm text-muted-foreground">
                  Автоматически добавить платежи для всех активных кредитов ({getActiveCreditsCount()} шт.) на общую сумму {getMonthlyPayments().toLocaleString("kk-KZ")} ₸
                </p>
              </div>
              <Button
                onClick={payMonthlyPayments}
                className="bg-green-500 hover:bg-green-600 text-white shadow-md"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Погасить все
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Основной контент */}
      <Tabs defaultValue="credits" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credits">Кредиты</TabsTrigger>
          <TabsTrigger value="payments">Платежи</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="credits">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Управление кредитами</CardTitle>
              <Dialog open={isCreditDialogOpen} onOpenChange={(isOpen) => {
                setIsCreditDialogOpen(isOpen);
                if (!isOpen) {
                  setEditingCredit(null);
                  setIsOldCredit(false); // <-- ДОБАВИТЬ ЭТО
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingCredit(null);
                    setIsOldCredit(false); // <-- ДОБАВЬТЕ ЭТУ СТРОКУ
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить кредит
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCredit ? "Редактировать кредит" : "Добавить кредит"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleCreditSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название кредита</Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={editingCredit?.name}
                        placeholder="Например: Ипотека, Автокредит"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bank">Банк</Label>
                      <Select name="bank" defaultValue={typeof editingCredit?.bank === 'string' ? editingCredit.bank : editingCredit?.bank?._id} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите банк" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map(bank => (
                            <SelectItem key={bank._id} value={bank._id}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="type">Тип кредита</Label>
                      <Select name="type" defaultValue={editingCredit?.type || "credit"} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Кредит</SelectItem>
                          <SelectItem value="loan">Займ</SelectItem>
                          <SelectItem value="installment">Рассрочка</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="amount">Сумма кредита (₸)</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={editingCredit?.amount}
                        placeholder="1000000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="interestRate">Процентная ставка (%)</Label>
                      <Input
                        id="interestRate"
                        name="interestRate"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={editingCredit?.interestRate}
                        placeholder="12.5"
                      />
                    </div>

                    {/* НОВЫЕ ПОЛЯ: СТАРЫЙ КРЕДИТ И ТЕКУЩАЯ ЗАДОЛЖЕННОСТЬ */}
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isOldCredit"
                          name="isOldCredit"
                          value="true"
                          checked={isOldCredit}
                          onChange={(e) => {
                            setIsOldCredit(e.target.checked);
                            if (!e.target.checked) {
                              // Сбрасываем initialDebt если чекбокс снят
                              const input = document.getElementById('initialDebt') as HTMLInputElement;
                              if (input) input.value = '';
                            }
                          }}
                        // defaultChecked={editingCredit?.isOldCredit} // <-- УДАЛИТЕ ЭТУ СТРОКУ
                        />
                        <Label htmlFor="isOldCredit" className="cursor-pointer font-normal text-sm">
                          Старый кредит (уже частично погашен)
                        </Label>
                      </div>

                      {isOldCredit && (
                        <div className="pl-6 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          <Label htmlFor="initialDebt" className="text-sm font-medium">
                            Текущая задолженность (₸) *
                          </Label>
                          <Input
                            id="initialDebt"
                            name="initialDebt"
                            type="number"
                            step="0.01"
                            required={isOldCredit}
                            defaultValue={editingCredit?.initialDebt}
                            placeholder="500000"
                            className="bg-background"
                          />
                          <p className="text-xs text-muted-foreground">
                            Укажите остаток долга на текущий момент. Эта сумма будет использована как текущий баланс кредита.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="monthlyPaymentDate">День платежа</Label>
                        <Input
                          id="monthlyPaymentDate"
                          name="monthlyPaymentDate"
                          type="number"
                          min="1"
                          max="31"
                          step="1"
                          required
                          defaultValue={editingCredit?.monthlyPaymentDate}
                          placeholder="15"
                        />
                      </div>
                      <div>
                        <Label htmlFor="monthlyPayment">Ежемесячный платеж (₸)</Label>
                        <Input
                          id="monthlyPayment"
                          name="monthlyPayment"
                          type="number"
                          step="0.01"
                          required
                          defaultValue={editingCredit?.monthlyPayment}
                          placeholder="50000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Дата оформления</Label>
                        <Input
                          id="startDate"
                          name="startDate"
                          type="date"
                          className="date-input"
                          required
                          defaultValue={
                            editingCredit?.startDate
                              ? new Date(editingCredit.startDate).toISOString().split('T')[0]
                              : ""
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="termInMonths">Срок (в месяцах)</Label>
                        <Input
                          id="termInMonths"
                          name="termInMonths"
                          type="number"
                          min="1"
                          step="1"
                          required
                          defaultValue={editingCredit?.termInMonths}
                          placeholder="36"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingCredit?.description}
                        placeholder="Дополнительная информация"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={actionLoading}>
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          editingCredit ? "Обновить" : "Добавить"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreditDialogOpen(false);
                          setEditingCredit(null);
                          setIsOldCredit(false);
                        }}
                        disabled={actionLoading}
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
                {credits.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="mb-2">Кредиты не найдены</h3>
                    <p className="text-sm text-muted-foreground mb-4">Добавьте первый кредит для начала отслеживания</p>
                    <Button onClick={() => setIsCreditDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить кредит
                    </Button>
                  </div>
                ) : (
                  credits.map(credit => {
                    const progress = getPaymentProgress(credit);
                    const daysUntilPayment = getDaysUntilNextPayment(credit);

                    return (
                      <div key={credit._id} className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3>{credit.name}</h3>
                              <Badge variant={credit.status === "active" ? "default" : credit.status === "paid" ? "secondary" : "destructive"}>
                                {credit.status === "active" ? "Активный" : credit.status === "paid" ? "Погашен" : "Просрочен"}
                              </Badge>
                              <Badge variant="outline">{credit.type === "credit" ? "Кредит" : credit.type === "loan" ? "Займ" : "Рассрочка"}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getBankName(credit.bank)} • {credit.interestRate}% годовых
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCredit(credit);
                                setIsOldCredit(credit.isOldCredit || false); // <-- ДОБАВЬТЕ ЭТУ СТРОКУ
                                setIsCreditDialogOpen(true);
                              }}
                              disabled={actionLoading}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCredit(credit._id)}
                              disabled={actionLoading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Остаток долга</p>
                            <p className="text-xl">{credit.currentBalance.toLocaleString("kk-KZ")} ₸</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Ежемесячный платеж</p>
                            <p className="text-xl">{credit.monthlyPayment.toLocaleString("kk-KZ")} ₸</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Каждое {credit.monthlyPaymentDate} число
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Следующий платеж</p>
                            <p className="text-xl">{getNextPaymentDate(credit)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Через {daysUntilPayment} {daysUntilPayment === 1 ? 'день' : daysUntilPayment < 5 ? 'дня' : 'дней'}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-muted-foreground mb-2">
                            <span>Прогресс погашения: {progress.toFixed(1)}%</span>
                            <span>
                              {(credit.amount - credit.currentBalance).toLocaleString("kk-KZ")} ₸ / {credit.amount.toLocaleString("kk-KZ")} ₸
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-1">Срок кредита</p>
                              <p className="text-lg">
                                {getCreditTerm(credit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Переплата по процентам</p>
                              <p className="text-lg text-orange-600 dark:text-orange-400">
                                {calculateTotalInterest(credit).toLocaleString("kk-KZ")} ₸
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Общая сумма выплат</p>
                              <p className="text-lg">
                                {(credit.amount + calculateTotalInterest(credit)).toLocaleString("kk-KZ")} ₸
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm pt-4 border-t">
                          <span className="text-muted-foreground">
                            {new Date(credit.startDate).toLocaleDateString("ru-RU")} - {new Date(credit.endDate).toLocaleDateString("ru-RU")}
                          </span>
                          {credit.status === "active" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openPaymentDialog(credit, true)}
                                className="bg-green-500 hover:bg-green-600 text-white shadow-md"
                                disabled={actionLoading}
                              >
                                {actionLoading ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                Оплатить ежемесячный
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPaymentDialog(credit, false)}
                                disabled={actionLoading}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Другая сумма
                              </Button>
                            </div>
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

        <TabsContent value="payments">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>История платежей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="mb-2">Нет платежей</h3>
                    <p className="text-sm text-muted-foreground">
                      Пока нет платежей. Добавьте кредиты и регистрируйте платежи.
                    </p>
                  </div>
                ) : (
                  [...payments]
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map(payment => {
                      const credit = credits.find(c => c._id === (typeof payment.credit === 'string' ? payment.credit : payment.credit._id));
                      const creditData = typeof payment.credit === 'string' ? credit : payment.credit;

                      return (
                        <div key={payment._id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4>{creditData?.name || "Неизвестный кредит"}</h4>
                              <Badge variant="secondary">Оплачено</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.paymentDate).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })}
                              {creditData && typeof creditData.bank !== 'string' && ` • ${creditData.bank.name}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl">{payment.amount.toLocaleString("kk-KZ")} ₸</span>
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
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>График платежей</CardTitle>
              </CardHeader>
              <CardContent>
                {getPaymentScheduleData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getPaymentScheduleData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Bar dataKey="payments" fill="#ef4444" name="Платежи" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Нет данных для отображения графика. Добавьте кредиты для анализа.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Диалог добавления платежа с выбором источника */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        setIsPaymentDialogOpen(open);
        if (!open) {
          setSelectedCreditId("");
          setPaymentAmount(0);
          setSelectedIncomeId("cash");
          setSelectedSourceType("cash");
          setIsMonthlyPayment(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isMonthlyPayment ? "Оплатить ежемесячный платеж" : "Добавить платеж"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <Label htmlFor="paymentAmount">Сумма платежа (₸) *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="50000"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isMonthlyPayment ? "Ежемесячный платеж" : "Введите сумму для погашения кредита"}
              </p>
            </div>

            <div>
              <Label htmlFor="sourceId">Источник оплаты</Label>
              <Select
                name="sourceId"
                value={selectedIncomeId}
                onValueChange={(value) => {
                  setSelectedIncomeId(value);
                  if (value === "cash") {
                    setSelectedSourceType("cash");
                  } else if (value.startsWith("deposit-")) {
                    setSelectedSourceType("deposit");
                  } else {
                    setSelectedSourceType("income");
                  }
                }}
                defaultValue="cash"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите источник оплаты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Банкомат (наличка)</SelectItem>

                  {availableIncomes.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Доходы
                      </div>
                      {availableIncomes.map(income => {
                        const categoryName = getCategoryName(income);
                        const incomeId = income._id || income.id;

                        return (
                          <SelectItem key={incomeId} value={incomeId}>
                            {income.source} ({categoryName}) - Доступно: {income.availableAmount.toLocaleString("kk-KZ")} ₸ (из {income.amount.toLocaleString("kk-KZ")} ₸) - {new Date(income.date).toLocaleDateString("ru-RU")}
                          </SelectItem>
                        );
                      })}
                    </>
                  )}

                  {availableDeposits.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                        Депозиты
                      </div>
                      {availableDeposits.map(deposit => {
                        const depositTypeLabels: Record<string, string> = {
                          fixed: "Срочный",
                          savings: "Накопительный",
                          investment: "Инвестиционный",
                          spending: "Расходный"
                        };

                        const typeLabel = depositTypeLabels[deposit.type] || deposit.type;

                        return (
                          <SelectItem key={`deposit-${deposit.id}`} value={`deposit-${deposit.id}`}>
                            {deposit.name} ({typeLabel}) - {deposit.currentBalance.toLocaleString("ru-RU")} ₸
                          </SelectItem>
                        );
                      })}
                    </>
                  )}
                </SelectContent>
              </Select>
              {availableIncomes.length === 0 && availableDeposits.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Нет доступных доходов и депозитов. Все средства использованы или отсутствуют.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Примечания (необязательно)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Дополнительная информация о платеже"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Добавление...
                  </>
                ) : (
                  "Добавить платеж"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPaymentDialogOpen(false);
                  setSelectedCreditId("");
                  setPaymentAmount(0);
                  setSelectedIncomeId("cash");
                  setSelectedSourceType("cash");
                  setIsMonthlyPayment(false);
                }}
                disabled={actionLoading}
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог массового погашения платежей */}
      <Dialog open={isBulkPaymentDialogOpen} onOpenChange={(open) => {
        setIsBulkPaymentDialogOpen(open);
        if (!open) {
          setPaymentAmount(0);
          setSelectedIncomeId("cash");
          setSelectedSourceType("cash");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Погасить все ежемесячные платежи</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkPaymentSubmit} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Количество кредитов:</span>
                <span className="font-semibold">{getActiveCreditsCount()} шт.</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Общая сумма:</span>
                <span className="text-lg font-bold">{getMonthlyPayments().toLocaleString("kk-KZ")} ₸</span>
              </div>
            </div>

            <div>
              <Label htmlFor="bulkSourceId">Источник оплаты *</Label>
              <Select
                name="sourceId"
                value={selectedIncomeId}
                onValueChange={(value) => {
                  setSelectedIncomeId(value);
                  if (value === "cash") {
                    setSelectedSourceType("cash");
                  } else if (value.startsWith("deposit-")) {
                    setSelectedSourceType("deposit");
                  } else {
                    setSelectedSourceType("income");
                  }
                }}
                defaultValue="cash"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите источник оплаты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Банкомат (наличка)</SelectItem>

                  {availableIncomes.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Доходы
                      </div>
                      {availableIncomes.map(income => {
                        const categoryName = getCategoryName(income);
                        const incomeId = income._id || income.id;

                        return (
                          <SelectItem key={incomeId} value={incomeId}>
                            {income.source} ({categoryName}) - Доступно: {income.availableAmount.toLocaleString("kk-KZ")} ₸ (из {income.amount.toLocaleString("kk-KZ")} ₸) - {new Date(income.date).toLocaleDateString("ru-RU")}
                          </SelectItem>
                        );
                      })}
                    </>
                  )}

                  {availableDeposits.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                        Депозиты
                      </div>
                      {availableDeposits.map(deposit => {
                        const depositTypeLabels: Record<string, string> = {
                          fixed: "Срочный",
                          savings: "Накопительный",
                          investment: "Инвестиционный",
                          spending: "Расходный"
                        };

                        const typeLabel = depositTypeLabels[deposit.type] || deposit.type;

                        return (
                          <SelectItem key={`deposit-${deposit.id}`} value={`deposit-${deposit.id}`}>
                            {deposit.name} ({typeLabel}) - {deposit.currentBalance.toLocaleString("ru-RU")} ₸
                          </SelectItem>
                        );
                      })}
                    </>
                  )}
                </SelectContent>
              </Select>
              {availableIncomes.length === 0 && availableDeposits.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Нет доступных доходов и депозитов. Все средства использованы или отсутствуют.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Погашение...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Погасить все
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsBulkPaymentDialogOpen(false);
                  setPaymentAmount(0);
                  setSelectedIncomeId("cash");
                  setSelectedSourceType("cash");
                }}
                disabled={actionLoading}
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Credits;