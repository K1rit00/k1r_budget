import { useState, useEffect } from "react";
import { apiService } from "../services/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Plus, TrendingDown, TrendingUp, History, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "../utils/formatters";

interface DebtPayment {
  _id: string;
  amount: number;
  paymentDate: string;
  description?: string;
}

interface Debt {
  _id: string;
  type: "owe" | "owed";
  person: string;
  amount: number;
  currentBalance: number;
  description?: string;
  dueDate?: string;
  status: "active" | "paid";
  payments: DebtPayment[];
  createdAt: string;
}

interface Statistics {
  totalOwe: number;
  totalOwed: number;
  activeOwe: number;
  activeOwed: number;
  paidDebts: number;
  netBalance: number;
}

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalOwe: 0,
    totalOwed: 0,
    activeOwe: 0,
    activeOwed: 0,
    paidDebts: 0,
    netBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [activeTab, setActiveTab] = useState<"owe" | "owed" | "history">("owe");
  const [submitting, setSubmitting] = useState(false);

  // Форма для нового долга
  const [newDebt, setNewDebt] = useState({
    type: "owe" as "owe" | "owed",
    person: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  // Форма для погашения
  const [payment, setPayment] = useState({
    amount: "",
    description: "",
  });

  // Загрузка данных
  useEffect(() => {
    fetchDebts();
    fetchStatistics();
  }, []);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDebts();
      setDebts(response.data.debts);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка загрузки долгов");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await apiService.getDebtStatistics();
      setStatistics(response.data.statistics);
    } catch (error: any) {
      console.error("Ошибка загрузки статистики:", error);
    }
  };

  // Обработчик добавления нового долга
  const handleAddDebt = async () => {
    if (!newDebt.person.trim() || !newDebt.amount || parseFloat(newDebt.amount) <= 0) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    try {
      setSubmitting(true);
      await apiService.createDebt({
        type: newDebt.type,
        person: newDebt.person.trim(),
        amount: parseFloat(newDebt.amount),
        description: newDebt.description.trim() || undefined,
        dueDate: newDebt.dueDate || undefined,
      });

      toast.success("Долг добавлен");
      setNewDebt({
        type: "owe",
        person: "",
        amount: "",
        description: "",
        dueDate: "",
      });
      setIsAddDialogOpen(false);
      fetchDebts();
      fetchStatistics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка добавления долга");
    } finally {
      setSubmitting(false);
    }
  };

  // Обработчик погашения долга
  const handlePayment = async () => {
    if (!selectedDebt || !payment.amount || parseFloat(payment.amount) <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    const paymentAmount = parseFloat(payment.amount);
    if (paymentAmount > selectedDebt.currentBalance) {
      toast.error("Сумма погашения не может превышать остаток долга");
      return;
    }

    try {
      setSubmitting(true);
      await apiService.addDebtPayment(selectedDebt._id, {
        amount: paymentAmount,
        description: payment.description.trim() || undefined,
      });

      toast.success(
        paymentAmount === selectedDebt.currentBalance
          ? "Долг полностью погашен!"
          : "Платеж записан"
      );
      setPayment({ amount: "", description: "" });
      setIsPaymentDialogOpen(false);
      setSelectedDebt(null);
      fetchDebts();
      fetchStatistics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка записи платежа");
    } finally {
      setSubmitting(false);
    }
  };

  // Открыть диалог погашения
  const openPaymentDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    setPayment({ amount: debt.currentBalance.toString(), description: "" });
    setIsPaymentDialogOpen(true);
  };

  // Открыть историю платежей
  const openHistoryDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsHistoryDialogOpen(true);
  };

  // Получить дату последнего платежа (для погашенных долгов)
  const getLastPaymentDate = (debt: Debt) => {
    if (debt.payments.length === 0) return null;
    const sortedPayments = [...debt.payments].sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
    return sortedPayments[0].paymentDate;
  };

  // Фильтрация долгов
  const activeDebts = debts.filter((d) => d.status === "active");
  const paidDebts = debts
    .filter((d) => d.status === "paid")
    .sort((a, b) => {
      const dateA = getLastPaymentDate(a);
      const dateB = getLastPaymentDate(b);
      if (!dateA || !dateB) return 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  const oweDebts = activeDebts.filter((d) => d.type === "owe");
  const owedDebts = activeDebts.filter((d) => d.type === "owed");

  // Компонент карточки долга
  const DebtCard = ({ debt, isPaid = false }: { debt: Debt; isPaid?: boolean }) => {
    const progress = ((debt.amount - debt.currentBalance) / debt.amount) * 100;
    const isOwe = debt.type === "owe";
    const lastPaymentDate = isPaid ? getLastPaymentDate(debt) : null;

    return (
      <Card className="mb-3">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">{debt.person}</CardTitle>
              {debt.description && (
                <CardDescription className="text-xs mt-1">{debt.description}</CardDescription>
              )}
            </div>
            <Badge variant={isOwe ? "destructive" : "default"} className="ml-2">
              {isPaid ? "Погашено" : isOwe ? "Должен" : "Должны мне"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Изначальная сумма</p>
              <p className="font-medium">{formatCurrency(debt.amount)}</p>
            </div>
            {!isPaid && (
              <div>
                <p className="text-xs text-muted-foreground">Остаток</p>
                <p className={`font-medium ${isOwe ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  {formatCurrency(debt.currentBalance)}
                </p>
              </div>
            )}
            {isPaid && lastPaymentDate && (
              <div>
                <p className="text-xs text-muted-foreground">Дата погашения</p>
                <p className="text-sm">
                  {new Date(lastPaymentDate).toLocaleDateString("ru-RU")}
                </p>
              </div>
            )}
          </div>

          {!isPaid && debt.dueDate && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Срок возврата</p>
              <p>{new Date(debt.dueDate).toLocaleDateString("ru-RU")}</p>
            </div>
          )}

          {!isPaid && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Прогресс погашения</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${isOwe ? "bg-blue-500" : "bg-green-500"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openHistoryDialog(debt)}
              className="flex-1 gap-1"
            >
              <History className="h-3 w-3" />
              <span className="hidden sm:inline">История</span>
            </Button>
            {!isPaid && (
              <Button
                size="sm"
                onClick={() => openPaymentDialog(debt)}
                className="flex-1"
              >
                {isOwe ? "Погасить" : "Получить"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Статистика - адаптированная под темную тему */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        <Card className="rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm dark:text-red-100">Я должен</CardTitle>
            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl dark:text-red-50">{formatCurrency(statistics.totalOwe)}</div>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              {statistics.activeOwe} {statistics.activeOwe === 1 ? "долг" : "долгов"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm dark:text-green-100">Мне должны</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl dark:text-green-50">{formatCurrency(statistics.totalOwed)}</div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              {statistics.activeOwed} {statistics.activeOwed === 1 ? "долг" : "долгов"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Долги</CardTitle>
              <CardDescription className="hidden sm:block">Управление долгами и их погашение</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить долг
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "owe" | "owed" | "history")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="owe">
                <span className="hidden sm:inline">Я должен</span>
                <span className="sm:hidden">Должен</span> ({oweDebts.length})
              </TabsTrigger>
              <TabsTrigger value="owed">
                <span className="hidden sm:inline">Мне должны</span>
                <span className="sm:hidden">Должны</span> ({owedDebts.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                <span className="hidden sm:inline">История</span>
                <span className="sm:hidden">История</span>({paidDebts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="owe" className="space-y-4 mt-4">
              {oweDebts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Нет активных долгов</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {oweDebts.map((debt) => (
                    <DebtCard key={debt._id} debt={debt} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="owed" className="space-y-4 mt-4">
              {owedDebts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Никто не должен вам денег</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {owedDebts.map((debt) => (
                    <DebtCard key={debt._id} debt={debt} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              {paidDebts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Нет погашенных долгов</p>
                  <p className="text-xs mt-2">
                    Здесь будут отображаться полностью погашенные долги
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paidDebts.map((debt) => (
                    <DebtCard key={debt._id} debt={debt} isPaid={true} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Диалог добавления долга */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить долг</DialogTitle>
            <DialogDescription>Укажите детали долга для учета</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тип долга</Label>
              <Tabs
                value={newDebt.type}
                onValueChange={(v) => setNewDebt({ ...newDebt, type: v as "owe" | "owed" })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="owe">Я должен</TabsTrigger>
                  <TabsTrigger value="owed">Мне должны</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label htmlFor="person">
                {newDebt.type === "owe" ? "Кредитор" : "Должник"} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="person"
                placeholder="Имя"
                value={newDebt.person}
                onChange={(e) => setNewDebt({ ...newDebt, person: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">
                Сумма (₸) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={newDebt.amount}
                onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Срок возврата (опционально)</Label>
              <Input
                id="dueDate"
                type="date"
                value={newDebt.dueDate}
                onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Описание (опционально)</Label>
              <Textarea
                id="description"
                placeholder="Причина долга, условия и т.д."
                value={newDebt.description}
                onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)} 
              className="w-full sm:w-auto"
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleAddDebt} 
              className="w-full sm:w-auto"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог погашения */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDebt?.type === "owe" ? "Погасить долг" : "Получить возврат"}
            </DialogTitle>
            <DialogDescription>
              {selectedDebt && (
                <>
                  {selectedDebt.type === "owe" ? "Кредитор" : "Должник"}: {selectedDebt.person}
                  <br />
                  Остаток: {formatCurrency(selectedDebt.currentBalance)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">
                Сумма (₸) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="paymentAmount"
                type="number"
                placeholder="0"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
              />
              {selectedDebt && (
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPayment({ ...payment, amount: (selectedDebt.currentBalance / 2).toString() })
                    }
                    className="flex-1"
                  >
                    Половина
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPayment({ ...payment, amount: selectedDebt.currentBalance.toString() })
                    }
                    className="flex-1"
                  >
                    Полностью
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDescription">Примечание (опционально)</Label>
              <Textarea
                id="paymentDescription"
                placeholder="Комментарий к платежу"
                value={payment.description}
                onChange={(e) => setPayment({ ...payment, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPaymentDialogOpen(false)} 
              className="w-full sm:w-auto"
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button 
              onClick={handlePayment} 
              className="w-full sm:w-auto"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог истории платежей */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>История платежей</DialogTitle>
            <DialogDescription>
              {selectedDebt && (
                <>
                  {selectedDebt.type === "owe" ? "Кредитор" : "Должник"}: {selectedDebt.person}
                  <br />
                  Изначальная сумма: {formatCurrency(selectedDebt.amount)} | Остаток:{" "}
                  {formatCurrency(selectedDebt.currentBalance)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            {selectedDebt && selectedDebt.payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Платежи еще не были произведены</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDebt &&
                  selectedDebt.payments
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map((p) => (
                      <Card key={p._id}>
                        <CardContent className="pt-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">
                                {new Date(p.paymentDate).toLocaleDateString("ru-RU")}
                              </p>
                              {p.description && (
                                <p className="text-sm mt-1">{p.description}</p>
                              )}
                            </div>
                            <div className="text-lg font-semibold">
                              {formatCurrency(p.amount)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)} className="w-full sm:w-auto">Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}