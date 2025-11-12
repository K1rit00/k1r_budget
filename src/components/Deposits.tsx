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
import type { Deposit, DepositTransaction, Income } from "../types";

interface Bank {
  id: string;
  name: string;
  description?: string;
}

interface DepositStatistics {
  totalBalance: number;
  totalInterestEarned: number;
  activeDepositsCount: number;
  maturedDepositsCount: number;
}

function Deposits() {
  const { addNotification } = useAppActions();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [transactions, setTransactions] = useState<DepositTransaction[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
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
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal" | "interest">("deposit");

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем депозиты
      const depositsResponse = await apiService.getDeposits();
      setDeposits(depositsResponse.data || []);
      
      // Загружаем транзакции
      const transactionsResponse = await apiService.getDepositTransactions();
      setTransactions(transactionsResponse.data || []);
      
      // Загружаем доходы для связи
      const incomesResponse = await apiService.getIncome();
      setIncomes(incomesResponse.data || []);
      
      // Загружаем статистику
      const statsResponse = await apiService.getDepositStatistics();
      setStatistics(statsResponse.data || {
        totalBalance: 0,
        totalInterestEarned: 0,
        activeDepositsCount: 0,
        maturedDepositsCount: 0
      });
      
    } catch (error: any) {
      addNotification({ 
        message: `Ошибка загрузки данных: ${error.response?.data?.message || error.message}`, 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Данные для аналитики
  const getBalanceGrowthData = () => {
    const monthlyData = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthName, deposits: 0, withdrawals: 0, interest: 0, balance: 0 };
      }
      
      if (transaction.type === "deposit") {
        acc[monthKey].deposits += transaction.amount;
      } else if (transaction.type === "withdrawal") {
        acc[monthKey].withdrawals += transaction.amount;
      } else if (transaction.type === "interest") {
        acc[monthKey].interest += transaction.amount;
      }
      
      return acc;
    }, {} as Record<string, { month: string; deposits: number; withdrawals: number; interest: number; balance: number }>);

    let cumulativeBalance = 0;
    return Object.entries(monthlyData)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([_, item]) => {
        cumulativeBalance += item.deposits - item.withdrawals + item.interest;
        return { ...item, balance: cumulativeBalance };
      });
  };

  const getDepositsByTypeData = () => {
    const typeNames = {
      fixed: "Срочный",
      savings: "Накопительный", 
      investment: "Инвестиционный",
      spending: "Расходный"  // Добавлено для исправления ошибки
    };
    
    const typeData = deposits.reduce((acc, deposit) => {
      const typeName = typeNames[deposit.type as keyof typeof typeNames];  // Исправлено с as для типизации
      if (!acc[typeName]) {
        acc[typeName] = { name: typeName, value: 0, count: 0 };
      }
      acc[typeName].value += deposit.currentBalance;
      acc[typeName].count += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number; count: number }>);

    return Object.values(typeData);
  };

  // Обработчики форм
  const handleDepositSubmit = async (formData: FormData) => {
    try {
      const depositData = {
        bankName: formData.get("bankName") as string,
        accountNumber: formData.get("accountNumber") as string,
        amount: parseFloat(formData.get("amount") as string),
        interestRate: parseFloat(formData.get("interestRate") as string),
        startDate: formData.get("startDate") as string,
        endDate: formData.get("endDate") as string,
        type: formData.get("type") as "fixed" | "savings" | "investment" | "spending",  // Добавлен spending, если нужен
        autoRenewal: formData.get("autoRenewal") === "on",
        description: formData.get("description") as string || undefined
      };

      if (editingDeposit) {
        await apiService.updateDeposit(editingDeposit.id, depositData);
        addNotification({ message: "Депозит успешно обновлен", type: "success" });
      } else {
        await apiService.createDeposit(depositData);
        addNotification({ message: "Депозит успешно добавлен", type: "success" });
      }

      setIsDepositDialogOpen(false);
      setEditingDeposit(null);
      await loadData();
    } catch (error: any) {
      addNotification({ 
        message: `Ошибка: ${error.response?.data?.message || error.message}`, 
        type: "error" 
      });
    }
  };

  const handleTransactionSubmit = async (formData: FormData) => {
    try {
      const transactionData = {
        depositId: selectedDepositId,
        type: transactionType,
        amount: parseFloat(formData.get("amount") as string),
        transactionDate: formData.get("transactionDate") as string,
        description: formData.get("description") as string || undefined,
        incomeId: transactionType === "deposit" ? (formData.get("incomeId") as string || undefined) : undefined
      };

      await apiService.createDepositTransaction(transactionData);
      addNotification({ message: "Транзакция успешно добавлена", type: "success" });
      
      setIsTransactionDialogOpen(false);
      setSelectedDepositId("");
      setTransactionType("deposit");
      await loadData();
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка при создании транзакции", 
        type: "error" 
      });
    }
  };

  const closeDeposit = async (id: string) => {
    try {
      await apiService.closeDeposit(id);
      addNotification({ message: "Депозит закрыт", type: "info" });
      await loadData();
    } catch (error: any) {
      addNotification({ 
        message: `Ошибка: ${error.response?.data?.message || error.message}`, 
        type: "error" 
      });
    }
  };

  const renewDeposit = async (id: string) => {
    try {
      await apiService.renewDeposit(id);
      addNotification({ message: "Депозит продлен", type: "success" });
      await loadData();
    } catch (error: any) {
      addNotification({ 
        message: `Ошибка: ${error.response?.data?.message || error.message}`, 
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
    } catch (error: any) {
      addNotification({ 
        message: `Ошибка: ${error.response?.data?.message || error.message}`, 
        type: "error" 
      });
    }
  };

  const calculateDaysToMaturity = (deposit: Deposit) => {
    if (!deposit.endDate) return 0;  // Исправление: проверка на undefined
    const today = new Date();
    const endDate = new Date(deposit.endDate);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateAccruedInterest = (deposit: Deposit) => {
    if (!deposit.startDate || deposit.interestRate === undefined) return 0;  // Исправление: проверка на undefined
    const today = new Date();
    const startDate = new Date(deposit.startDate);
    const daysHeld = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const yearlyInterest = (deposit.amount * deposit.interestRate) / 100;
    return (yearlyInterest * daysHeld) / 365;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистические карточки */}
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

      {/* Основной контент */}
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
                      <Label htmlFor="bankName">Название банка</Label>
                      <Input 
                        id="bankName" 
                        name="bankName" 
                        required 
                        defaultValue={editingDeposit?.bankName}
                        placeholder="Например: Kaspi Bank"
                      />
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
                          <SelectItem value="spending">Расходный счет</SelectItem>  {/* Добавлено для spending */}
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
                        required 
                        defaultValue={editingDeposit?.startDate}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Дата закрытия</Label>
                      <Input 
                        id="endDate" 
                        name="endDate" 
                        type="date" 
                        required 
                        defaultValue={editingDeposit?.endDate}
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
                    const daysToMaturity = calculateDaysToMaturity(deposit);
                    const accruedInterest = calculateAccruedInterest(deposit);
                    const isMatured = daysToMaturity <= 0;
                    
                    return (
                      <div key={deposit.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold">{deposit.bankName}</h4>
                              <Badge variant={deposit.status === "active" ? "default" : deposit.status === "matured" ? "secondary" : "outline"}>
                                {deposit.status === "active" ? "Активный" : deposit.status === "matured" ? "Созрел" : "Закрыт"}
                              </Badge>
                              <Badge variant="outline">
                                {deposit.type === "fixed" ? "Срочный" : deposit.type === "savings" ? "Накопительный" : deposit.type === "investment" ? "Инвестиционный" : "Расходный"}
                              </Badge>
                              {deposit.autoRenewal && (
                                <Badge variant="secondary">Автопродление</Badge>
                              )}
                              {isMatured && deposit.status === "active" && (
                                <Badge variant="destructive">Созрел</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Счет: {deposit.accountNumber} • {deposit.interestRate}% годовых
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingDeposit(deposit);
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
                                    onClick={() => renewDeposit(deposit.id)}
                                  >
                                    Продлить
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => closeDeposit(deposit.id)}
                                >
                                  Закрыть
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDeposit(deposit.id)}
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
                            {deposit.startDate ? new Date(deposit.startDate).toLocaleDateString("ru-RU") : "Не указана"} - {deposit.endDate ? new Date(deposit.endDate).toLocaleDateString("ru-RU") : "Не указана"}  {/* Исправление: проверка на undefined */}
                          </span>
                          {deposit.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDepositId(deposit.id);
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

          {/* Диалог добавления транзакции */}
          <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить транзакцию</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleTransactionSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                <div>
                  <Label htmlFor="type">Тип транзакции</Label>
                  <Select name="type" value={transactionType} onValueChange={(value: "deposit" | "withdrawal" | "interest") => setTransactionType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Пополнение</SelectItem>
                      <SelectItem value="withdrawal">Снятие</SelectItem>
                      <SelectItem value="interest">Начисление процентов</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {transactionType === "deposit" && incomes.length > 0 && (
                  <div>
                    <Label htmlFor="incomeId">Источник дохода (необязательно)</Label>
                    <Select name="incomeId">
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите доход" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Не указывать</SelectItem>
                        {incomes
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(income => (
                            <SelectItem key={income.id} value={income.id}>
                              {income.source} - {income.amount.toLocaleString("kk-KZ")} ₸ ({new Date(income.date).toLocaleDateString("ru-RU")})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Укажите, с какого дохода вы пополняете депозит
                    </p>
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
                      Максимум: {deposits.find(d => d.id === selectedDepositId)?.currentBalance.toLocaleString("kk-KZ")} ₸
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="transactionDate">Дата транзакции</Label>
                  <Input 
                    id="transactionDate" 
                    name="transactionDate" 
                    type="date" 
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
                      const deposit = deposits.find(d => d.id === transaction.depositId);
                      const income = (transaction as any).incomeId ? incomes.find(i => i.id === (transaction as any).incomeId) : null;  // Временное as any; обновите тип DepositTransaction
                      const typeNames = {
                        deposit: "Пополнение",
                        withdrawal: "Снятие",
                        interest: "Проценты"
                      };
                      const typeColors = {
                        deposit: "default",
                        withdrawal: "destructive", 
                        interest: "secondary"
                      } as const;
                      
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold">{deposit?.bankName || "Неизвестный депозит"}</h4>
                              <Badge variant={typeColors[transaction.type]}>
                                {typeNames[transaction.type]}
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
                            <span className={`text-lg font-semibold ${
                              transaction.type === "withdrawal" ? "text-red-600" : "text-green-600"
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
            {/* Рост баланса */}
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

            {/* Распределение по типам */}
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
                            <Cell key={`cell-${index}`} fill={["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"][index % 4]} />  {/* Добавлен цвет для spending */}
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
                          <div key={index} className="p-3 bg-muted/50 rounded">
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