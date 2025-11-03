import { useState, useEffect } from "react";
import { Zap, Plus, Edit, Trash2, Activity, Calculator, TrendingUp, Calendar, AlertCircle } from "lucide-react";
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
import { Separator } from "./ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Utility, UtilityReading } from "../types";

// Константы типов коммунальных услуг
const UTILITY_TYPES = [
  { value: "electricity", label: "Электричество", icon: "⚡", unit: "кВт/ч", color: "#f59e0b" },
  { value: "gas", label: "Газ", icon: "🔥", unit: "м³", color: "#ef4444" },
  { value: "water", label: "Вода", icon: "💧", unit: "м³", color: "#3b82f6" },
  { value: "heating", label: "Отопление", icon: "🔥", unit: "Гкал", color: "#dc2626" },
  { value: "internet", label: "Интернет", icon: "📡", unit: "мес", color: "#8b5cf6" },
  { value: "other", label: "Другое", icon: "🏠", unit: "ед", color: "#6b7280" }
] as const;

function Utilities() {
  const { addNotification } = useAppActions();
  const [utilities, setUtilities] = useLocalStorage<Utility[]>("utilities", []);
  const [readings, setReadings] = useLocalStorage<UtilityReading[]>("utility-readings", []);
  
  const [isUtilityDialogOpen, setIsUtilityDialogOpen] = useState(false);
  const [isReadingDialogOpen, setIsReadingDialogOpen] = useState(false);
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null);
  const [selectedUtilityId, setSelectedUtilityId] = useState<string>("");

  // Расчеты для статистики
  const getCurrentMonthTotal = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return readings
      .filter(reading => {
        const readingDate = new Date(reading.readingDate);
        return readingDate.getMonth() === currentMonth && 
               readingDate.getFullYear() === currentYear;
      })
      .reduce((sum, reading) => sum + reading.amount, 0);
  };

  const getActiveUtilitiesCount = () => {
    return utilities.length;
  };

  const getPendingPaymentsCount = () => {
    return readings.filter(reading => reading.status === "pending").length;
  };

  // Данные для аналитики
  const getMonthlyConsumptionData = () => {
    const monthlyData = readings.reduce((acc, reading) => {
      const date = new Date(reading.readingDate);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthName, amount: 0, consumption: 0 };
      }
      acc[monthKey].amount += reading.amount;
      acc[monthKey].consumption += reading.consumption;
      return acc;
    }, {} as Record<string, { month: string; amount: number; consumption: number }>);

    return Object.values(monthlyData).sort((a, b) => {
      const [yearA, monthA] = a.month.split(" ");
      const [yearB, monthB] = b.month.split(" ");
      return new Date(parseInt(yearA), monthA === "янв" ? 0 : monthA === "фев" ? 1 : 2).getTime() - 
             new Date(parseInt(yearB), monthB === "янв" ? 0 : monthB === "фев" ? 1 : 2).getTime();
    });
  };

  const getUtilityTypeData = () => {
    const typeData = utilities.reduce((acc, utility) => {
      const type = UTILITY_TYPES.find(t => t.value === utility.type);
      const utilityReadings = readings.filter(r => r.utilityId === utility.id);
      const totalAmount = utilityReadings.reduce((sum, r) => sum + r.amount, 0);
      
      if (!acc[utility.type]) {
        acc[utility.type] = {
          name: type?.label || utility.type,
          value: 0,
          color: type?.color || "#6b7280"
        };
      }
      acc[utility.type].value += totalAmount;
      return acc;
    }, {} as Record<string, { name: string; value: number; color: string }>);

    return Object.values(typeData);
  };

  // Обработчики форм
  const handleUtilitySubmit = (formData: FormData) => {
    const utilityData = {
      id: editingUtility?.id || Date.now().toString(),
      name: formData.get("name") as string,
      type: formData.get("type") as "electricity" | "gas" | "water" | "heating" | "internet" | "other",
      provider: formData.get("provider") as string,
      accountNumber: formData.get("accountNumber") as string,
      tariff: parseFloat(formData.get("tariff") as string),
      unit: formData.get("unit") as string,
      isMetered: formData.get("isMetered") === "on",
      meterNumber: formData.get("meterNumber") as string || undefined
    };

    if (editingUtility) {
      setUtilities(prev => prev.map(utility => utility.id === editingUtility.id ? utilityData : utility));
      addNotification({ message: "Коммунальная услуга обновлена", type: "success" });
    } else {
      setUtilities(prev => [...prev, utilityData]);
      addNotification({ message: "Коммунальная услуга добавлена", type: "success" });
    }

    setIsUtilityDialogOpen(false);
    setEditingUtility(null);
  };

  const handleReadingSubmit = (formData: FormData) => {
    const utility = utilities.find(u => u.id === selectedUtilityId);
    if (!utility) return;

    const currentReading = parseFloat(formData.get("currentReading") as string);
    const previousReading = parseFloat(formData.get("previousReading") as string) || 0;
    const consumption = currentReading - previousReading;
    const amount = consumption * utility.tariff;

    const readingData = {
      id: Date.now().toString(),
      utilityId: selectedUtilityId,
      currentReading,
      previousReading,
      readingDate: formData.get("readingDate") as string,
      consumption,
      amount,
      status: "pending" as const
    };

    setReadings(prev => [...prev, readingData]);
    addNotification({ message: "Показания счетчика добавлены", type: "success" });

    setIsReadingDialogOpen(false);
    setSelectedUtilityId("");
  };

  const payReading = (readingId: string) => {
    setReadings(prev => prev.map(reading => 
      reading.id === readingId 
        ? { ...reading, status: "paid" as const }
        : reading
    ));
    addNotification({ message: "Платеж проведен", type: "success" });
  };

  const deleteUtility = (id: string) => {
    setUtilities(prev => prev.filter(utility => utility.id !== id));
    setReadings(prev => prev.filter(reading => reading.utilityId !== id));
    addNotification({ message: "Коммунальная услуга удалена", type: "info" });
  };

  const getLastReading = (utilityId: string) => {
    const utilityReadings = readings
      .filter(r => r.utilityId === utilityId)
      .sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime());
    
    return utilityReadings[0];
  };

  return (
    <div className="space-y-6">
      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">Общая сумма за месяц</span>
            </div>
            <p className="text-2xl text-blue-900 dark:text-blue-100">
              {getCurrentMonthTotal().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Подключенных услуг</span>
            </div>
            <p className="text-2xl text-green-900 dark:text-green-100">
              {getActiveUtilitiesCount()}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-700 dark:text-orange-300">Ожидают оплаты</span>
            </div>
            <p className="text-2xl text-orange-900 dark:text-orange-100">
              {getPendingPaymentsCount()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs defaultValue="utilities" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="utilities">Услуги</TabsTrigger>
          <TabsTrigger value="readings">Показания</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="utilities">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Коммунальные услуги</CardTitle>
              <Dialog open={isUtilityDialogOpen} onOpenChange={setIsUtilityDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить услугу
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingUtility ? "Редактировать услугу" : "Добавить услугу"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleUtilitySubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название услуги</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        required 
                        defaultValue={editingUtility?.name}
                        placeholder="Например: Электричество квартира"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Тип услуги</Label>
                      <Select name="type" defaultValue={editingUtility?.type}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          {UTILITY_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="provider">Поставщик</Label>
                      <Input 
                        id="provider" 
                        name="provider" 
                        required 
                        defaultValue={editingUtility?.provider}
                        placeholder="Название компании"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Номер лицевого счета</Label>
                      <Input 
                        id="accountNumber" 
                        name="accountNumber" 
                        required 
                        defaultValue={editingUtility?.accountNumber}
                        placeholder="Лицевой счет"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tariff">Тариф (₸ за единицу)</Label>
                      <Input 
                        id="tariff" 
                        name="tariff" 
                        type="number" 
                        step="0.01" 
                        required 
                        defaultValue={editingUtility?.tariff}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Единица измерения</Label>
                      <Input 
                        id="unit" 
                        name="unit" 
                        required 
                        defaultValue={editingUtility?.unit}
                        placeholder="кВт/ч, м³, Гкал"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isMetered" 
                        name="isMetered" 
                        defaultChecked={editingUtility?.isMetered}
                      />
                      <Label htmlFor="isMetered">Счетчик установлен</Label>
                    </div>
                    <div>
                      <Label htmlFor="meterNumber">Номер счетчика (опционально)</Label>
                      <Input 
                        id="meterNumber" 
                        name="meterNumber" 
                        defaultValue={editingUtility?.meterNumber}
                        placeholder="Серийный номер счетчика"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingUtility ? "Обновить" : "Добавить"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsUtilityDialogOpen(false);
                          setEditingUtility(null);
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
                {utilities.length === 0 ? (
                  <div className="text-center py-8">
                    <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Коммунальные услуги не найдены</p>
                    <p className="text-sm text-muted-foreground">Добавьте первую услугу для начала учета</p>
                  </div>
                ) : (
                  utilities.map(utility => {
                    const type = UTILITY_TYPES.find(t => t.value === utility.type);
                    const lastReading = getLastReading(utility.id);
                    
                    return (
                      <div key={utility.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span>{type?.icon}</span>
                              <h4>{utility.name}</h4>
                              <Badge variant="outline">{type?.label}</Badge>
                              {utility.isMetered && (
                                <Badge variant="secondary">Счетчик</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {utility.provider} • Л/С: {utility.accountNumber} • {utility.tariff} ₸/{utility.unit}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUtility(utility);
                                setIsUtilityDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUtility(utility.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {lastReading && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-3 bg-muted/50 rounded">
                            <div>
                              <p className="text-sm text-muted-foreground">Последние показания</p>
                              <p className="text-lg">{lastReading.currentReading} {utility.unit}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Расход</p>
                              <p className="text-lg">{lastReading.consumption} {utility.unit}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">К доплате</p>
                              <p className="text-lg">{lastReading.amount.toLocaleString("kk-KZ")} ₸</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {utility.meterNumber && `Счетчик: ${utility.meterNumber}`}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUtilityId(utility.id);
                              setIsReadingDialogOpen(true);
                            }}
                          >
                            <Calculator className="w-4 h-4 mr-1" />
                            Внести показания
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Диалог внесения показаний */}
          <Dialog open={isReadingDialogOpen} onOpenChange={setIsReadingDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Внести показания счетчика</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleReadingSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                <div>
                  <Label htmlFor="currentReading">Текущие показания</Label>
                  <Input 
                    id="currentReading" 
                    name="currentReading" 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="Введите текущие показания"
                  />
                </div>
                <div>
                  <Label htmlFor="previousReading">Предыдущие показания</Label>
                  <Input 
                    id="previousReading" 
                    name="previousReading" 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="Предыдущие показания"
                  />
                </div>
                <div>
                  <Label htmlFor="readingDate">Дата снятия показаний</Label>
                  <Input 
                    id="readingDate" 
                    name="readingDate" 
                    type="date" 
                    required 
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Внести показания
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsReadingDialogOpen(false);
                      setSelectedUtilityId("");
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="readings">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>История показаний и платежей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {readings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет показаний. Добавьте услуги и вносите показания счетчиков.
                  </p>
                ) : (
                  readings.map(reading => {
                    const utility = utilities.find(u => u.id === reading.utilityId);
                    const type = UTILITY_TYPES.find(t => t.value === utility?.type);
                    
                    return (
                      <div key={reading.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{type?.icon}</span>
                            <h4>{utility?.name || "Неизвестная услуга"}</h4>
                            <Badge variant={reading.status === "paid" ? "default" : "secondary"}>
                              {reading.status === "paid" ? "Оплачено" : "К оплате"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(reading.readingDate).toLocaleDateString("ru-RU")} • 
                            Показания: {reading.currentReading} {utility?.unit} • 
                            Расход: {reading.consumption} {utility?.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{reading.amount.toLocaleString("kk-KZ")} ₸</span>
                          {reading.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => payReading(reading.id)}
                            >
                              Оплатить
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

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Расходы по месяцам */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Расходы на коммунальные услуги</CardTitle>
              </CardHeader>
              <CardContent>
                {getMonthlyConsumptionData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getMonthlyConsumptionData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Bar dataKey="amount" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для отображения аналитики. Внесите показания для анализа.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Распределение по типам услуг */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Распределение расходов по типам услуг</CardTitle>
              </CardHeader>
              <CardContent>
                {getUtilityTypeData().length > 0 ? (
                  <div className="space-y-4">
                    {getUtilityTypeData().map((item, index) => {
                      const total = getUtilityTypeData().reduce((sum, d) => sum + d.value, 0);
                      const percentage = total > 0 ? (item.value / total) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </span>
                            <span>{item.value.toLocaleString("kk-KZ")} ₸</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для анализа распределения расходов.
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

export default Utilities;