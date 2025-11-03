import React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { CreditCard, Plus, Edit, Trash2, Calendar, AlertCircle, TrendingDown, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Credit, CreditPayment } from "../types";

function Credits() {
  const { addNotification } = useAppActions();
  const [credits, setCredits] = useLocalStorage<Credit[]>("credits", []);
  const [payments, setPayments] = useLocalStorage<CreditPayment[]>("credit-payments", []);
  
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string>("");

  // Расчеты для статистики
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

  // Данные для аналитики
  const getPaymentScheduleData = () => {
    const scheduleData: { [key: string]: { month: string; payments: number } } = {};
    
    credits.forEach(credit => {
      if (credit.status !== "active") return;
      
      const startDate = new Date(credit.startDate);
      const endDate = new Date(credit.endDate);
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
        const monthName = currentDate.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
        
        if (!scheduleData[monthKey]) {
          scheduleData[monthKey] = { month: monthName, payments: 0 };
        }
        scheduleData[monthKey].payments += credit.monthlyPayment;
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    });

    return Object.values(scheduleData).sort((a, b) => {
      const [yearA, monthA] = a.month.split(" ");
      const [yearB, monthB] = b.month.split(" ");
      return new Date(parseInt(yearA), monthA === "янв" ? 0 : monthA === "фев" ? 1 : 2).getTime() - 
             new Date(parseInt(yearB), monthB === "янв" ? 0 : monthB === "фев" ? 1 : 2).getTime();
    });
  };

  // Обработчики форм
  const handleCreditSubmit = (formData: FormData) => {
    const creditData = {
      id: editingCredit?.id || Date.now().toString(),
      name: formData.get("name") as string,
      bank: formData.get("bank") as string,
      amount: parseFloat(formData.get("amount") as string),
      currentBalance: editingCredit?.currentBalance || parseFloat(formData.get("amount") as string),
      interestRate: parseFloat(formData.get("interestRate") as string),
      monthlyPayment: parseFloat(formData.get("monthlyPayment") as string),
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      type: formData.get("type") as "credit" | "loan" | "installment",
      status: "active" as const,
      description: formData.get("description") as string || undefined
    };

    if (editingCredit) {
      setCredits(prev => prev.map(credit => credit.id === editingCredit.id ? creditData : credit));
      addNotification({ message: "Кредит успешно обновлен", type: "success" });
    } else {
      setCredits(prev => [...prev, creditData]);
      addNotification({ message: "Кредит успешно добавлен", type: "success" });
    }

    setIsCreditDialogOpen(false);
    setEditingCredit(null);
  };

  const handlePaymentSubmit = (formData: FormData) => {
    const paymentData = {
      id: Date.now().toString(),
      creditId: selectedCreditId,
      amount: parseFloat(formData.get("amount") as string),
      paymentDate: formData.get("paymentDate") as string,
      principalAmount: parseFloat(formData.get("principalAmount") as string),
      interestAmount: parseFloat(formData.get("interestAmount") as string),
      status: "paid" as const
    };

    setPayments(prev => [...prev, paymentData]);
    
    // Обновляем баланс кредита
    setCredits(prev => prev.map(credit => {
      if (credit.id === selectedCreditId) {
        const newBalance = Math.max(0, credit.currentBalance - paymentData.principalAmount);
        return {
          ...credit,
          currentBalance: newBalance,
          status: newBalance === 0 ? "paid" as const : credit.status
        };
      }
      return credit;
    }));

    addNotification({ message: "Платеж успешно добавлен", type: "success" });
    setIsPaymentDialogOpen(false);
    setSelectedCreditId("");
  };

  const deleteCredit = (id: string) => {
    setCredits(prev => prev.filter(credit => credit.id !== id));
    setPayments(prev => prev.filter(payment => payment.creditId !== id));
    addNotification({ message: "Кредит удален", type: "info" });
  };

  const getPaymentProgress = (credit: Credit) => {
    const paidAmount = credit.amount - credit.currentBalance;
    return (paidAmount / credit.amount) * 100;
  };

  const getDaysUntilNextPayment = (credit: Credit) => {
    const today = new Date();
    const nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, new Date(credit.startDate).getDate());
    const diffTime = nextPaymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">Общий долг</span>
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
              <span className="text-orange-700 dark:text-orange-300">Ежемесячно</span>
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
              <span className="text-blue-700 dark:text-blue-300">Активных кредитов</span>
            </div>
            <p className="text-2xl text-blue-900 dark:text-blue-100">
              {getActiveCreditsCount()}
            </p>
          </CardContent>
        </Card>
      </div>

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
              <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить кредит
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
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
                      <Input 
                        id="bank" 
                        name="bank" 
                        required 
                        defaultValue={editingCredit?.bank}
                        placeholder="Название банка"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Тип кредита</Label>
                      <Select name="type" defaultValue={editingCredit?.type}>
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="startDate">Дата оформления</Label>
                      <Input 
                        id="startDate" 
                        name="startDate" 
                        type="date" 
                        required 
                        defaultValue={editingCredit?.startDate}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Дата окончания</Label>
                      <Input 
                        id="endDate" 
                        name="endDate" 
                        type="date" 
                        required 
                        defaultValue={editingCredit?.endDate}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        defaultValue={editingCredit?.description}
                        placeholder="Дополнительная информация"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingCredit ? "Обновить" : "Добавить"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsCreditDialogOpen(false);
                          setEditingCredit(null);
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
                {credits.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Кредиты не найдены</p>
                    <p className="text-sm text-muted-foreground">Добавьте первый кредит для начала отслеживания</p>
                  </div>
                ) : (
                  credits.map(credit => {
                    const progress = getPaymentProgress(credit);
                    const daysUntilPayment = getDaysUntilNextPayment(credit);
                    
                    return (
                      <div key={credit.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4>{credit.name}</h4>
                              <Badge variant={credit.status === "active" ? "default" : credit.status === "paid" ? "secondary" : "destructive"}>
                                {credit.status === "active" ? "Активный" : credit.status === "paid" ? "Погашен" : "Просрочен"}
                              </Badge>
                              <Badge variant="outline">{credit.type === "credit" ? "Кредит" : credit.type === "loan" ? "Займ" : "Рассрочка"}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {credit.bank} • {credit.interestRate}% годовых
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCredit(credit);
                                setIsCreditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCredit(credit.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Остаток долга</p>
                            <p className="text-lg">{credit.currentBalance.toLocaleString("kk-KZ")} ₸</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Ежемесячный платеж</p>
                            <p className="text-lg">{credit.monthlyPayment.toLocaleString("kk-KZ")} ₸</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">До следующего платежа</p>
                            <p className="text-lg">{daysUntilPayment} дней</p>
                          </div>
                        </div>

                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>Прогресс погашения: {progress.toFixed(1)}%</span>
                            <span>
                              {(credit.amount - credit.currentBalance).toLocaleString("kk-KZ")} ₸ / {credit.amount.toLocaleString("kk-KZ")} ₸
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {new Date(credit.startDate).toLocaleDateString("ru-RU")} - {new Date(credit.endDate).toLocaleDateString("ru-RU")}
                          </span>
                          {credit.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCreditId(credit.id);
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              Добавить платеж
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
        </TabsContent>

        <TabsContent value="payments">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>История платежей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет платежей. Добавьте кредиты и регистрируйте платежи.
                  </p>
                ) : (
                  payments.map(payment => {
                    const credit = credits.find(c => c.id === payment.creditId);
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4>{credit?.name || "Неизвестный кредит"}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.paymentDate).toLocaleDateString("ru-RU")} • 
                            Основной долг: {payment.principalAmount.toLocaleString("kk-KZ")} ₸ • 
                            Проценты: {payment.interestAmount.toLocaleString("kk-KZ")} ₸
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg">{payment.amount.toLocaleString("kk-KZ")} ₸</span>
                          <Badge variant="secondary" className="ml-2">Оплачено</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Диалог добавления платежа */}
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить платеж</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                <div>
                  <Label htmlFor="amount">Общая сумма платежа (₸)</Label>
                  <Input 
                    id="amount" 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="principalAmount">Основной долг (₸)</Label>
                  <Input 
                    id="principalAmount" 
                    name="principalAmount" 
                    type="number" 
                    step="0.01" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="interestAmount">Проценты (₸)</Label>
                  <Input 
                    id="interestAmount" 
                    name="interestAmount" 
                    type="number" 
                    step="0.01" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="paymentDate">Дата платежа</Label>
                  <Input 
                    id="paymentDate" 
                    name="paymentDate" 
                    type="date" 
                    required 
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Добавить платеж
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsPaymentDialogOpen(false);
                      setSelectedCreditId("");
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                      <Bar dataKey="payments" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для отображения г��афика. Добавьте кредиты для анализа.
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

export default Credits;