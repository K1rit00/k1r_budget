import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TrendingUp, TrendingDown, Zap, Building2, Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { apiService } from "../services/api";
import { cn } from "@/lib/utils"; // Убедитесь, что у вас есть эта утилита, или удалите cn и используйте шаблонные строки

const addNotification = (msg: any) => console.log(msg);

// Палитра цветов как на изображении
const CATEGORY_COLORS = [
  "#60A5FA", // Blue
  "#34D399", // Green
  "#A78BFA", // Purple
  "#FBBF24", // Yellow
  "#F87171", // Red/Salmon
  "#818CF8", // Indigo
  "#FB923C", // Orange
  "#22D3EE", // Cyan
  "#4ADE80", // Lime
  "#F472B6", // Pink
];

interface Bank {
  _id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface UtilityType {
  _id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface Category {
  _id: string;
  name: string;
  type: 'expense' | 'income';
  description?: string;
  isDefault?: boolean;
  order?: number;
  color?: string; // Добавлено поле цвета
}

function References() {
  const [activeTab, setActiveTab] = useState("banks");

  // Banks state
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Utility Types state
  const [utilityTypes, setUtilityTypes] = useState<UtilityType[]>([]);
  const [isUtilityDialogOpen, setIsUtilityDialogOpen] = useState(false);
  const [editingUtility, setEditingUtility] = useState<UtilityType | null>(null);
  const [loadingUtilities, setLoadingUtilities] = useState(false);

  // Categories state
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income');
  
  // State для выбранного цвета
  const [selectedColor, setSelectedColor] = useState<string>(CATEGORY_COLORS[0]);

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

  // Load Categories
  const loadCategories = async (type: 'income' | 'expense') => {
    try {
      setLoadingCategories(true);
      const response = await apiService.getCategories(type);
      if (response.success) {
        if (type === 'income') {
          setIncomeCategories(response.data);
        } else {
          setExpenseCategories(response.data);
        }
      }
    } catch (error: any) {
      addNotification({
        message: error.response?.data?.message || "Ошибка загрузки категорий",
        type: "error"
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === "banks") {
      loadBanks();
    } else if (activeTab === "utilities") {
      loadUtilityTypes();
    } else if (activeTab === "income") {
      loadCategories('income');
    } else if (activeTab === "expenses") {
      loadCategories('expense');
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
    if (!confirm("Вы уверены, что хотите удалить этот банк?")) return;

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

  // Utility Type handlers
  const handleUtilitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const utilityData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined
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
    if (!confirm("Вы уверены, что хотите удалить этот тип услуги?")) return;

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

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const categoryData = {
      name: formData.get("name") as string,
      type: categoryType,
      description: formData.get("description") as string || undefined,
      color: selectedColor, // Отправляем выбранный цвет
    };

    try {
      if (editingCategory) {
        const response = await apiService.updateCategory(editingCategory._id, categoryData);
        if (response.success) {
          addNotification({ message: "Категория обновлена", type: "success" });
          loadCategories(categoryType);
        }
      } else {
        const response = await apiService.createCategory(categoryData);
        if (response.success) {
          addNotification({ message: "Категория добавлена", type: "success" });
          loadCategories(categoryType);
        }
      }
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch (error: any) {
      addNotification({
        message: error.response?.data?.message || "Ошибка сохранения категории",
        type: "error"
      });
    }
  };

  const deleteCategory = async (id: string, type: 'income' | 'expense') => {
    if (!confirm("Вы уверены, что хотите удалить эту категорию?")) return;

    try {
      const response = await apiService.deleteCategory(id);
      if (response.success) {
        addNotification({ message: "Категория удалена", type: "info" });
        loadCategories(type);
      }
    } catch (error: any) {
      addNotification({
        message: error.response?.data?.message || "Ошибка удаления категории",
        type: "error"
      });
    }
  };

  const openCategoryDialog = (type: 'income' | 'expense', category?: Category) => {
    setCategoryType(type);
    setEditingCategory(category || null);
    // Если редактируем - берем цвет категории, иначе дефолтный первый цвет
    setSelectedColor(category?.color || CATEGORY_COLORS[0]);
    setIsCategoryDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full gap-2">
          <TabsTrigger value="banks">Банки</TabsTrigger>
          <TabsTrigger value="utilities">Комм. услуги</TabsTrigger>
          <TabsTrigger value="income">Доходы</TabsTrigger>
          <TabsTrigger value="expenses">Расходы</TabsTrigger>
        </TabsList>

        {/* БАНКИ */}
        <TabsContent value="banks" className="mt-6">
          <Card className="rounded-2xl">
             {/* ... (код банков без изменений) ... */}
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
                          onClick={() => deleteBank(bank._id)}
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

        {/* ТИПЫ КОММУНАЛЬНЫХ УСЛУГ */}
        <TabsContent value="utilities" className="mt-6">
           {/* ... (код коммуналки без изменений) ... */}
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
                      <div className="flex-1">
                        <h4 className="font-medium">{utility.name}</h4>
                        {utility.description && (
                          <p className="text-sm text-muted-foreground">{utility.description}</p>
                        )}
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
                          onClick={() => deleteUtilityType(utility._id)}
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

        {/* ДОХОДЫ */}
        <TabsContent value="income" className="mt-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Категории доходов
              </CardTitle>
              <Dialog open={isCategoryDialogOpen && categoryType === 'income'} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openCategoryDialog('income')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить категорию
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? "Редактировать категорию" : "Добавить категорию доходов"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="category-name">Название</Label>
                      <Input
                        id="category-name"
                        name="name"
                        required
                        defaultValue={editingCategory?.name}
                        placeholder="Например: Зарплата"
                      />
                    </div>

                    {/* Блок выбора цвета */}
                    <div>
                      <Label className="mb-2 block">Цвет категории</Label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={`w-8 h-8 rounded-full transition-all border-2 ${
                              selectedColor === color 
                                ? "border-foreground ring-2 ring-offset-2 ring-foreground/20 scale-110" 
                                : "border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Описание (опционально)</Label>
                      <Input
                        id="description"
                        name="description"
                        defaultValue={editingCategory?.description}
                        placeholder="Дополнительная информация"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingCategory ? "Обновить" : "Добавить"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCategoryDialogOpen(false);
                          setEditingCategory(null);
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
              {loadingCategories ? (
                <div className="text-center py-8">Загрузка...</div>
              ) : incomeCategories.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Нет категорий доходов</p>
                  <p className="text-sm text-muted-foreground mt-2">Добавьте категории для классификации доходов</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {incomeCategories.map(category => (
                    <div key={category._id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Кружок цвета в списке */}
                        {category.color && (
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <div>
                          <h4 className="font-medium">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCategoryDialog('income', category)}
                          disabled={category.isDefault}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategory(category._id, 'income')}
                          disabled={category.isDefault}
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

        {/* РАСХОДЫ */}
        <TabsContent value="expenses" className="mt-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Категории расходов
              </CardTitle>
              <Dialog open={isCategoryDialogOpen && categoryType === 'expense'} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openCategoryDialog('expense')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить категорию
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? "Редактировать категорию" : "Добавить категорию расходов"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="category-name-expense">Название</Label>
                      <Input
                        id="category-name-expense"
                        name="name"
                        required
                        defaultValue={editingCategory?.name}
                        placeholder="Например: Продукты"
                      />
                    </div>

                    {/* Блок выбора цвета */}
                    <div>
                      <Label className="mb-2 block">Цвет категории</Label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={`w-8 h-8 rounded-full transition-all border-2 ${
                              selectedColor === color 
                                ? "border-foreground ring-2 ring-offset-2 ring-foreground/20 scale-110" 
                                : "border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description-expense">Описание (опционально)</Label>
                      <Input
                        id="description-expense"
                        name="description"
                        defaultValue={editingCategory?.description}
                        placeholder="Дополнительная информация"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingCategory ? "Обновить" : "Добавить"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCategoryDialogOpen(false);
                          setEditingCategory(null);
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
              {loadingCategories ? (
                <div className="text-center py-8">Загрузка...</div>
              ) : expenseCategories.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingDown className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Нет категорий расходов</p>
                  <p className="text-sm text-muted-foreground mt-2">Добавьте категории для классификации расходов</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenseCategories.map(category => (
                    <div key={category._id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 flex-1">
                         {/* Кружок цвета в списке */}
                        {category.color && (
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <div>
                          <h4 className="font-medium">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCategoryDialog('expense', category)}
                          disabled={category.isDefault}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategory(category._id, 'expense')}
                          disabled={category.isDefault}
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