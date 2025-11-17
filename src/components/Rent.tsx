import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Building, Plus, Edit, Trash2, DollarSign, Calendar, FileText, Download, Eye, X, Loader2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useAppActions } from "../contexts/AppContext";
import { apiService } from "../services/api";
import { toast } from "sonner";

// Типы данных согласно бэкенд модели
interface UtilityType {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
}

interface UtilityItem {
  _id?: string;
  utilityTypeId?: string;
  name: string;
  amount: number;
}
interface IncomeCategory {
  _id: string;
  id?: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'income';
}

interface RentProperty {
  _id: string;
  address: string;
  ownerName: string;
  rentAmount: number;
  deposit: number;
  startDate: string;
  endDate?: string;
  status: "active" | "completed" | "cancelled";
  utilitiesIncluded: boolean;
  utilitiesType: "included" | "fixed" | "variable";
  utilities?: UtilityItem[];
  utilitiesAmount?: number;
  description?: string;
  tenants?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface RentPayment {
  _id: string;
  propertyId: string;
  amount: number;
  paymentDate: string;
  status: "paid" | "pending" | "overdue" | "cancelled";
  paymentType: "rent" | "utilities" | "deposit" | "other";
  utilityTypeId?: string;
  notes?: string;
  receiptFile?: string;
  receiptFileName?: string;
  createdAt?: string;
  updatedAt?: string;
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

interface AvailableDeposit {
  _id: string;
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
  type: string;
}

interface RentStatistics {
  totalExpenseThisMonth: number;
  activePropertiesCount: number;
  pendingPaymentsCount: number;
  upcomingPaymentAmount: number;
  monthlyData?: Array<{
    month: string;
    rent: number;
    utilities: number;
    total: number;
  }>;
}

function Rent() {
  const { addNotification } = useAppActions();
  const [properties, setProperties] = useState<RentProperty[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [statistics, setStatistics] = useState<RentStatistics | null>(null);
  const [utilityTypes, setUtilityTypes] = useState<UtilityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);

  const [isPropertyDialogOpen, setIsPropertyDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RentProperty | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("rent");
  const [selectedUtilityTypeId, setSelectedUtilityTypeId] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<{ data: string; name: string } | null>(null);
  const [utilityItems, setUtilityItems] = useState<UtilityItem[]>([{ name: "", amount: 0 }]);
  const [selectedUtilitiesType, setSelectedUtilitiesType] = useState<"included" | "fixed" | "variable">("variable");

  const [availableIncomes, setAvailableIncomes] = useState<AvailableIncome[]>([]);
  const [availableDeposits, setAvailableDeposits] = useState<AvailableDeposit[]>([]);
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>("cash");
  const [selectedSourceType, setSelectedSourceType] = useState<"cash" | "income" | "deposit">("cash");

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        loadProperties(),
        loadPayments(),
        loadStatistics(),
        loadUtilityTypes(),
        loadAvailableIncomes(),
        loadAvailableDeposits(),
        loadIncomeCategories() // ДОБАВИТЬ
      ]);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.response?.data?.message || "Ошибка загрузки данных");
      toast.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const loadIncomeCategories = async () => {
    try {
      const response = await apiService.getCategories('income');
      setIncomeCategories(response.data || []);
    } catch (error: any) {
      console.error("Error loading income categories:", error);
      setIncomeCategories([]);
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

  const loadProperties = async () => {
    try {
      const response = await apiService.getRentProperties();
      const properties = response.data || [];

      // Автоматически обновляем статус для объектов с истекшей датой окончания
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const updatedProperties = properties.map((property: RentProperty) => {
        if (property.endDate && property.status === 'active') {
          const endDate = new Date(property.endDate);
          endDate.setHours(0, 0, 0, 0);

          if (endDate < today) {
            return { ...property, status: 'completed' as const };
          }
        }
        return property;
      });

      setProperties(updatedProperties);
    } catch (error: any) {
      console.error("Error loading properties:", error);
      throw error;
    }
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

  const loadPayments = async () => {
    try {
      const response = await apiService.getRentPayments();
      setPayments(response.data || []);
    } catch (error: any) {
      console.error("Error loading payments:", error);
      throw error;
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiService.getRentStatistics();
      setStatistics(response.data || null);
    } catch (error: any) {
      console.error("Error loading statistics:", error);
    }
  };

  const loadUtilityTypes = async () => {
    try {
      const response = await apiService.getUtilityTypes();
      setUtilityTypes(response.data || []);
    } catch (error: any) {
      console.error("Error loading utility types:", error);
    }
  };

  // Обработчик загрузки файла
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимальный размер: 5MB");
      return;
    }

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

  // Обработчик создания/обновления объекта недвижимости
  const handlePropertySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const formData = new FormData(e.currentTarget);
      const utilitiesType = formData.get("utilitiesType") as "included" | "fixed" | "variable";
      const startDateStr = formData.get("startDate") as string;
      const endDateStr = formData.get("endDate") as string;

      let totalUtilitiesAmount = 0;
      let filteredUtilities: UtilityItem[] | undefined = undefined;

      if (utilitiesType === "fixed") {
        filteredUtilities = utilityItems.filter(item => item.name.trim() && item.amount > 0);
        totalUtilitiesAmount = filteredUtilities.reduce((sum, item) => sum + item.amount, 0);
      }

      // Проверка и валидация дат
      const start = new Date(startDateStr);
      if (isNaN(start.getTime())) {
        toast.error("Некорректный формат даты начала");
        return;
      }

      let status: "active" | "completed" | "cancelled" = "active";

      if (endDateStr) {
        const end = new Date(endDateStr);
        if (isNaN(end.getTime())) {
          toast.error("Некорректный формат даты окончания");
          return;
        }
        if (end <= start) {
          toast.error("Дата окончания должна быть после даты начала");
          return;
        }

        // Проверяем, если дата окончания в прошлом, устанавливаем статус "completed"
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (end < today) {
          status = "completed";
        }
      }

      // Если редактируем объект с завершенным статусом, запрещаем изменения
      if (editingProperty && editingProperty.status === "completed") {
        toast.error("Невозможно редактировать объект с завершенной арендой");
        return;
      }

      const propertyData = {
        address: formData.get("address") as string,
        ownerName: formData.get("ownerName") as string,
        rentAmount: parseFloat(formData.get("rentAmount") as string),
        deposit: parseFloat(formData.get("deposit") as string),
        startDate: formData.get("startDate") as string,
        endDate: (formData.get("endDate") as string) || undefined,
        status: status,
        utilitiesIncluded: utilitiesType === "included",
        utilitiesType: utilitiesType,
        utilities: filteredUtilities,
        utilitiesAmount: utilitiesType === "fixed" ? totalUtilitiesAmount : undefined,
        description: (formData.get("description") as string) || undefined,
        tenants: []
      };

      if (editingProperty) {
        await apiService.updateRentProperty(editingProperty._id, propertyData);
        toast.success("Объект недвижимости обновлен");
        addNotification({ message: "Объект недвижимости обновлен", type: "success" });
      } else {
        await apiService.createRentProperty(propertyData);
        toast.success("Объект недвижимости добавлен");
        addNotification({ message: "Объект недвижимости добавлен", type: "success" });
      }

      setIsPropertyDialogOpen(false);
      setEditingProperty(null);
      resetPropertyForm();
      await loadProperties();
      await loadStatistics();

    } catch (err: any) {
      console.error("Error saving property:", err);
      const errorMessage = err.response?.data?.message || "Ошибка сохранения объекта недвижимости";
      toast.error(errorMessage);

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error: string) => {
          toast.error(error);
        });
      }
    } finally {
      setSubmitting(false);
    }
  };
  // Обработчик создания платежа
  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const formData = new FormData(e.currentTarget);
      const sourceId = formData.get("sourceId") as string;
      const amount = parseFloat(formData.get("amount") as string);

      // Извлекаем реальный ID депозита, убирая префикс "deposit-"
      let actualSourceId = sourceId;
      if (selectedSourceType === "deposit" && sourceId.startsWith("deposit-")) {
        actualSourceId = sourceId.replace("deposit-", "");
      }

      const paymentData: any = {
        propertyId: selectedPropertyId,
        amount: amount,
        paymentDate: formData.get("paymentDate") as string,
        status: "paid" as const,
        paymentType: selectedPaymentType as "rent" | "utilities" | "deposit" | "other",
        notes: (formData.get("notes") as string) || undefined,
        receiptFile: receiptFile?.data,
        receiptFileName: receiptFile?.name
      };

      // Добавляем incomeId или depositId в зависимости от типа источника
      if (selectedSourceType === "income" && actualSourceId && actualSourceId !== "cash") {
        paymentData.incomeId = actualSourceId;
      } else if (selectedSourceType === "deposit" && actualSourceId) {
        paymentData.depositId = actualSourceId;

        // Создаем транзакцию снятия с депозита
        const transactionDescription = `Оплата аренды: ${selectedPaymentType === "rent" ? "Аренда" :
          selectedPaymentType === "utilities" ? "Коммунальные платежи" :
            selectedPaymentType === "deposit" ? "Залог" : "Другое"
          }`;

        try {
          await apiService.createDepositTransaction({
            depositId: actualSourceId,
            type: "withdrawal",
            amount: amount,
            transactionDate: formData.get("paymentDate") as string,
            description: transactionDescription
          });
        } catch (depositError: any) {
          console.error("Error creating deposit transaction:", depositError);
          throw new Error(depositError.response?.data?.message || "Ошибка при снятии средств с депозита");
        }
      }

      // Если это коммунальный платеж, добавляем utilityTypeId
      if (selectedPaymentType === "utilities" && selectedUtilityTypeId) {
        paymentData.utilityTypeId = selectedUtilityTypeId;
      }

      await apiService.createRentPayment(paymentData);

      toast.success("Платеж добавлен успешно");
      addNotification({ message: "Платеж добавлен успешно", type: "success" });

      setIsPaymentDialogOpen(false);
      resetPaymentForm();
      await loadPayments();
      await loadStatistics();
      await loadAvailableIncomes();
      await loadAvailableDeposits();

    } catch (err: any) {
      console.error("Error saving payment:", err);
      const errorMessage = err.response?.data?.message || "Ошибка добавления платежа";
      toast.error(errorMessage);

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error: string) => {
          toast.error(error);
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Удаление объекта недвижимости
  const deleteProperty = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот объект? Все связанные платежи также будут удалены.")) {
      return;
    }

    try {
      await apiService.deleteRentProperty(id);
      toast.success("Объект недвижимости удален");
      addNotification({ message: "Объект недвижимости удален", type: "info" });
      await loadProperties();
      await loadPayments();
      await loadStatistics();
    } catch (err: any) {
      console.error("Error deleting property:", err);
      toast.error(err.response?.data?.message || "Ошибка удаления объекта");
    }
  };

  // Удаление платежа
  const deletePayment = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот платеж?")) {
      return;
    }

    try {
      await apiService.deleteRentPayment(id);
      toast.success("Платеж удален");
      addNotification({ message: "Платеж удален", type: "info" });
      await loadPayments();
      await loadStatistics();
    } catch (err: any) {
      console.error("Error deleting payment:", err);
      toast.error(err.response?.data?.message || "Ошибка удаления платежа");
    }
  };

  // Сброс формы объекта недвижимости
  const resetPropertyForm = () => {
    setUtilityItems([{ name: "", amount: 0 }]);
    setSelectedUtilitiesType("variable");
    setEditingProperty(null);
  };

  // Сброс формы платежа
  const resetPaymentForm = () => {
    setSelectedPropertyId("");
    setSelectedPaymentType("rent");
    setSelectedUtilityTypeId("");
    setSelectedIncomeId("cash");
    setSelectedSourceType("cash");
    setReceiptFile(null);
  };

  const getItemId = (item: any): string => {
    return item._id || item.id || '';
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

  // Функции для работы с коммунальными услугами
  const addUtilityItem = () => {
    setUtilityItems([...utilityItems, { name: "", amount: 0 }]);
  };

  const removeUtilityItem = (index: number) => {
    if (utilityItems.length > 1) {
      setUtilityItems(utilityItems.filter((_, i) => i !== index));
    }
  };

  const updateUtilityItem = (index: number, field: 'utilityTypeId' | 'name' | 'amount', value: string | number) => {
    const updated = [...utilityItems];

    if (field === 'utilityTypeId') {
      const utilityType = utilityTypes.find(ut => ut._id === value);
      if (utilityType) {
        updated[index].utilityTypeId = value as string;
        updated[index].name = utilityType.name;
      }
    } else if (field === 'name') {
      updated[index].name = value as string;
    } else {
      updated[index].amount = typeof value === 'number' ? value : parseFloat(value as string) || 0;
    }

    setUtilityItems(updated);
  };

  // Обработчик изменения типа платежа
  const handlePaymentTypeChange = (value: string) => {
    setSelectedPaymentType(value);
    setSelectedUtilityTypeId("");

    if (selectedPropertyId) {
      const property = properties.find(p => p._id === selectedPropertyId);
      if (property) {
        const amountInput = document.getElementById("amount") as HTMLInputElement;
        if (amountInput) {
          if (value === "rent") {
            amountInput.value = property.rentAmount.toString();
          } else if (value === "deposit") {
            amountInput.value = property.deposit.toString();
          }
        }
      }
    }
  };

  // Обработчик изменения коммунальной услуги
  const handleUtilityTypeChange = (utilityTypeId: string) => {
    setSelectedUtilityTypeId(utilityTypeId);

    if (selectedPropertyId) {
      const property = properties.find(p => p._id === selectedPropertyId);
      if (property && property.utilities) {
        const utility = property.utilities.find(u => u.utilityTypeId === utilityTypeId);
        if (utility) {
          const amountInput = document.getElementById("amount") as HTMLInputElement;
          if (amountInput) {
            amountInput.value = utility.amount.toString();
          }
        }
      }
    }
  };

  useEffect(() => {
    if (editingProperty && isPropertyDialogOpen) {
      if (editingProperty.utilities && editingProperty.utilities.length > 0) {
        setUtilityItems(editingProperty.utilities.map(u => ({
          utilityTypeId: u.utilityTypeId,
          name: u.name,
          amount: u.amount
        })));
      } else {
        setUtilityItems([{ name: "", amount: 0 }]);
      }
      setSelectedUtilitiesType(editingProperty.utilitiesType || "variable");
    } else if (!isPropertyDialogOpen) {
      resetPropertyForm();
    }
  }, [editingProperty, isPropertyDialogOpen]);

  const getMonthlyExpenseData = () => {
    const monthlyData: Record<string, { month: string; rent: number; utilities: number; total: number }> = {};

    payments
      .filter(p => p.status === "paid")
      .forEach(payment => {
        const date = new Date(payment.paymentDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthName, rent: 0, utilities: 0, total: 0 };
        }

        if (payment.paymentType === "utilities") {
          monthlyData[monthKey].utilities += payment.amount;
        } else {
          monthlyData[monthKey].rent += payment.amount;
        }
        monthlyData[monthKey].total += payment.amount;
      });

    properties.forEach(property => {
      if (property.utilitiesType === "fixed" && property.utilitiesAmount) {
        const startDate = new Date(property.startDate);
        const now = new Date();

        const calculationEndDate = property.endDate
          ? new Date(Math.min(new Date(property.endDate).getTime(), now.getTime()))
          : now;

        let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const lastDate = new Date(calculationEndDate.getFullYear(), calculationEndDate.getMonth(), 1);

        while (currentDate <= lastDate) {
          const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = currentDate.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthName, rent: 0, utilities: 0, total: 0 };
          }
          monthlyData[monthKey].utilities += property.utilitiesAmount;
          monthlyData[monthKey].total += property.utilitiesAmount;

          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
    });

    return Object.values(monthlyData).sort((a, b) => {
      const [aMonth, aYear] = a.month.split(" ");
      const [bMonth, bYear] = b.month.split(" ");
      return new Date(`${aYear}-${aMonth}-01`).getTime() - new Date(`${bYear}-${bMonth}-01`).getTime();
    });
  };

  const getUtilityTypeName = (utilityTypeId?: string) => {
    if (!utilityTypeId) return null;
    const utilityType = utilityTypes.find(ut => ut._id === utilityTypeId);
    return utilityType?.name;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error && properties.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadData} variant="outline">
          Повторить попытку
        </Button>
      </div>
    );
  }

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
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {(statistics?.totalExpenseThisMonth || 0).toLocaleString("ru-RU")} ₸
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-700 dark:text-purple-300">Активных объектов</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {statistics?.activePropertiesCount || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-orange-700 dark:text-orange-300">Ожидающих оплаты</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {statistics?.pendingPaymentsCount || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">Предстоящий платеж</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {(statistics?.upcomingPaymentAmount || 0).toLocaleString("ru-RU")} ₸
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
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProperty ? "Редактировать объект" : "Добавить объект аренды"}
                    </DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handlePropertySubmit} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address">Адрес объекта *</Label>
                        <Input
                          id="address"
                          name="address"
                          required
                          defaultValue={editingProperty?.address}
                          placeholder="г. Алматы, ул. Абая 123, кв. 45"
                        />
                      </div>

                      <div>
                        <Label htmlFor="ownerName">Имя владельца/арендодателя *</Label>
                        <Input
                          id="ownerName"
                          name="ownerName"
                          required
                          defaultValue={editingProperty?.ownerName}
                          placeholder="ФИО владельца"
                        />
                      </div>

                      <div>
                        <Label htmlFor="rentAmount">Арендная плата (₸) *</Label>
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
                        <Label htmlFor="deposit">Залог (₸) *</Label>
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
                        <Label htmlFor="startDate">Дата начала аренды *</Label>
                        <Input
                          id="startDate"
                          name="startDate"
                          type="date"
                          className="date-input"
                          required
                          defaultValue={editingProperty?.startDate?.split('T')[0]}
                        />
                      </div>

                      <div>
                        <Label htmlFor="endDate">Дата окончания аренды</Label>
                        <Input
                          id="endDate"
                          name="endDate"
                          className="date-input"
                          type="date"
                          defaultValue={editingProperty?.endDate?.split('T')[0]}
                        />
                      </div>

                      <div>
                        <Label htmlFor="utilitiesType">Коммунальные платежи *</Label>
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
                            <div key={index} className="flex gap-2 items-start">
                              <div className="flex-1">
                                <Select
                                  value={item.utilityTypeId || ""}
                                  onValueChange={(value) => updateUtilityItem(index, 'utilityTypeId', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите услугу" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {utilityTypes.map((ut) => (
                                      <SelectItem key={ut._id} value={ut._id}>
                                        {ut.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-32">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Сумма"
                                  value={item.amount || ''}
                                  onChange={(e) => updateUtilityItem(index, 'amount', e.target.value)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUtilityItem(index)}
                                disabled={utilityItems.length === 1}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}

                          {utilityItems.length > 0 && (
                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                              <span className="text-sm font-medium">Итого коммунальные платежи:</span>
                              <span className="font-bold">
                                {utilityItems.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString("ru-RU")} ₸
                              </span>
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
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          editingProperty ? "Обновить" : "Добавить"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsPropertyDialogOpen(false);
                          setEditingProperty(null);
                        }}
                        disabled={submitting}
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
                    <h3 className="text-lg font-semibold mb-2">Нет объектов аренды</h3>
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
                    <div key={property._id} className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{property.address}</h3>
                            <Badge variant={property.status === "active" ? "default" : "secondary"}>
                              {property.status === "active" ? "Активный" : property.status === "completed" ? "Завершен" : "Отменен"}
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
                            disabled={property.status === "completed"}
                            onClick={() => {
                              if (property.status === "completed") {
                                toast.error("Невозможно редактировать объект с завершенной арендой");
                                return;
                              }
                              setEditingProperty(property);
                              setSelectedUtilitiesType(property.utilitiesType || "variable");
                              if (property.utilitiesType === "fixed" && property.utilities && property.utilities.length > 0) {
                                const updatedUtilities = property.utilities.map(u => {
                                  if (u.utilityTypeId) {
                                    return u;
                                  } else {
                                    const matchingType = utilityTypes.find(ut => ut.name.toLowerCase() === u.name.toLowerCase());
                                    return {
                                      ...u,
                                      utilityTypeId: matchingType ? matchingType._id : undefined
                                    };
                                  }
                                });
                                setUtilityItems(updatedUtilities);
                              } else {
                                setUtilityItems([{ name: "", amount: 0 }]);
                              }
                              setIsPropertyDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProperty(property._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Арендная плата</p>
                          <p className="text-xl font-semibold">{property.rentAmount.toLocaleString("ru-RU")} ₸</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Залог</p>
                          <p className="text-xl font-semibold">{property.deposit.toLocaleString("ru-RU")} ₸</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Коммунальные платежи</p>
                          <p className="text-xl font-semibold">
                            {property.utilitiesType === "included" ? "Включены" :
                              property.utilitiesType === "fixed" ? `${property.utilitiesAmount?.toLocaleString("ru-RU")} ₸` :
                                "По счетчикам"}
                          </p>
                        </div>
                      </div>

                      {property.utilitiesType === "fixed" && property.utilities && property.utilities.length > 0 && (
                        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Детализация коммунальных услуг:</p>
                          <div className="space-y-1">
                            {property.utilities.map((utility) => (
                              <div key={utility._id} className="flex justify-between text-sm">
                                <span>{utility.name}</span>
                                <span className="font-medium">{utility.amount.toLocaleString("ru-RU")} ₸</span>
                              </div>
                            ))}
                            <Separator className="my-2" />
                            <div className="flex justify-between font-semibold">
                              <span>Итого с коммуналкой:</span>
                              <span className="text-lg">
                                {(property.rentAmount + (property.utilitiesAmount || 0)).toLocaleString("ru-RU")} ₸
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
                          disabled={property.status === "completed"}
                          onClick={() => {
                            if (property.status === "completed") {
                              toast.error("Невозможно добавить платеж для объекта с завершенной арендой");
                              return;
                            }
                            setSelectedPropertyId(property._id);
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
              resetPaymentForm();
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить платеж</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="paymentType">Тип платежа *</Label>
                  <Select
                    name="paymentType"
                    value={selectedPaymentType}
                    onValueChange={handlePaymentTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Аренда</SelectItem>
                      <SelectItem value="utilities">Коммунальные платежи</SelectItem>
                      <SelectItem value="deposit">Залог</SelectItem>
                      <SelectItem value="other">Другое</SelectItem>
                    </SelectContent>
                  </Select>
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

                            return (
                              <SelectItem key={getItemId(income)} value={getItemId(income)}>
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

                {selectedPaymentType === "utilities" && (
                  <div>
                    <Label htmlFor="utilityType">Коммунальная услуга *</Label>
                    <Select
                      value={selectedUtilityTypeId}
                      onValueChange={handleUtilityTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите услугу" />
                      </SelectTrigger>
                      <SelectContent>
                        {utilityTypes.map((ut) => (
                          <SelectItem key={ut._id} value={ut._id}>
                            {ut.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="amount">Сумма платежа (₸) *</Label>
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
                  <Label htmlFor="paymentDate">Дата платежа *</Label>
                  <Input
                    id="paymentDate"
                    name="paymentDate"
                    type="date"
                    className="date-input"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="receipt">Квитанция об оплате</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={handleFileUpload}
                      className="flex-1"
                      key={receiptFile ? "has-file" : "no-file"}
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
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? (
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
                      resetPaymentForm();
                    }}
                    disabled={submitting}
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
                    <h3 className="text-lg font-semibold mb-2">Нет платежей</h3>
                    <p className="text-sm text-muted-foreground">
                      Добавьте объект аренды и начните регистрировать платежи
                    </p>
                  </div>
                ) : (
                  [...payments]
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map(payment => {
                      const property = properties.find(p => p._id === payment.propertyId);
                      const utilityTypeName = getUtilityTypeName(payment.utilityTypeId);

                      return (
                        <div key={payment._id} className="flex items-start justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h4 className="font-semibold">{property?.address || "Объект удален"}</h4>
                              <Badge variant={
                                payment.paymentType === "rent" ? "default" :
                                  payment.paymentType === "utilities" ? "secondary" :
                                    "outline"
                              }>
                                {payment.paymentType === "rent" ? "Аренда" :
                                  payment.paymentType === "utilities" ? "Коммуналка" :
                                    payment.paymentType === "deposit" ? "Залог" : "Другое"}
                              </Badge>
                              {utilityTypeName && (
                                <Badge variant="outline">
                                  {utilityTypeName}
                                </Badge>
                              )}
                              <Badge variant={
                                payment.status === "paid" ? "default" :
                                  payment.status === "pending" ? "secondary" :
                                    payment.status === "overdue" ? "destructive" : "outline"
                              }>
                                {payment.status === "paid" ? "Оплачено" :
                                  payment.status === "pending" ? "Ожидает" :
                                    payment.status === "overdue" ? "Просрочено" : "Отменено"}
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
                              <p className="text-sm text-muted-foreground mb-2">
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
                          <div className="flex items-center gap-4 ml-4">
                            <span className="text-xl font-bold whitespace-nowrap">
                              {payment.amount.toLocaleString("ru-RU")} ₸
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePayment(payment._id)}
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
                    <h4 className="text-lg font-semibold mb-4">Расходы по месяцам</h4>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={getMonthlyExpenseData()}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="month"
                          className="text-xs"
                        />
                        <YAxis
                          className="text-xs"
                        />
                        <Tooltip
                          formatter={(value: number) => `${value.toLocaleString("ru-RU")} ₸`}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid var(--border))',
                            backgroundColor: 'var(--background)'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="rent" fill="var(--chart-1)" name="Аренда" stackId="a" />
                        <Bar dataKey="utilities" fill="var(--chart-2)" name="Коммуналка" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-lg font-semibold mb-4">Детальная статистика</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getMonthlyExpenseData().map((data, index) => (
                        <div key={index} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                          <p className="text-sm font-medium text-muted-foreground mb-3">{data.month}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Аренда:</span>
                              <span className="text-sm font-medium">{data.rent.toLocaleString("ru-RU")} ₸</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Коммуналка:</span>
                              <span className="text-sm font-medium">{data.utilities.toLocaleString("ru-RU")} ₸</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Итого:</span>
                              <span className="font-bold text-lg">{data.total.toLocaleString("ru-RU")} ₸</span>
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