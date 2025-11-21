import { useState, useEffect } from "react";
import { PiggyBank, Plus, Edit, Trash2, TrendingUp, Calendar, DollarSign, Percent, Building2, AlertCircle } from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { apiService } from "../services/api";
import type { Deposit, DepositTransaction } from "../types";

interface DepositStatistics {
  totalBalance: number;
  totalInterestEarned: number;
  activeDepositsCount: number;
  maturedDepositsCount: number;
}

interface AvailableIncome {
  _id: string;
  id: string;
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

interface Bank {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
}

type DepositType = "fixed" | "savings" | "investment" | "spending";
type TransactionType = "deposit" | "withdrawal" | "interest";

function Deposits() {
  const { addNotification } = useAppActions();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [transactions, setTransactions] = useState<DepositTransaction[]>([]);
  const [availableIncomes, setAvailableIncomes] = useState<AvailableIncome[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<DepositStatistics>({
    totalBalance: 0,
    totalInterestEarned: 0,
    activeDepositsCount: 0,
    maturedDepositsCount: 0
  });
  const [loading, setLoading] = useState(true);

  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [selectedDepositId, setSelectedDepositId] = useState<string>("");
  const [transactionType, setTransactionType] = useState<TransactionType>("deposit");
  const [selectedBankId, setSelectedBankId] = useState<string>("");

  const getItemId = (item: any): string => {
    return item._id || item.id || '';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [depositsResponse, transactionsResponse, statsResponse, banksResponse, categoriesResponse] = await Promise.all([
        apiService.getDeposits(),
        apiService.getDepositTransactions(),
        apiService.getDepositStatistics(),
        apiService.getBanks(),
        apiService.getCategories('income')
      ]);

      setDeposits(depositsResponse.data || []);
      setTransactions(transactionsResponse.data || []);
      setBanks(banksResponse.data || []);
      setIncomeCategories(categoriesResponse.data || []);
      setStatistics(statsResponse.data || {
        totalBalance: 0,
        totalInterestEarned: 0,
        activeDepositsCount: 0,
        maturedDepositsCount: 0
      });

      // Загружаем доступные доходы отдельно, с обработкой ошибок
      try {
        const availableIncomesResponse = await apiService.getAvailableIncomes();
        setAvailableIncomes(availableIncomesResponse.data || []);
      } catch (incomeError) {
        console.error('Ошибка загрузки доступных доходов:', incomeError);
        setAvailableIncomes([]);
      }

    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      addNotification({
        message: `Ошибка загрузки данных: ${err.response?.data?.message || err.message || 'Неизвестная ошибка'}`,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (date: string | Date | undefined): string => {
    if (!date) return '';

    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const getBalanceGrowthData = () => {
    const monthlyData: Record<string, { month: string; deposits: number; withdrawals: number; interest: number; balance: number }> = {};

    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthName, deposits: 0, withdrawals: 0, interest: 0, balance: 0 };
      }

      if (transaction.type === "deposit") {
        monthlyData[monthKey].deposits += transaction.amount;
      } else if (transaction.type === "withdrawal") {
        monthlyData[monthKey].withdrawals += transaction.amount;
      } else if (transaction.type === "interest") {
        monthlyData[monthKey].interest += transaction.amount;
      }
    });

    let cumulativeBalance = 0;
    return Object.entries(monthlyData)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([_, item]) => {
        cumulativeBalance += item.deposits - item.withdrawals + item.interest;
        return { ...item, balance: cumulativeBalance };
      });
  };

  const getDepositsByTypeData = () => {
    const typeNames: Record<DepositType, string> = {
      fixed: "Срочный",
      savings: "Накопительный",
      investment: "Инвестиционный",
      spending: "Расходный"
    };

    const typeData: Record<string, { name: string; value: number; count: number }> = {};

    deposits.forEach(deposit => {
      const typeName = typeNames[deposit.type as DepositType] || deposit.type;
      if (!typeData[typeName]) {
        typeData[typeName] = { name: typeName, value: 0, count: 0 };
      }
      typeData[typeName].value += deposit.currentBalance;
      typeData[typeName].count += 1;
    });

    return Object.values(typeData);
  };

  const handleDepositSubmit = async (formData: FormData) => {
    try {
      const bankId = formData.get("bankId") as string;
      const selectedBank = banks.find(b => getItemId(b) === bankId);

      const depositData: any = {
        name: (formData.get("name") as string)?.trim() || undefined,
        bankName: selectedBank?.name || (formData.get("bankName") as string)?.trim(),
        accountNumber: (formData.get("accountNumber") as string)?.trim(),
        amount: parseFloat(formData.get("amount") as string),
        interestRate: parseFloat(formData.get("interestRate") as string),
        startDate: formData.get("startDate") as string,
        endDate: formData.get("endDate") as string,
        type: formData.get("type") as string,
        autoRenewal: formData.get("autoRenewal") === "on",
        description: (formData.get("description") as string)?.trim() || undefined
      };

      if (editingDeposit) {
        depositData.currentBalance = editingDeposit.currentBalance;
        const depositId = getItemId(editingDeposit);
        await apiService.updateDeposit(depositId, depositData);
        addNotification({ message: "Депозит успешно обновлен", type: "success" });
      } else {
        await apiService.createDeposit(depositData);
        addNotification({ message: "Депозит успешно добавлен", type: "success" });
      }

      setIsDepositDialogOpen(false);
      setEditingDeposit(null);
      setSelectedBankId("");
      await loadData();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; errors?: string[] } };
        message?: string
      };

      const errorMessage = err.response?.data?.errors
        ? err.response.data.errors.join(', ')
        : err.response?.data?.message || err.message || 'Неизвестная ошибка';

      addNotification({
        message: `Ошибка: ${errorMessage}`,
        type: "error"
      });
    }
  };

  const handleTransactionSubmit = async (formData: FormData) => {
    try {
      const incomeId = formData.get("incomeId") as string;
      const transactionData: any = {
        depositId: selectedDepositId,
        type: transactionType,
        amount: parseFloat(formData.get("amount") as string),
        transactionDate: formData.get("transactionDate") as string,
        description: formData.get("description") as string || undefined,
      };

      // Добавляем incomeId только если выбран доход
      if (transactionType === "deposit" && incomeId && incomeId !== "cash") {
        transactionData.incomeId = incomeId;
      }

      await apiService.createDepositTransaction(transactionData);
      addNotification({ message: "Транзакция успешно добавлена", type: "success" });

      setIsTransactionDialogOpen(false);
      setSelectedDepositId("");
      setTransactionType("deposit");
      await loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      addNotification({
        message: err.response?.data?.message || "Ошибка при создании транзакции",
        type: "error"
      });
    }
  };

  const closeDeposit = async (id: string) => {
    try {
      await apiService.closeDeposit(id);
      addNotification({ message: "Депозит закрыт", type: "info" });
      await loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      addNotification({
        message: `Ошибка: ${err.response?.data?.message || err.message || 'Неизвестная ошибка'}`,
        type: "error"
      });
    }
  };

  const renewDeposit = async (id: string) => {
    try {
      await apiService.renewDeposit(id);
      addNotification({ message: "Депозит продлен", type: "success" });
      await loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      addNotification({
        message: `Ошибка: ${err.response?.data?.message || err.message || 'Неизвестная ошибка'}`,
        type: "error"
      });
    }
  };

  const deleteDeposit = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот депозит?")) {
      return;
    }

    try {
      await apiService.deleteDeposit(id);
      addNotification({ message: "Депозит удален", type: "info" });
      await loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      addNotification({
        message: `Ошибка: ${err.response?.data?.message || err.message || 'Неизвестная ошибка'}`,
        type: "error"
      });
    }
  };

  const calculateDaysToMaturity = (deposit: Deposit): number => {
    if (!deposit.endDate) return 0;
    const today = new Date();
    const endDate = new Date(deposit.endDate);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateAccruedInterest = (deposit: Deposit): number => {
    if (!deposit.createdAt || deposit.interestRate === undefined) return 0;
    const today = new Date();
    const createdDate = new Date(deposit.createdAt);
    const daysHeld = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const yearlyInterest = (deposit.currentBalance * deposit.interestRate) / 100;
    return (yearlyInterest * daysHeld) / 365;
  };

  const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

  return (
    <div className="space-y-6">
      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Общий баланс</span>
            </div>
            <p className="text-2xl text-green-900 dark:text-green-100">
              {statistics.totalBalance.toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">Доход от процентов</span>
            </div>
            <p className="text-2xl text-blue-900 dark:text-blue-100">
              {statistics.totalInterestEarned.toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300">Активных депозитов</span>
            </div>
            <p className="text-2xl text-purple-900 dark:text-purple-100">
              {statistics.activeDepositsCount}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-700 dark:text-orange-300">К закрытию</span>
            </div>
            <p className="text-2xl text-orange-900 dark:text-orange-100">
              {statistics.maturedDepositsCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <Tabs defaultValue="deposits" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deposits">Депозиты</TabsTrigger>
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Управление депозитами</CardTitle>
              <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить депозит
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingDeposit ? "Редактировать депозит" : "Добавить депозит"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleDepositSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название депозита</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingDeposit?.name}
                        placeholder="Например: Накопления на отпуск"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankId">Банк</Label>
                      <Select
                        name="bankId"
                        value={selectedBankId}
                        onValueChange={setSelectedBankId}
                        defaultValue={editingDeposit ? banks.find(b => b.name === editingDeposit.bankName) ? getItemId(banks.find(b => b.name === editingDeposit.bankName)!) : "" : ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите банк" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map(bank => (
                            <SelectItem key={getItemId(bank)} value={getItemId(bank)}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Номер счета</Label>
                      <Input
                        id="accountNumber"
                        name="accountNumber"
                        required
                        defaultValue={editingDeposit?.accountNumber}
                        placeholder="Номер депозитного счета"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Тип депозита</Label>
                      <Select name="type" defaultValue={editingDeposit?.type || "fixed"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Срочный депозит</SelectItem>
                          <SelectItem value="savings">Накопительный счет</SelectItem>
                          <SelectItem value="investment">Инвестиционный депозит</SelectItem>
                          <SelectItem value="spending">Расходный счет</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Сумма депозита (₸)</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={editingDeposit?.amount}
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
                        defaultValue={editingDeposit?.interestRate}
                      />
                    </div>
                    <div>
                      <Label htmlFor="startDate">Дата открытия</Label>
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        className="date-input"
                        required
                        defaultValue={formatDateForInput(editingDeposit?.startDate)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Дата закрытия</Label>
                      <Input
                        id="endDate"
                        name="endDate"
                        type="date"
                        className="date-input"
                        required
                        defaultValue={formatDateForInput(editingDeposit?.endDate)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="autoRenewal"
                        name="autoRenewal"
                        defaultChecked={editingDeposit?.autoRenewal}
                      />
                      <Label htmlFor="autoRenewal">Автоматическое продление</Label>
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingDeposit?.description}
                        placeholder="Дополнительная информация"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingDeposit ? "Обновить" : "Добавить"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDepositDialogOpen(false);
                          setEditingDeposit(null);
                          setSelectedBankId("");
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
                {deposits.length === 0 ? (
                  <div className="text-center py-8">
                    <PiggyBank className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Депозиты не найдены</p>
                    <p className="text-sm text-muted-foreground">Добавьте первый депозит для начала накопления</p>
                  </div>
                ) : (
                  deposits.map(deposit => {
                    const depositId = getItemId(deposit);
                    const daysToMaturity = calculateDaysToMaturity(deposit);
                    const accruedInterest = calculateAccruedInterest(deposit);
                    const isMatured = daysToMaturity <= 0;

                    const typeNames: Record<DepositType, string> = {
                      fixed: "Срочный",
                      savings: "Накопительный",
                      investment: "Инвестиционный",
                      spending: "Расходный"
                    };

                    return (
                      <div key={depositId} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold">{deposit.name || deposit.bankName}</h4>
                              <Badge variant={deposit.status === "active" ? "default" : deposit.status === "matured" ? "secondary" : "outline"}>
                                {deposit.status === "active" ? "Активный" : deposit.status === "matured" ? "Созрел" : "Закрыт"}
                              </Badge>
                              <Badge variant="outline">
                                {typeNames[deposit.type as DepositType] || deposit.type}
                              </Badge>
                              {deposit.autoRenewal && (
                                <Badge variant="secondary">Автопродление</Badge>
                              )}
                              {isMatured && deposit.status === "active" && (
                                <Badge variant="destructive">Созрел</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {deposit.name ? `${deposit.bankName} • ` : ''}Счет: {deposit.accountNumber} • {deposit.interestRate}% годовых
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingDeposit(deposit);
                                setSelectedBankId(banks.find(b => b.name === deposit.bankName) ? getItemId(banks.find(b => b.name === deposit.bankName)!) : "");
                                setIsDepositDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {deposit.status === "active" && (
                              <>
                                {isMatured && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => renewDeposit(depositId)}
                                  >
                                    Продлить
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => closeDeposit(depositId)}
                                >
                                  Закрыть
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDeposit(depositId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Текущий баланс</p>
                            <p className="text-lg font-semibold">{deposit.currentBalance.toLocaleString("kk-KZ")} ₸</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Начальная сумма</p>
                            <p className="text-lg">{deposit.amount.toLocaleString("kk-KZ")} ₸</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Накопленный доход</p>
                            <p className="text-lg text-green-600">+{accruedInterest.toLocaleString("kk-KZ", { maximumFractionDigits: 2 })} ₸</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {isMatured ? "Срок истек" : "До окончания"}
                            </p>
                            <p className={`text-lg ${isMatured ? 'text-red-600' : ''}`}>
                              {isMatured ? "Созрел" : `${daysToMaturity} дней`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {deposit.startDate ? new Date(deposit.startDate).toLocaleDateString("ru-RU") : "Не указана"} - {deposit.endDate ? new Date(deposit.endDate).toLocaleDateString("ru-RU") : "Не указана"}
                          </span>
                          {deposit.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDepositId(depositId);
                                setIsTransactionDialogOpen(true);
                              }}
                            >
                              Добавить транзакцию
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction Dialog */}
          <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить транзакцию</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleTransactionSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                <div>
                  <Label htmlFor="transactionType">Тип операции</Label>
                  <Select
                    name="transactionType"
                    value={transactionType}
                    onValueChange={(value) => setTransactionType(value as TransactionType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип операции" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Пополнение</SelectItem>
                      <SelectItem value="withdrawal">Снятие</SelectItem>
                      <SelectItem value="interest">Проценты</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {transactionType === "deposit" && (
                  <div>
                    <Label htmlFor="incomeId">Источник дохода</Label>
                    <Select name="incomeId" defaultValue="cash">
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите источник дохода" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Банкомат (наличка)</SelectItem>
                        {availableIncomes.map(income => {
                          // Получаем название категории из загруженных данных
                          let categoryName = "Другое";
                          
                          if (typeof income.type === 'object' && income.type !== null) {
                            // Если type уже populate (объект с полями)
                            categoryName = income.type.name;
                          } else if (typeof income.type === 'string') {
                            // Если type это ID, ищем категорию в списке
                            const category = incomeCategories.find(c => 
                              (c._id === income.type) || (c.id === income.type)
                            );
                            categoryName = category?.name || "Другое";
                          }

                          return (
                            <SelectItem key={getItemId(income)} value={getItemId(income)}>
                              {income.source} ({categoryName}) - Доступно: {income.availableAmount.toLocaleString("kk-KZ")} ₸ (из {income.amount.toLocaleString("kk-KZ")} ₸) - {new Date(income.date).toLocaleDateString("ru-RU")}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {availableIncomes.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Нет доступных доходов. Все средства использованы или доходы отсутствуют.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="amount">Сумма (₸)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                  />
                  {transactionType === "withdrawal" && selectedDepositId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Максимум: {deposits.find(d => getItemId(d) === selectedDepositId)?.currentBalance.toLocaleString("kk-KZ")} ₸
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="transactionDate">Дата транзакции</Label>
                  <Input
                    id="transactionDate"
                    name="transactionDate"
                    type="date"
                    className="date-input"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Описание транзакции"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Добавить транзакцию
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsTransactionDialogOpen(false);
                      setSelectedDepositId("");
                      setTransactionType("deposit");
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>История транзакций</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет транзакций. Добавьте депозиты и регистрируйте операции.
                  </p>
                ) : (
                  transactions
                    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
                    .map(transaction => {
                      const transactionId = getItemId(transaction);
                      const deposit = (transaction.depositId as unknown) as { bankName: string; accountNumber: string; type: string } | null;
                      const income = (transaction.incomeId as unknown) as { source: string; amount: number; date: string } | null;
                      const depositTypeNames: Record<string, string> = {
                        fixed: "Срочный",
                        savings: "Накопительный",
                        investment: "Инвестиционный",
                        spending: "Расходный"
                      };
                      const transactionTypeNames: Record<TransactionType, string> = {
                        deposit: "Пополнение",
                        withdrawal: "Снятие",
                        interest: "Проценты"
                      };
                      const transactionTypeColors: Record<TransactionType, "default" | "destructive" | "secondary"> = {
                        deposit: "default",
                        withdrawal: "destructive",
                        interest: "secondary"
                      };

                      return (
                        <div key={transactionId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold">
                                {deposit?.bankName || "Депозит удален"} - {deposit?.accountNumber || "N/A"} ({depositTypeNames[deposit?.type || ""] || "Неизвестный"})
                              </h4>
                              <Badge variant={transactionTypeColors[transaction.type]}>
                                {transactionTypeNames[transaction.type]}
                              </Badge>
                              {income && (
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  Из: {income.source}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.transactionDate).toLocaleDateString("ru-RU")}
                              {transaction.description && ` • ${transaction.description}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-semibold ${transaction.type === "withdrawal" ? "text-red-600" : "text-green-600"
                              }`}>
                              {transaction.type === "withdrawal" ? "-" : "+"}{transaction.amount.toLocaleString("kk-KZ")} ₸
                            </span>
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
            {/* Balance Growth Chart */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Рост баланса депозитов</CardTitle>
              </CardHeader>
              <CardContent>
                {getBalanceGrowthData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getBalanceGrowthData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} name="Баланс" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для отображения графика роста. Добавьте депозиты и транзакции.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Deposits by Type Chart */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Распределение депозитов по типам</CardTitle>
              </CardHeader>
              <CardContent>
                {getDepositsByTypeData().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={getDepositsByTypeData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value.toLocaleString("kk-KZ")} ₸`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getDepositsByTypeData().map((entry, index) => (
                            <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-4">
                      {getDepositsByTypeData().map((item, index) => {
                        const total = getDepositsByTypeData().reduce((sum, d) => sum + d.value, 0);
                        const percentage = total > 0 ? (item.value / total) * 100 : 0;

                        return (
                          <div key={`deposit-type-stat-${item.name}-${index}`} className="p-3 bg-muted/50 rounded">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{item.name}</span>
                              <Badge variant="outline">{item.count} депозитов</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                              <span className="font-semibold">{item.value.toLocaleString("kk-KZ")} ₸</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для анализа распределения депозитов.
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

export default Deposits;