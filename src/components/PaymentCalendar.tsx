import { useState, useEffect, useMemo } from "react";
import { Calendar } from "./ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Plus, Calendar as CalendarIcon, Bell, Trash2, Loader2, Pencil } from "lucide-react"; // Добавлен Pencil
import { apiService } from "../services/api";
import { toast } from "sonner";

// Типы данных
interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  date: Date;
  type: "credit" | "rent" | "utility" | "other";
  description?: string;
  recurring: boolean;
  sourceId?: string; // ID кредита или аренды для связи
}

export default function PaymentCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Новое состояние для редактирования
  const [editingId, setEditingId] = useState<string | null>(null);

  // Сырые данные с бэкенда
  const [credits, setCredits] = useState<any[]>([]);
  const [rents, setRents] = useState<any[]>([]);
  const [manualReminders, setManualReminders] = useState<any[]>([]);

  // Форма добавления/редактирования
  const [formData, setFormData] = useState({
    title: "",
    amount: 0,
    type: "other" as PaymentReminder["type"],
    description: "",
    recurring: false
  });

  const typeLabels = {
    credit: "Кредит",
    rent: "Аренда",
    utility: "Коммунальные",
    other: "Прочее"
  };

  const typeColors = {
    credit: "bg-red-100 text-red-800 border-red-200",
    rent: "bg-blue-100 text-blue-800 border-blue-200",
    utility: "bg-green-100 text-green-800 border-green-200",
    other: "bg-gray-100 text-gray-800 border-gray-200"
  };

  // 1. Загрузка данных
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [creditsData, rentsData, remindersData] = await Promise.all([
        apiService.getCredits({ status: 'active' }),
        apiService.getRentProperties({ status: 'active' }),
        apiService.getReminders()
      ]);

      setCredits(creditsData.data || []);
      setRents(rentsData.data || []);
      setManualReminders(remindersData.data || []);
    } catch (error) {
      console.error("Failed to fetch calendar data", error);
      toast.error("Не удалось загрузить данные календаря");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Генерация списка напоминаний
  const generatedReminders = useMemo(() => {
    const monthIndex = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    const reminders: PaymentReminder[] = [];

    // А. Обработка КРЕДИТОВ
    credits.forEach(credit => {
      let paymentDate = new Date(year, monthIndex, credit.monthlyPaymentDate);
      if (paymentDate.getMonth() !== monthIndex) {
        paymentDate = new Date(year, monthIndex + 1, 0);
      }

      const startDate = new Date(credit.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(credit.endDate);
      endDate.setHours(23, 59, 59, 999);

      if (paymentDate >= startDate && paymentDate <= endDate) {
        reminders.push({
          id: `credit-${credit._id}`,
          title: credit.name || 'Платеж по кредиту',
          amount: credit.monthlyPayment,
          date: paymentDate,
          type: 'credit',
          description: `Банк: ${credit.bank?.name || 'Не указан'}`,
          recurring: true,
          sourceId: credit._id
        });
      }
    });

    // Б. Обработка АРЕНДЫ
    rents.forEach(rent => {
      const paymentDate = new Date(year, monthIndex, 1);
      const startDate = new Date(rent.startDate);
      startDate.setHours(0, 0, 0, 0);
      const isActive = !rent.endDate || new Date(rent.endDate) >= paymentDate;

      if (paymentDate >= startDate && isActive) {
        reminders.push({
          id: `rent-${rent._id}`,
          title: `Аренда: ${rent.address}`,
          amount: rent.rentAmount + (rent.utilitiesIncluded ? 0 : (rent.utilitiesAmount || 0)),
          date: paymentDate,
          type: 'rent',
          description: `Владелец: ${rent.ownerName}`,
          recurring: true,
          sourceId: rent._id
        });
      }
    });

    // В. Обработка РУЧНЫХ НАПОМИНАНИЙ
    manualReminders.forEach(reminder => {
      const reminderDate = new Date(reminder.date);

      if (reminder.isRecurring) {
        let targetDate = new Date(year, monthIndex, reminder.dayOfMonth || reminderDate.getDate());
        if (targetDate.getMonth() !== monthIndex) {
          targetDate = new Date(year, monthIndex + 1, 0);
        }

        reminders.push({
          id: `manual-${reminder._id}`,
          title: reminder.title,
          amount: reminder.amount,
          date: targetDate,
          type: reminder.type as any,
          description: reminder.description,
          recurring: true,
          sourceId: reminder._id
        });
      } else {
        if (reminderDate.getMonth() === monthIndex && reminderDate.getFullYear() === year) {
          reminders.push({
            id: `manual-${reminder._id}`,
            title: reminder.title,
            amount: reminder.amount,
            date: reminderDate,
            type: reminder.type as any,
            description: reminder.description,
            recurring: false,
            sourceId: reminder._id
          });
        }
      }
    });

    return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [credits, rents, manualReminders, currentMonth]);

  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    return generatedReminders.filter(r =>
      r.date.getDate() === selectedDate.getDate() &&
      r.date.getMonth() === selectedDate.getMonth()
    );
  }, [generatedReminders, selectedDate]);

  // --- ЛОГИКА ФОРМЫ ---

  const resetForm = () => {
    setFormData({
      title: "",
      amount: 0,
      type: "other",
      description: "",
      recurring: false
    });
    setEditingId(null);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditClick = (reminder: PaymentReminder) => {
    if (!reminder.sourceId) return;

    setEditingId(reminder.sourceId);
    setFormData({
      title: reminder.title,
      amount: reminder.amount,
      type: reminder.type,
      description: reminder.description || "",
      recurring: reminder.recurring
    });

    // Важно: обновляем выбранную дату, чтобы пользователь видел контекст,
    // хотя календарь может и так стоять на этой дате.
    setSelectedDate(reminder.date);
    setIsDialogOpen(true);
  };

  // 3. Сохранение (Создание или Обновление)
  const handleSaveReminder = async () => {
    if (!selectedDate) return;

    const payload = {
      title: formData.title,
      amount: formData.amount,
      date: selectedDate.toISOString(),
      type: formData.type,
      description: formData.description,
      isRecurring: formData.recurring
    };

    try {
      if (editingId) {
        // Обновление
        await apiService.updateReminder(editingId, payload);
        toast.success("Напоминание обновлено");
      } else {
        // Создание
        await apiService.createReminder(payload);
        toast.success("Напоминание добавлено");
      }

      fetchData(); // Обновляем данные
      setIsDialogOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      toast.error(editingId ? "Ошибка при обновлении" : "Ошибка при создании");
    }
  };

  // 4. Удаление напоминания
  const handleDeleteReminder = async (reminder: PaymentReminder) => {
    // Проверяем, является ли запись автоматической (НЕ начинается с manual-)
    if (!reminder.id.startsWith('manual-')) {
      toast.error("Автоматические напоминания (из модулей Кредиты/Аренда) нельзя удалить здесь.");
      return;
    }

    if (reminder.sourceId) {
      try {
        await apiService.deleteReminder(reminder.sourceId);
        toast.success("Напоминание удалено");
        fetchData();
      } catch (e) {
        toast.error("Ошибка удаления");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Календарь платежей
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="rounded-md border mx-auto"
            modifiers={{
              hasReminder: (date) => generatedReminders.some(r =>
                r.date.getDate() === date.getDate() &&
                r.date.getMonth() === date.getMonth() &&
                r.date.getFullYear() === date.getFullYear()
              )
            }}
            modifiersStyles={{
              hasReminder: { backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 'bold' }
            }}
          />

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm(); // Сбрасываем форму при закрытии
          }}>
            <Button
              className="w-full mt-4"
              disabled={!selectedDate}
              onClick={handleOpenCreateDialog}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить напоминание
            </Button>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? "Редактирование напоминания"
                    : `Новое напоминание на ${selectedDate?.toLocaleDateString("ru-RU")}`
                  }
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Например: Интернет"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Сумма (₸)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Тип платежа</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Дополнительная информация"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="recurring">Повторять каждый месяц</Label>
                </div>
                <Button onClick={handleSaveReminder} className="w-full">
                  {editingId ? "Сохранить изменения" : "Создать"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            События на {selectedDate?.toLocaleDateString("ru-RU")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedDateReminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>На выбранную дату платежей нет</p>
            </div>
          ) : (
            <div className="space-y-3 h-[400px] overflow-y-auto pr-2">
              {selectedDateReminders.map((reminder) => (
                <div key={reminder.id} className="p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                        <Badge variant="secondary" className={typeColors[reminder.type]}>
                          {typeLabels[reminder.type]}
                        </Badge>
                        {reminder.recurring && (
                          <Badge variant="outline" className="text-xs">Циклично</Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-bold text-gray-900">
                          {reminder.amount.toLocaleString("ru-RU")} ₸
                        </p>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {reminder.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Показываем кнопки, если ID начинается с 'manual-' (значит создано руками) */}
                      {reminder.id.startsWith('manual-') && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(reminder)}
                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReminder(reminder)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}