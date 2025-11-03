import { useState, useEffect } from "react";
import { Plus, Calculator, Tag, Wallet, CreditCard, PiggyBank, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner@2.0.3";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Deposit } from "../types";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  source: string;
  sourceType: string;
}

const categories = [
  "Продукты", "Транспорт", "Развлечения", "Здоровье", 
  "Одежда", "Кредиты", "Аренда", "Коммунальные", "Прочее"
];

function QuickExpenseAdd() {
  const [deposits, setDeposits] = useLocalStorage<Deposit[]>("deposits", []);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("quick-expenses", []);
  
  const [formData, setFormData] = useState({
    amount: 0,
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    source: "",
    sourceType: ""
  });

  const [quickAmounts] = useState([500, 2500, 5000, 10000, 25000]);

  const handleAddExpense = () => {
    if (!formData.amount || !formData.category || !formData.source) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const selectedDeposit = deposits.find(d => d.id === formData.source);
    
    if (!selectedDeposit) {
      toast.error("Выбранный депозит не найден");
      return;
    }

    if (selectedDeposit.currentBalance < formData.amount) {
      toast.error(`Недостаточно средств на депозите "${selectedDeposit.title}". Доступно: ${selectedDeposit.currentBalance.toLocaleString("kk-KZ")} ₸`);
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: formData.amount,
      category: formData.category,
      description: formData.description,
      date: new Date(formData.date),
      source: selectedDeposit.title,
      sourceType: "deposit"
    };

    // Обновляем баланс депозита
    setDeposits(prev => prev.map(deposit => 
      deposit.id === formData.source 
        ? { ...deposit, currentBalance: deposit.currentBalance - formData.amount }
        : deposit
    ));

    setExpenses([newExpense, ...expenses]);
    toast.success(`Расход добавлен! Списано с: ${selectedDeposit.title}`);
    
    setFormData({
      amount: 0,
      category: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      source: "",
      sourceType: ""
    });
  };

  const handleQuickAmount = (amount: number) => {
    setFormData({ ...formData, amount });
  };

  const getTodayExpenses = () => {
    const today = new Date().toDateString();
    return expenses.filter(expense => new Date(expense.date).toDateString() === today);
  };

  const todayTotal = getTodayExpenses().reduce((sum, expense) => sum + expense.amount, 0);

  const getAvailableDeposits = () => {
    return deposits.filter(deposit => 
      deposit.isActive && (deposit.type === "spending" || deposit.currentBalance > 0)
    );
  };

  const getTotalBalance = () => {
    return deposits
      .filter(d => d.isActive)
      .reduce((sum, d) => sum + d.currentBalance, 0);
  };

  return (
    <div className="space-y-6">
      {/* Обзор депозитов */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Обзор доступных депозитов
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getAvailableDeposits().length === 0 ? (
            <div className="text-center py-8">
              <PiggyBank className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Нет доступных депозитов</p>
              <p className="text-sm text-muted-foreground">Создайте депозит в разделе "Депозиты" для начала работы</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getAvailableDeposits().map((deposit) => (
                  <div key={deposit.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <p className="font-medium truncate">{deposit.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {deposit.currentBalance.toLocaleString("kk-KZ")} ₸
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {deposit.type === "spending" ? "Расходный" : "Накопительный"}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Общий доступный баланс:</span>
                  <span className="font-bold text-lg">
                    {getTotalBalance().toLocaleString("kk-KZ")} ₸
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Быстрое добавление расхода
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount">Сумма (₸)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                placeholder="0"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(amount)}
                    className="text-xs"
                  >
                    {amount.toLocaleString("kk-KZ")}₸
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="source">Депозит *</Label>
              <Select 
                value={formData.source} 
                onValueChange={(value) => setFormData({ ...formData, source: value, sourceType: "deposit" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите депозит" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableDeposits().map((deposit) => (
                    <SelectItem key={deposit.id} value={deposit.id}>
                      <div className="flex items-center gap-2">
                        <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                          <span className="font-medium">{deposit.title}</span>
                          <div className="text-xs text-muted-foreground">
                            {deposit.currentBalance.toLocaleString("kk-KZ")} ₸
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.source && (() => {
                const selectedDeposit = deposits.find(d => d.id === formData.source);
                return selectedDeposit ? (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Доступно: <span className="font-medium">{selectedDeposit.currentBalance.toLocaleString("kk-KZ")} ₸</span>
                    </p>
                  </div>
                ) : null;
              })()}
            </div>

            <div>
              <Label htmlFor="category">Категория *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Дата</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Описание (необязательно)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание расхода"
                rows={2}
              />
            </div>

            <Button 
              onClick={handleAddExpense} 
              className="w-full" 
              disabled={!formData.amount || !formData.category || !formData.source || getAvailableDeposits().length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить расход
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Расходы за сегодня
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {todayTotal.toLocaleString("kk-KZ")} ₸
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {getTodayExpenses().length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Сегодня ещё нет расходов
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {getTodayExpenses().map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{expense.category}</p>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground">{expense.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <PiggyBank className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{expense.source}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        -{expense.amount.toLocaleString("kk-KZ")} ₸
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleTimeString("ru-RU", { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Статистика расходов по депозитам */}
      {expenses.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Статистика расходов по депозитам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const sourceStats = expenses.reduce((acc, expense) => {
                  if (!acc[expense.source]) {
                    acc[expense.source] = {
                      total: 0,
                      count: 0,
                      sourceType: expense.sourceType
                    };
                  }
                  acc[expense.source].total += expense.amount;
                  acc[expense.source].count += 1;
                  return acc;
                }, {} as Record<string, { total: number; count: number; sourceType: string }>);

                return Object.entries(sourceStats).map(([sourceName, stats]) => (
                  <div key={sourceName} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <PiggyBank className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{sourceName}</p>
                        <p className="text-sm text-muted-foreground">{stats.count} операций</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        -{stats.total.toLocaleString("kk-KZ")} ₸
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default QuickExpenseAdd;
