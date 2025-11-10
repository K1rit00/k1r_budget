import React from "react";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Building, Plus, Edit, Trash2, DollarSign, Calendar, FileText, Upload, Download, Eye, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { RentProperty, RentPayment, UtilityItem } from "../types";
import { toast } from "sonner@2.0.3";

function Rent() {
  const { addNotification } = useAppActions();
  const [properties, setProperties] = useLocalStorage<RentProperty[]>("rent-properties", []);
  const [payments, setPayments] = useLocalStorage<RentPayment[]>("rent-payments", []);
  
  const [isPropertyDialogOpen, setIsPropertyDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RentProperty | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<{ data: string; name: string } | null>(null);
  const [utilityItems, setUtilityItems] = useState<UtilityItem[]>([{ id: Date.now().toString(), name: "", amount: 0 }]);
  const [selectedUtilitiesType, setSelectedUtilitiesType] = useState<"included" | "fixed" | "variable">("variable");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Расчеты для статистики
  const getTotalRentExpense = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return payments
      .filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               payment.status === "paid";
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getActivePropertiesCount = () => {
    return properties.filter(property => property.status === "active").length;
  };

  const getPendingPaymentsCount = () => {
    return payments.filter(payment => payment.status === "pending").length;
  };

  const getUpcomingPaymentAmount = () => {
    const activeProperty = properties.find(p => p.status === "active");
    if (!activeProperty) return 0;
    
    let total = activeProperty.rentAmount;
    if (activeProperty.utilitiesType === "fixed" && activeProperty.utilitiesAmount) {
      total += activeProperty.utilitiesAmount;
    }
    return total;
  };

  // Данные для аналитики
  const getMonthlyExpenseData = () => {
    const monthlyData = payments.reduce((acc, payment) => {
      if (payment.status !== "paid") return acc;
      
      const date = new Date(payment.paymentDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthName, rent: 0, utilities: 0, total: 0 };
      }
      
      if (payment.paymentType === "utilities") {
        acc[monthKey].utilities += payment.amount;
      } else {
        acc[monthKey].rent += payment.amount;
      }
      acc[monthKey].total += payment.amount;
      
      return acc;
    }, {} as Record<string, { month: string; rent: number; utilities: number; total: number }>);

    return Object.values(monthlyData).sort((a, b) => {
      const [aYear, aMonth] = a.month.split(" ");
      const [bYear, bMonth] = b.month.split(" ");
      return new Date(`${aYear}-${aMonth}-01`).getTime() - new Date(`${bYear}-${bMonth}-01`).getTime();
    });
  };

  // Обработчик загрузки файла
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера файла (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимальный размер: 5MB");
      return;
    }

    // Проверка типа файла
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Неподдерживаемый формат файла. Используйте JPG, PNG, WEBP или PDF");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setReceiptFile({ data: base64, name: file.name });
      toast.success("Квитанция загружена");
    };
    reader.readAsDataURL(file);
  };

  // Скачивание квитанции
  const downloadReceipt = (payment: RentPayment) => {
    if (!payment.receiptFile || !payment.receiptFileName) return;

    const link = document.createElement("a");
    link.href = payment.receiptFile;
    link.download = payment.receiptFileName;
    link.click();
  };

  // Просмотр квитанции
  const viewReceipt = (payment: RentPayment) => {
    if (!payment.receiptFile) return;
    window.open(payment.receiptFile, "_blank");
  };

  // Обработчики форм
  const handlePropertySubmit = (formData: FormData) => {
    const utilitiesType = formData.get("utilitiesType") as "included" | "fixed" | "variable";
    
    // Рассчитываем общую сумму коммунальных платежей если тип "fixed"
    let totalUtilitiesAmount = 0;
    if (utilitiesType === "fixed") {
      totalUtilitiesAmount = utilityItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    const propertyData: RentProperty = {
      id: editingProperty?.id || Date.now().toString(),
      address: formData.get("address") as string,
      ownerName: formData.get("ownerName") as string,
      rentAmount: parseFloat(formData.get("rentAmount") as string),
      deposit: parseFloat(formData.get("deposit") as string),
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string || undefined,
      status: "active" as const,
      utilitiesIncluded: utilitiesType === "included",
      utilitiesType: utilitiesType,
      utilities: utilitiesType === "fixed" ? utilityItems.filter(item => item.name && item.amount > 0) : undefined,
      utilitiesAmount: utilitiesType === "fixed" ? totalUtilitiesAmount : undefined,
      description: formData.get("description") as string || undefined,
      tenants: []
    };

    if (editingProperty) {
      setProperties(prev => prev.map(property => property.id === editingProperty.id ? propertyData : property));
      addNotification({ message: "Объект недвижимости обновлен", type: "success" });
    } else {
      setProperties(prev => [...prev, propertyData]);
      addNotification({ message: "Объект недвижимости добавлен", type: "success" });
    }

    setIsPropertyDialogOpen(false);
    setEditingProperty(null);
    // Сбросить utility items
    setUtilityItems([{ id: Date.now().toString(), name: "", amount: 0 }]);
    setSelectedUtilitiesType("variable");
  };

  const handlePaymentSubmit = (formData: FormData) => {
    const paymentData: RentPayment = {
      id: Date.now().toString(),
      propertyId: selectedPropertyId,
      amount: parseFloat(formData.get("amount") as string),
      paymentDate: formData.get("paymentDate") as string,
      status: "paid" as const,
      paymentType: formData.get("paymentType") as "rent" | "utilities",
      notes: formData.get("notes") as string || undefined,
      receiptFile: receiptFile?.data,
      receiptFileName: receiptFile?.name
    };

    setPayments(prev => [...prev, paymentData]);
    
    addNotification({ 
      message: "Платеж добавлен успешно", 
      type: "success" 
    });

    setIsPaymentDialogOpen(false);
    setSelectedPropertyId("");
    setReceiptFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const deleteProperty = (id: string) => {
    setProperties(prev => prev.filter(property => property.id !== id));
    setPayments(prev => prev.filter(payment => payment.propertyId !== id));
    addNotification({ message: "Объект недвижимости удален", type: "info" });
  };

  const deletePayment = (id: string) => {
    setPayments(prev => prev.filter(payment => payment.id !== id));
    addNotification({ message: "Платеж удален", type: "info" });
  };

  // Функции для работы с коммунальными услугами
  const addUtilityItem = () => {
    setUtilityItems([...utilityItems, { id: Date.now().toString(), name: "", amount: 0 }]);
  };

  const removeUtilityItem = (id: string) => {
    if (utilityItems.length > 1) {
      setUtilityItems(utilityItems.filter(item => item.id !== id));
    }
  };

  const updateUtilityItem = (id: string, field: 'name' | 'amount', value: string | number) => {
    setUtilityItems(utilityItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Эффект для инициализации utility items при редактировании
  useEffect(() => {
    if (editingProperty && isPropertyDialogOpen) {
      if (editingProperty.utilities && editingProperty.utilities.length > 0) {
        setUtilityItems(editingProperty.utilities);
      } else {
        setUtilityItems([{ id: Date.now().toString(), name: "", amount: 0 }]);
      }
      setSelectedUtilitiesType(editingProperty.utilitiesType || "variable");
    } else if (!isPropertyDialogOpen) {
      setUtilityItems([{ id: Date.now().toString(), name: "", amount: 0 }]);
      setSelectedUtilitiesType("variable");
    }
  }, [editingProperty, isPropertyDialogOpen]);

  return (
    <div className="space-y-6">
      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">Затраты за месяц</span>
            </div>
            <p className="text-2xl text-blue-900 dark:text-blue-100">
              {getTotalRentExpense().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-700 dark:text-purple-300">Активных объектов</span>
            </div>
            <p className="text-2xl text-purple-900 dark:text-purple-100">
              {getActivePropertiesCount()}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-orange-700 dark:text-orange-300">Ожидающих оплаты</span>
            </div>
            <p className="text-2xl text-orange-900 dark:text-orange-100">
              {getPendingPaymentsCount()}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">Предстоящий платеж</span>
            </div>
            <p className="text-2xl text-green-900 dark:text-green-100">
              {getUpcomingPaymentAmount().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs defaultValue="properties" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="properties">Объекты аренды</TabsTrigger>
          <TabsTrigger value="payments">История платежей</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="properties">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Мои объекты аренды</CardTitle>
              <Dialog open={isPropertyDialogOpen} onOpenChange={setIsPropertyDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingProperty(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить объект
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProperty ? "Редактировать объект" : "Добавить объект аренды"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handlePropertySubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                    <div>
                      <Label htmlFor="address">Адрес объекта</Label>
                      <Input 
                        id="address" 
                        name="address" 
                        required 
                        defaultValue={editingProperty?.address}
                        placeholder="г. Алматы, ул. Абая 123, кв. 45"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ownerName">Имя владельца/арендодателя</Label>
                      <Input 
                        id="ownerName" 
                        name="ownerName" 
                        required 
                        defaultValue={editingProperty?.ownerName}
                        placeholder="ФИО владельца"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rentAmount">Арендная плата (₸)</Label>
                      <Input 
                        id="rentAmount" 
                        name="rentAmount" 
                        type="number" 
                        step="0.01" 
                        required 
                        defaultValue={editingProperty?.rentAmount}
                        placeholder="150000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deposit">Залог (₸)</Label>
                      <Input 
                        id="deposit" 
                        name="deposit" 
                        type="number" 
                        step="0.01" 
                        required 
                        defaultValue={editingProperty?.deposit}
                        placeholder="150000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="startDate">Дата начала аренды</Label>
                      <Input 
                        id="startDate" 
                        name="startDate" 
                        type="date" 
                        required 
                        defaultValue={editingProperty?.startDate}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Дата окончания аренды (опционально)</Label>
                      <Input 
                        id="endDate" 
                        name="endDate" 
                        type="date" 
                        defaultValue={editingProperty?.endDate}
                      />
                    </div>
                    <div>
                      <Label htmlFor="utilitiesType">Коммунальные платежи</Label>
                      <Select 
                        name="utilitiesType" 
                        value={selectedUtilitiesType}
                        onValueChange={(value: "included" | "fixed" | "variable") => {
                          setSelectedUtilitiesType(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="included">Включены в аренду</SelectItem>
                          <SelectItem value="fixed">Фиксированная сумма</SelectItem>
                          <SelectItem value="variable">Переменная (по счетчикам)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedUtilitiesType === "fixed" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Коммунальные услуги</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addUtilityItem}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Добавить услугу
                          </Button>
                        </div>
                        
                        {utilityItems.map((item, index) => (
                          <div key={item.id} className="flex gap-2 items-start">
                            <div className="flex-1">
                              <Input
                                placeholder="Наименование (например, Электричество)"
                                value={item.name}
                                onChange={(e) => updateUtilityItem(item.id, 'name', e.target.value)}
                              />
                            </div>
                            <div className="w-32">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Сумма"
                                value={item.amount || ''}
                                onChange={(e) => updateUtilityItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeUtilityItem(item.id)}
                              disabled={utilityItems.length === 1}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        
                        {utilityItems.length > 0 && (
                          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span className="text-sm">Итого коммунальные платежи:</span>
                            <span>{utilityItems.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString("kk-KZ")} ₸</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="description">Описание/Примечания</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        defaultValue={editingProperty?.description}
                        placeholder="Дополнительная информация об объекте"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingProperty ? "Обновить" : "Добавить"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsPropertyDialogOpen(false);
                          setEditingProperty(null);
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
                {properties.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="mb-2">Нет объектов аренды</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Добавьте информацию о вашей квартире или доме
                    </p>
                    <Button onClick={() => setIsPropertyDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить первый объект
                    </Button>
                  </div>
                ) : (
                  properties.map(property => (
                    <div key={property.id} className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3>{property.address}</h3>
                            <Badge variant={property.status === "active" ? "default" : "secondary"}>
                              {property.status === "active" ? "Активный" : "Завершен"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Владелец: {property.ownerName}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingProperty(property);
                              setIsPropertyDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Вы уверены, что хотите удалить этот объект?")) {
                                deleteProperty(property.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Арендная плата</p>
                          <p className="text-xl">{property.rentAmount.toLocaleString("kk-KZ")} ₸</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Залог</p>
                          <p className="text-xl">{property.deposit.toLocaleString("kk-KZ")} ₸</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Коммунальные платежи</p>
                          <p className="text-xl">
                            {property.utilitiesType === "included" ? "Включены" : 
                             property.utilitiesType === "fixed" ? `${property.utilitiesAmount?.toLocaleString("kk-KZ")} ₸` : 
                             "По счетчикам"}
                          </p>
                        </div>
                      </div>

                      {property.utilitiesType === "fixed" && property.utilities && property.utilities.length > 0 && (
                        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Детализация коммунальных услуг:</p>
                          <div className="space-y-1">
                            {property.utilities.map((utility) => (
                              <div key={utility.id} className="flex justify-between text-sm">
                                <span>{utility.name}</span>
                                <span>{utility.amount.toLocaleString("kk-KZ")} ₸</span>
                              </div>
                            ))}
                            <Separator className="my-2" />
                            <div className="flex justify-between">
                              <span>Итого с коммуналкой:</span>
                              <span className="text-lg">
                                {(property.rentAmount + (property.utilitiesAmount || 0)).toLocaleString("kk-KZ")} ₸
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {property.description && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-1">Примечания</p>
                          <p className="text-sm">{property.description}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm pt-4 border-t">
                        <span className="text-muted-foreground">
                          {new Date(property.startDate).toLocaleDateString("ru-RU")} - 
                          {property.endDate ? ` ${new Date(property.endDate).toLocaleDateString("ru-RU")}` : " Бессрочно"}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPropertyId(property.id);
                            setIsPaymentDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Добавить платеж
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Диалог добавления платежа */}
          <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
            setIsPaymentDialogOpen(open);
            if (!open) {
              setSelectedPropertyId("");
              setReceiptFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить платеж</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                <div>
                  <Label htmlFor="paymentType">Тип платежа</Label>
                  <Select name="paymentType" defaultValue="rent">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Аренда</SelectItem>
                      <SelectItem value="utilities">Коммунальные платежи</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Сумма платежа (₸)</Label>
                  <Input 
                    id="amount" 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="150000"
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
                <div>
                  <Label htmlFor="receipt">Квитанция об оплате</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      id="receipt"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                    {receiptFile && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Прикреплено
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Форматы: JPG, PNG, WEBP, PDF. Максимум 5MB
                  </p>
                </div>
                <div>
                  <Label htmlFor="notes">Примечания</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    placeholder="Дополнительная информация о платеже"
                    rows={3}
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
                      setSelectedPropertyId("");
                      setReceiptFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="mb-2">Нет платежей</h3>
                    <p className="text-sm text-muted-foreground">
                      Добавьте объект аренды и начните регистрировать платежи
                    </p>
                  </div>
                ) : (
                  [...payments]
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map(payment => {
                      const property = properties.find(p => p.id === payment.propertyId);
                      
                      return (
                        <div key={payment.id} className="flex items-start justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4>{property?.address || "Объект удален"}</h4>
                              <Badge variant={payment.paymentType === "rent" ? "default" : "secondary"}>
                                {payment.paymentType === "rent" ? "Аренда" : "Коммуналка"}
                              </Badge>
                              <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                                {payment.status === "paid" ? "Оплачено" : "Ожидает"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {new Date(payment.paymentDate).toLocaleDateString("ru-RU", { 
                                day: "numeric", 
                                month: "long", 
                                year: "numeric" 
                              })}
                            </p>
                            {payment.notes && (
                              <p className="text-sm text-muted-foreground">
                                {payment.notes}
                              </p>
                            )}
                            {payment.receiptFile && (
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewReceipt(payment)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Просмотр
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadReceipt(payment)}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Скачать
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  {payment.receiptFileName}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xl">
                              {payment.amount.toLocaleString("kk-KZ")} ₸
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Вы уверены, что хотите удалить этот платеж?")) {
                                  deletePayment(payment.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Аналитика расходов на аренду</CardTitle>
            </CardHeader>
            <CardContent>
              {getMonthlyExpenseData().length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Недостаточно данных для построения графика. Добавьте платежи для просмотра аналитики.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-4">Расходы по месяцам</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getMonthlyExpenseData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => `${value.toLocaleString("kk-KZ")} ₸`}
                        />
                        <Bar dataKey="rent" fill="hsl(var(--chart-1))" name="Аренда" stackId="a" />
                        <Bar dataKey="utilities" fill="hsl(var(--chart-2))" name="Коммуналка" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="mb-4">Детальная статистика</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getMonthlyExpenseData().map((data, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">{data.month}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm">Аренда:</span>
                              <span className="text-sm">{data.rent.toLocaleString("kk-KZ")} ₸</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Коммуналка:</span>
                              <span className="text-sm">{data.utilities.toLocaleString("kk-KZ")} ₸</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between">
                              <span>Итого:</span>
                              <span>{data.total.toLocaleString("kk-KZ")} ₸</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Rent;