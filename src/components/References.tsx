import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BudgetEditor } from "./BudgetEditor";
import { DollarSign, TrendingUp, TrendingDown, Zap, Building2, Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAppActions } from "../contexts/AppContext";
import { apiService } from "../services/api";

interface Bank {
  _id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface Currency {
  _id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault?: boolean;
  exchangeRate?: number;
}

interface UtilityType {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isDefault?: boolean;
}

function References() {
  const { addNotification } = useAppActions();
  const [activeTab, setActiveTab] = useState("budget");
  
  // Banks state
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Currencies state
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Utility Types state
  const [utilityTypes, setUtilityTypes] = useState<UtilityType[]>([]);
  const [isUtilityDialogOpen, setIsUtilityDialogOpen] = useState(false);
  const [editingUtility, setEditingUtility] = useState<UtilityType | null>(null);
  const [loadingUtilities, setLoadingUtilities] = useState(false);

  // Load Banks
  const loadBanks = async () => {
    try {
      setLoadingBanks(true);
      const response = await apiService.getBanks();
      if (response.success) {
        setBanks(response.data);
      }
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка загрузки банков", 
        type: "error" 
      });
    } finally {
      setLoadingBanks(false);
    }
  };

  // Load Currencies
  const loadCurrencies = async () => {
    try {
      setLoadingCurrencies(true);
      const response = await apiService.getCurrencies();
      if (response.success) {
        setCurrencies(response.data);
      }
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка загрузки валют", 
        type: "error" 
      });
    } finally {
      setLoadingCurrencies(false);
    }
  };

  // Load Utility Types
  const loadUtilityTypes = async () => {
    try {
      setLoadingUtilities(true);
      const response = await apiService.getUtilityTypes();
      if (response.success) {
        setUtilityTypes(response.data);
      }
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка загрузки типов услуг", 
        type: "error" 
      });
    } finally {
      setLoadingUtilities(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === "banks") {
      loadBanks();
    } else if (activeTab === "currency") {
      loadCurrencies();
    } else if (activeTab === "utilities") {
      loadUtilityTypes();
    }
  }, [activeTab]);

  // Bank handlers
  const handleBankSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const bankData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined
    };

    try {
      if (editingBank) {
        const response = await apiService.updateBank(editingBank._id, bankData);
        if (response.success) {
          addNotification({ message: "Банк обновлен", type: "success" });
          loadBanks();
        }
      } else {
        const response = await apiService.createBank(bankData);
        if (response.success) {
          addNotification({ message: "Банк добавлен", type: "success" });
          loadBanks();
        }
      }
      setIsBankDialogOpen(false);
      setEditingBank(null);
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка сохранения банка", 
        type: "error" 
      });
    }
  };

  const deleteBank = async (id: string) => {
    try {
      const response = await apiService.deleteBank(id);
      if (response.success) {
        addNotification({ message: "Банк удален", type: "info" });
        loadBanks();
      }
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка удаления банка", 
        type: "error" 
      });
    }
  };

  // Currency handlers
  const handleCurrencySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const currencyData = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      symbol: formData.get("symbol") as string,
      exchangeRate: parseFloat(formData.get("exchangeRate") as string) || 1,
      isDefault: formData.get("isDefault") === "on"
    };

    try {
      if (editingCurrency) {
        const response = await apiService.updateCurrency(editingCurrency._id, currencyData);
        if (response.success) {
          addNotification({ message: "Валюта обновлена", type: "success" });
          loadCurrencies();
        }
      } else {
        const response = await apiService.createCurrency(currencyData);
        if (response.success) {
          addNotification({ message: "Валюта добавлена", type: "success" });
          loadCurrencies();
        }
      }
      setIsCurrencyDialogOpen(false);
      setEditingCurrency(null);
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка сохранения валюты", 
        type: "error" 
      });
    }
  };

  const deleteCurrency = async (id: string) => {
    try {
      const response = await apiService.deleteCurrency(id);
      if (response.success) {
        addNotification({ message: "Валюта удалена", type: "info" });
        loadCurrencies();
      }
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка удаления валюты", 
        type: "error" 
      });
    }
  };

  const setDefaultCurrency = async (id: string) => {
    try {
      const response = await apiService.setDefaultCurrency(id);
      if (response.success) {
        addNotification({ message: "Валюта установлена по умолчанию", type: "success" });
        loadCurrencies();
      }
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка установки валюты", 
        type: "error" 
      });
    }
  };

  // Utility Type handlers
  const handleUtilitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const utilityData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      icon: formData.get("icon") as string || "zap",
      color: formData.get("color") as string || "#10b981",
      order: parseInt(formData.get("order") as string) || 0
    };

    try {
      if (editingUtility) {
        const response = await apiService.updateUtilityType(editingUtility._id, utilityData);
        if (response.success) {
          addNotification({ message: "Тип услуги обновлен", type: "success" });
          loadUtilityTypes();
        }
      } else {
        const response = await apiService.createUtilityType(utilityData);
        if (response.success) {
          addNotification({ message: "Тип услуги добавлен", type: "success" });
          loadUtilityTypes();
        }
      }
      setIsUtilityDialogOpen(false);
      setEditingUtility(null);
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка сохранения типа услуги", 
        type: "error" 
      });
    }
  };

  const deleteUtilityType = async (id: string) => {
    try {
      const response = await apiService.deleteUtilityType(id);
      if (response.success) {
        addNotification({ message: "Тип услуги удален", type: "info" });
        loadUtilityTypes();
      }
    } catch (error: any) {
      addNotification({ 
        message: error.response?.data?.message || "Ошибка удаления типа услуги", 
        type: "error" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-2">
          <TabsTrigger value="budget">Бюджет</TabsTrigger>
          <TabsTrigger value="banks">Банки</TabsTrigger>
          <TabsTrigger value="currency">Валюта</TabsTrigger>
          <TabsTrigger value="income">Доходы</TabsTrigger>
          <TabsTrigger value="expenses">Расходы</TabsTrigger>
          <TabsTrigger value="utilities">Коммунальные</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="mt-6">
          <BudgetEditor />
        </TabsContent>

        {/* БАНКИ */}
        <TabsContent value="banks" className="mt-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
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
                  <form onSubmit={handleBankSubmit} className="space-y-4">
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
              {loadingBanks ? (
                <div className="text-center py-8">Загрузка...</div>
              ) : banks.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Нет банков в справочнике</p>
                  <p className="text-sm text-muted-foreground mt-2">Добавьте банки для использования в кредитах</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {banks.map(bank => (
                    <div key={bank._id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-medium">{bank.name}</h4>
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
                          disabled={bank.isDefault}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Вы уверены, что хотите удалить этот банк?")) {
                              deleteBank(bank._id);
                            }
                          }}
                          disabled={bank.isDefault}
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

        {/* ВАЛЮТЫ */}
        <TabsContent value="currency" className="mt-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Настройки валюты
              </CardTitle>
              <Dialog open={isCurrencyDialogOpen} onOpenChange={setIsCurrencyDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingCurrency(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить валюту
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingCurrency ? "Редактировать валюту" : "Добавить валюту"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCurrencySubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="code">Код валюты</Label>
                      <Input 
                        id="code" 
                        name="code" 
                        required 
                        defaultValue={editingCurrency?.code}
                        placeholder="KZT, USD, EUR"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Название</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        required 
                        defaultValue={editingCurrency?.name}
                        placeholder="Казахстанский тенге"
                      />
                    </div>
                    <div>
                      <Label htmlFor="symbol">Символ</Label>
                      <Input 
                        id="symbol" 
                        name="symbol" 
                        required 
                        defaultValue={editingCurrency?.symbol}
                        placeholder="₸, $, €"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <Label htmlFor="exchangeRate">Курс обмена</Label>
                      <Input 
                        id="exchangeRate" 
                        name="exchangeRate" 
                        type="number"
                        step="0.01"
                        defaultValue={editingCurrency?.exchangeRate || 1}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isDefault" 
                        name="isDefault"
                        defaultChecked={editingCurrency?.isDefault}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isDefault">По умолчанию</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingCurrency ? "Обновить" : "Добавить"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsCurrencyDialogOpen(false);
                          setEditingCurrency(null);
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
              {loadingCurrencies ? (
                <div className="text-center py-8">Загрузка...</div>
              ) : currencies.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Нет валют в справочнике</p>
                  <p className="text-sm text-muted-foreground mt-2">Добавьте валюты для работы с приложением</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currencies.map(currency => (
                    <div key={currency._id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <h4 className="flex items-center gap-2 font-medium">
                          {currency.name} ({currency.code})
                          {currency.isDefault && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">По умолчанию</span>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Символ: {currency.symbol} | Курс: {currency.exchangeRate}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!currency.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDefaultCurrency(currency._id)}
                          >
                            По умолчанию
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCurrency(currency);
                            setIsCurrencyDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Вы уверены, что хотите удалить эту валюту?")) {
                              deleteCurrency(currency._id);
                            }
                          }}
                          disabled={currency.isDefault}
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

        <TabsContent value="income" className="mt-6">
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

        <TabsContent value="expenses" className="mt-6">
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

        {/* ТИПЫ КОММУНАЛЬНЫХ УСЛУГ */}
        <TabsContent value="utilities" className="mt-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Типы коммунальных услуг
              </CardTitle>
              <Dialog open={isUtilityDialogOpen} onOpenChange={setIsUtilityDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingUtility(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить тип услуги
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingUtility ? "Редактировать тип услуги" : "Добавить тип услуги"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUtilitySubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="utility-name">Название</Label>
                      <Input 
                        id="utility-name" 
                        name="name" 
                        required 
                        defaultValue={editingUtility?.name}
                        placeholder="Например: Электричество"
                      />
                    </div>
                    <div>
                      <Label htmlFor="utility-description">Описание (опционально)</Label>
                      <Input 
                        id="utility-description" 
                        name="description" 
                        defaultValue={editingUtility?.description}
                        placeholder="Дополнительная информация"
                      />
                    </div>
                    <div>
                      <Label htmlFor="utility-icon">Иконка</Label>
                      <Input 
                        id="utility-icon" 
                        name="icon" 
                        defaultValue={editingUtility?.icon || "zap"}
                        placeholder="zap, droplet, flame"
                      />
                    </div>
                    <div>
                      <Label htmlFor="utility-color">Цвет (HEX)</Label>
                      <Input 
                        id="utility-color" 
                        name="color" 
                        type="color"
                        defaultValue={editingUtility?.color || "#10b981"}
                      />
                    </div>
                    <div>
                      <Label htmlFor="utility-order">Порядок</Label>
                      <Input 
                        id="utility-order" 
                        name="order" 
                        type="number"
                        defaultValue={editingUtility?.order || 0}
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
              {loadingUtilities ? (
                <div className="text-center py-8">Загрузка...</div>
              ) : utilityTypes.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Нет типов коммунальных услуг</p>
                  <p className="text-sm text-muted-foreground mt-2">Добавьте типы для учета коммунальных платежей</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {utilityTypes.map(utility => (
                    <div key={utility._id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1 flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: utility.color }}
                        >
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">{utility.name}</h4>
                          {utility.description && (
                            <p className="text-sm text-muted-foreground">{utility.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUtility(utility);
                            setIsUtilityDialogOpen(true);
                          }}
                          disabled={utility.isDefault}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Вы уверены, что хотите удалить этот тип услуги?")) {
                              deleteUtilityType(utility._id);
                            }
                          }}
                          disabled={utility.isDefault}
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
      </Tabs>
    </div>
  );
}

export default References;