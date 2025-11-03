import React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Building, Plus, Edit, Trash2, Users, CheckCircle, AlertCircle, DollarSign, Calendar } from "lucide-react";
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
import type { RentProperty, RentTenant, RentPayment } from "../types";

function Rent() {
  const { addNotification } = useAppActions();
  const [properties, setProperties] = useLocalStorage<RentProperty[]>("rent-properties", []);
  const [payments, setPayments] = useLocalStorage<RentPayment[]>("rent-payments", []);
  
  const [isPropertyDialogOpen, setIsPropertyDialogOpen] = useState(false);
  const [isTenantDialogOpen, setIsTenantDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RentProperty | null>(null);
  const [editingTenant, setEditingTenant] = useState<RentTenant | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [userRole, setUserRole] = useState<"landlord" | "tenant">("landlord");

  // Расчеты для статистики
  const getTotalRentIncome = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return payments
      .filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               payment.status === "confirmed";
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getActivePropertiesCount = () => {
    return properties.filter(property => property.status === "active").length;
  };

  const getPendingPaymentsCount = () => {
    return payments.filter(payment => payment.status === "pending").length;
  };

  // Данные для аналитики
  const getMonthlyIncomeData = () => {
    const monthlyData = payments.reduce((acc, payment) => {
      if (payment.status !== "confirmed") return acc;
      
      const date = new Date(payment.paymentDate);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthName, income: 0 };
      }
      acc[monthKey].income += payment.amount;
      return acc;
    }, {} as Record<string, { month: string; income: number }>);

    return Object.values(monthlyData).sort((a, b) => {
      const [yearA, monthA] = a.month.split(" ");
      const [yearB, monthB] = b.month.split(" ");
      return new Date(parseInt(yearA), monthA === "янв" ? 0 : monthA === "фев" ? 1 : 2).getTime() - 
             new Date(parseInt(yearB), monthB === "янв" ? 0 : monthB === "фев" ? 1 : 2).getTime();
    });
  };

  // Обработчики форм
  const handlePropertySubmit = (formData: FormData) => {
    const propertyData = {
      id: editingProperty?.id || Date.now().toString(),
      address: formData.get("address") as string,
      ownerName: formData.get("ownerName") as string,
      rentAmount: parseFloat(formData.get("rentAmount") as string),
      deposit: parseFloat(formData.get("deposit") as string),
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string || undefined,
      status: "active" as const,
      utilitiesIncluded: formData.get("utilitiesIncluded") === "on",
      description: formData.get("description") as string || undefined,
      tenants: editingProperty?.tenants || []
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
  };

  const handleTenantSubmit = (formData: FormData) => {
    const tenantData = {
      id: editingTenant?.id || Date.now().toString(),
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      sharePercentage: parseFloat(formData.get("sharePercentage") as string),
      monthlyAmount: parseFloat(formData.get("monthlyAmount") as string)
    };

    setProperties(prev => prev.map(property => {
      if (property.id === selectedPropertyId) {
        const updatedTenants = editingTenant 
          ? property.tenants.map(tenant => tenant.id === editingTenant.id ? tenantData : tenant)
          : [...property.tenants, tenantData];
        
        return { ...property, tenants: updatedTenants };
      }
      return property;
    }));

    addNotification({ 
      message: editingTenant ? "Арендатор обновлен" : "Арендатор добавлен", 
      type: "success" 
    });

    setIsTenantDialogOpen(false);
    setEditingTenant(null);
    setSelectedPropertyId("");
  };

  const handlePaymentSubmit = (formData: FormData) => {
    const paymentData = {
      id: Date.now().toString(),
      propertyId: selectedPropertyId,
      tenantId: formData.get("tenantId") as string || undefined,
      amount: parseFloat(formData.get("amount") as string),
      paymentDate: formData.get("paymentDate") as string,
      status: userRole === "landlord" ? "confirmed" as const : "pending" as const,
      notes: formData.get("notes") as string || undefined
    };

    setPayments(prev => [...prev, paymentData]);
    
    addNotification({ 
      message: userRole === "landlord" 
        ? "Платеж подтвержден" 
        : "Платеж отправлен на подтверждение", 
      type: "success" 
    });

    setIsPaymentDialogOpen(false);
    setSelectedPropertyId("");
  };

  const confirmPayment = (paymentId: string) => {
    setPayments(prev => prev.map(payment => 
      payment.id === paymentId 
        ? { ...payment, status: "confirmed" as const, confirmationDate: new Date().toISOString() }
        : payment
    ));
    addNotification({ message: "Платеж подтвержден", type: "success" });
  };

  const deleteProperty = (id: string) => {
    setProperties(prev => prev.filter(property => property.id !== id));
    setPayments(prev => prev.filter(payment => payment.propertyId !== id));
    addNotification({ message: "Объект недвижимости удален", type: "info" });
  };

  const deleteTenant = (propertyId: string, tenantId: string) => {
    setProperties(prev => prev.map(property => {
      if (property.id === propertyId) {
        return {
          ...property,
          tenants: property.tenants.filter(tenant => tenant.id !== tenantId)
        };
      }
      return property;
    }));
    addNotification({ message: "Арендатор удален", type: "info" });
  };

  return (
    <div className="space-y-6">
      {/* Переключатель роли */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label>Роль пользователя:</Label>
            <Select value={userRole} onValueChange={(value: "landlord" | "tenant") => setUserRole(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="landlord">Арендодатель</SelectItem>
                <SelectItem value="tenant">Арендатор</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Доход от аренды</span>
            </div>
            <p className="text-2xl text-green-900 dark:text-green-100">
              {getTotalRentIncome().toLocaleString("kk-KZ")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">Активных объектов</span>
            </div>
            <p className="text-2xl text-blue-900 dark:text-blue-100">
              {getActivePropertiesCount()}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-700 dark:text-orange-300">Ожидают подтверждения</span>
            </div>
            <p className="text-2xl text-orange-900 dark:text-orange-100">
              {getPendingPaymentsCount()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <Tabs defaultValue="properties" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="properties">Объекты</TabsTrigger>
          <TabsTrigger value="payments">Платежи</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="properties">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Управление недвижимостью</CardTitle>
              {userRole === "landlord" && (
                <Dialog open={isPropertyDialogOpen} onOpenChange={setIsPropertyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить объект
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingProperty ? "Редактировать объект" : "Добавить объект"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handlePropertySubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                      <div>
                        <Label htmlFor="address">Адрес</Label>
                        <Input 
                          id="address" 
                          name="address" 
                          required 
                          defaultValue={editingProperty?.address}
                          placeholder="Полный адрес объекта"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ownerName">Имя владельца</Label>
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
                        <Label htmlFor="endDate">Дата окончания аренды</Label>
                        <Input 
                          id="endDate" 
                          name="endDate" 
                          type="date" 
                          defaultValue={editingProperty?.endDate}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="utilitiesIncluded" 
                          name="utilitiesIncluded" 
                          defaultChecked={editingProperty?.utilitiesIncluded}
                        />
                        <Label htmlFor="utilitiesIncluded">Коммунальные услуги включены</Label>
                      </div>
                      <div>
                        <Label htmlFor="description">Описание</Label>
                        <Textarea 
                          id="description" 
                          name="description" 
                          defaultValue={editingProperty?.description}
                          placeholder="Дополнительная информация об объекте"
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
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {properties.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Объекты аренды не найдены</p>
                    <p className="text-sm text-muted-foreground">Добавьте первый объект для начала работы</p>
                  </div>
                ) : (
                  properties.map(property => (
                    <div key={property.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4>{property.address}</h4>
                            <Badge variant={property.status === "active" ? "default" : "secondary"}>
                              {property.status === "active" ? "Активный" : "Завершен"}
                            </Badge>
                            {property.utilitiesIncluded && (
                              <Badge variant="outline">Коммуналка включена</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Владелец: {property.ownerName} • Залог: {property.deposit.toLocaleString("kk-KZ")} ₸
                          </p>
                        </div>
                        {userRole === "landlord" && (
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
                              onClick={() => deleteProperty(property.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Арендная плата</p>
                          <p className="text-lg">{property.rentAmount.toLocaleString("kk-KZ")} ₸</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Арендаторов</p>
                          <p className="text-lg">{property.tenants.length}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Арендаторы</span>
                          {userRole === "landlord" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPropertyId(property.id);
                                setIsTenantDialogOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Добавить
                            </Button>
                          )}
                        </div>
                        {property.tenants.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет арендаторов</p>
                        ) : (
                          <div className="space-y-2">
                            {property.tenants.map(tenant => (
                              <div key={tenant.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div className="flex-1">
                                  <p className="text-sm">{tenant.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {tenant.email} • {tenant.sharePercentage}% • {tenant.monthlyAmount.toLocaleString("kk-KZ")} ₸
                                  </p>
                                </div>
                                {userRole === "landlord" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteTenant(property.id, tenant.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {new Date(property.startDate).toLocaleDateString("ru-RU")} - 
                          {property.endDate ? new Date(property.endDate).toLocaleDateString("ru-RU") : "Бессрочно"}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPropertyId(property.id);
                            setIsPaymentDialogOpen(true);
                          }}
                        >
                          Добавить платеж
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Диалог добавления арендатора */}
          <Dialog open={isTenantDialogOpen} onOpenChange={setIsTenantDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить арендатора</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleTenantSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                <div>
                  <Label htmlFor="name">ФИО</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    required 
                    placeholder="Полное имя арендатора"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    required 
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    required 
                    placeholder="+7 (xxx) xxx-xx-xx"
                  />
                </div>
                <div>
                  <Label htmlFor="sharePercentage">Доля в процентах (%)</Label>
                  <Input 
                    id="sharePercentage" 
                    name="sharePercentage" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="100" 
                    required 
                    defaultValue="100"
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyAmount">Месячная сумма (₸)</Label>
                  <Input 
                    id="monthlyAmount" 
                    name="monthlyAmount" 
                    type="number" 
                    step="0.01" 
                    required 
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Добавить арендатора
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsTenantDialogOpen(false);
                      setSelectedPropertyId("");
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
              <CardTitle>Платежи по аренде</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет платежей. Добавьте объекты и регистрируйте платежи.
                  </p>
                ) : (
                  payments.map(payment => {
                    const property = properties.find(p => p.id === payment.propertyId);
                    const tenant = payment.tenantId ? property?.tenants.find(t => t.id === payment.tenantId) : null;
                    
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4>{property?.address || "Неизвестный объект"}</h4>
                            <Badge variant={
                              payment.status === "confirmed" ? "default" : 
                              payment.status === "pending" ? "secondary" : "destructive"
                            }>
                              {payment.status === "confirmed" ? "Подтвержден" : 
                               payment.status === "pending" ? "Ожидает" : "Просрочен"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.paymentDate).toLocaleDateString("ru-RU")}
                            {tenant && ` • ${tenant.name}`}
                            {payment.notes && ` • ${payment.notes}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{payment.amount.toLocaleString("kk-KZ")} ₸</span>
                          {userRole === "landlord" && payment.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => confirmPayment(payment.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Подтвердить
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

          {/* Диалог добавления платежа */}
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить платеж</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                {(() => {
                  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
                  return selectedProperty?.tenants.length ? (
                    <div>
                      <Label htmlFor="tenantId">Арендатор</Label>
                      <Select name="tenantId">
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите арендатора" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProperty.tenants.map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name} ({tenant.monthlyAmount.toLocaleString("kk-KZ")} ₸)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null;
                })()}
                <div>
                  <Label htmlFor="amount">Сумма платежа (₸)</Label>
                  <Input 
                    id="amount" 
                    name="amount" 
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
                <div>
                  <Label htmlFor="notes">Примечания</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    placeholder="Дополнительная информация о платеже"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {userRole === "landlord" ? "Подтвердить платеж" : "Отправить на подтверждение"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsPaymentDialogOpen(false);
                      setSelectedPropertyId("");
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
                <CardTitle>Доходы от аренды по месяцам</CardTitle>
              </CardHeader>
              <CardContent>
                {getMonthlyIncomeData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getMonthlyIncomeData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`} />
                      <Bar dataKey="income" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных для отображения аналитики. Добавьте объекты и платежи.
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

export default Rent;