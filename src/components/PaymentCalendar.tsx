import { useState } from "react";
import { Calendar } from "./ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Plus, Calendar as CalendarIcon, CreditCard, Bell, Trash2 } from "lucide-react";

interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  date: Date;
  type: "credit" | "rent" | "utility" | "other";
  description?: string;
  recurring: boolean;
}

const initialReminders: PaymentReminder[] = [
  {
    id: "1",
    title: "Платёж по кредиту",
    amount: 15000,
    date: new Date(2025, 0, 15),
    type: "credit",
    description: "Ежемесячный платёж по ипотеке",
    recurring: true
  },
  {
    id: "2",
    title: "Аренда квартиры",
    amount: 25000,
    date: new Date(2025, 0, 1),
    type: "rent",
    description: "Оплата аренды за январь",
    recurring: true
  },
  {
    id: "3",
    title: "Коммунальные услуги",
    amount: 8000,
    date: new Date(2025, 0, 20),
    type: "utility",
    description: "Электричество, газ, вода",
    recurring: true
  }
];

function PaymentCalendar() {
  const [reminders, setReminders] = useState<PaymentReminder[]>(initialReminders);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    credit: "bg-red-100 text-red-800",
    rent: "bg-blue-100 text-blue-800",
    utility: "bg-green-100 text-green-800",
    other: "bg-gray-100 text-gray-800"
  };

  const getRemindersForDate = (date: Date) => {
    return reminders.filter(reminder => 
      reminder.date.getDate() === date.getDate() &&
      reminder.date.getMonth() === date.getMonth() &&
      reminder.date.getFullYear() === date.getFullYear()
    );
  };

  const handleAddReminder = () => {
    if (!selectedDate) return;
    
    const newReminder: PaymentReminder = {
      id: Date.now().toString(),
      title: formData.title,
      amount: formData.amount,
      date: selectedDate,
      type: formData.type,
      description: formData.description,
      recurring: formData.recurring
    };
    
    setReminders([...reminders, newReminder]);
    setFormData({ title: "", amount: 0, type: "other", description: "", recurring: false });
    setIsDialogOpen(false);
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const selectedDateReminders = selectedDate ? getRemindersForDate(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Календарь платежей
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              hasReminder: (date) => getRemindersForDate(date).length > 0
            }}
            modifiersStyles={{
              hasReminder: { backgroundColor: '#dbeafe', color: '#1e40af' }
            }}
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mt-4" disabled={!selectedDate}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить напоминание
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Новое напоминание о платеже</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Название платежа"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Сумма (₽)</Label>
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
                  <Select value={formData.type} onValueChange={(value: PaymentReminder["type"]) => setFormData({ ...formData, type: value })}>
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
                    className="rounded"
                  />
                  <Label htmlFor="recurring">Повторяющийся платёж</Label>
                </div>
                <Button onClick={handleAddReminder} className="w-full">
                  Добавить напоминание
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Напоминания на {selectedDate?.toLocaleDateString("ru-RU")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateReminders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              На выбранную дату нет напоминаний
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDateReminders.map((reminder) => (
                <div key={reminder.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{reminder.title}</h4>
                        <Badge className={typeColors[reminder.type]}>
                          {typeLabels[reminder.type]}
                        </Badge>
                        {reminder.recurring && (
                          <Badge variant="outline">Повторяется</Badge>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-green-600 mb-1">
                        {reminder.amount.toLocaleString("ru-RU")} ₽
                      </p>
                      {reminder.description && (
                        <p className="text-sm text-muted-foreground">
                          {reminder.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default PaymentCalendar;