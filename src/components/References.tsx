import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BudgetEditor } from "./BudgetEditor";
import { DollarSign, TrendingUp, TrendingDown, Zap, Wallet, Building2, Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAppActions } from "../contexts/AppContext";

interface Bank {
  id: string;
  name: string;
  description?: string;
}

function References() {
  const { addNotification } = useAppActions();
  const [banks, setBanks] = useLocalStorage<Bank[]>("banks", []);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const handleBankSubmit = (formData: FormData) => {
    const bankData: Bank = {
      id: editingBank?.id || Date.now().toString(),
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined
    };

    if (editingBank) {
      setBanks(prev => prev.map(bank => bank.id === editingBank.id ? bankData : bank));
      addNotification({ message: "Банк обновлен", type: "success" });
    } else {
      setBanks(prev => [...prev, bankData]);
      addNotification({ message: "Банк добавлен", type: "success" });
    }

    setIsBankDialogOpen(false);
    setEditingBank(null);
  };

  const deleteBank = (id: string) => {
    setBanks(prev => prev.filter(bank => bank.id !== id));
    addNotification({ message: "Банк удален", type: "info" });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="budget">Бюджет</TabsTrigger>
          <TabsTrigger value="banks">Банки</TabsTrigger>
          <TabsTrigger value="currency">Валюта</TabsTrigger>
          <TabsTrigger value="income">Доходы</TabsTrigger>
          <TabsTrigger value="expenses">Расходы</TabsTrigger>
          <TabsTrigger value="utilities">Коммунальные</TabsTrigger>
        </TabsList>

        <TabsContent value="budget">
          <BudgetEditor />
        </TabsContent>

        <TabsContent value="banks">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Справочник банков
              </CardTitle>
              <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingBank(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить банк
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingBank ? "Редактировать банк" : "Добавить банк"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleBankSubmit(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название банка</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        required 
                        defaultValue={editingBank?.name}
                        placeholder="Например: Kaspi Bank"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание (опционально)</Label>
                      <Input 
                        id="description" 
                        name="description" 
                        defaultValue={editingBank?.description}
                        placeholder="Дополнительная информация"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingBank ? "Обновить" : "Добавить"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsBankDialogOpen(false);
                          setEditingBank(null);
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
              {banks.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Нет банков в справочнике</p>
                  <p className="text-sm text-muted-foreground mt-2">Добавьте банки для использования в кредитах</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {banks.map(bank => (
                    <div key={bank.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <h4>{bank.name}</h4>
                        {bank.description && (
                          <p className="text-sm text-muted-foreground">{bank.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBank(bank);
                            setIsBankDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Вы уверены, что хотите удалить этот банк?")) {
                              deleteBank(bank.id);
                            }
                          }}
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
        </TabsContent>

        <TabsContent value="currency">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Настройки валюты
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Валюта по умолчанию: Казахстанский тенге (₸)</p>
                <p className="text-sm text-muted-foreground mt-2">Все расчеты ведутся в тенге</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Категории доходов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Управление категориями доходов</p>
                <p className="text-sm text-muted-foreground mt-2">Функционал в разработке</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Категории расходов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Управление категориями расходов</p>
                <p className="text-sm text-muted-foreground mt-2">Функционал в разработке</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilities">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Типы коммунальных услуг
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Управление типами коммунальных услуг</p>
                <p className="text-sm text-muted-foreground mt-2">Функционал в разработке</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default References;