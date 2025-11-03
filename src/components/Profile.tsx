import { useState, useEffect } from "react";
import { User, Shield, Palette, Key, Eye, EyeOff, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";

function Profile() {
  const { theme, setTheme } = useTheme();
  
  const [profile, setProfile] = useState({
    firstName: "Иван",
    lastName: "Петров",
    email: "ivan.petrov@email.com",
    phone: "+7 (999) 123-45-67",
    birthDate: "1990-05-15",
    avatar: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [settings, setSettings] = useState({
    privacy: {
      hideAmounts: false,
      twoFactor: false
    },
    appearance: {
      currency: "KZT", // Изменено на казахстанский тенге согласно требованиям
      dateFormat: "DD.MM.YYYY"
    }
  });

  // Синхронизация темы с глобальным состоянием
  useEffect(() => {
    // При инициализации компонента тема уже установлена через ThemeProvider
  }, [theme]);

  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({});

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {[key: string]: string} = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Введите текущий пароль";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "Введите новый пароль";
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = "Пароль должен содержать минимум 6 символов";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Подтвердите новый пароль";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Пароли не совпадают";
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = "Новый пароль должен отличаться от текущего";
    }

    setPasswordErrors(errors);

    if (Object.keys(errors).length === 0) {
      // Здесь был бы запрос на сервер для смены пароля
      alert("Пароль успешно изменён!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    }
  };

  const PersonalInfo = () => (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Личная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-lg">
                {profile.firstName[0]}{profile.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline">Изменить фото</Button>
              <p className="text-sm text-muted-foreground">
                JPG, PNG до 5MB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Имя</Label>
              <Input 
                id="firstName"
                value={profile.firstName}
                onChange={(e) => setProfile({...profile, firstName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Фамилия</Label>
              <Input 
                id="lastName"
                value={profile.lastName}
                onChange={(e) => setProfile({...profile, lastName: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="phone">Телефон</Label>
            <Input 
              id="phone"
              value={profile.phone}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="birthDate">Дата рождения</Label>
            <Input 
              id="birthDate"
              type="date"
              value={profile.birthDate}
              onChange={(e) => setProfile({...profile, birthDate: e.target.value})}
            />
          </div>

          <Button className="w-full">Сохранить изменения</Button>
        </CardContent>
      </Card>
    </div>
  );

  const SecuritySettings = () => (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Смена пароля
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  placeholder="Введите текущий пароль"
                  className={passwordErrors.currentPassword ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newPassword">Новый пароль</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  placeholder="Введите новый пароль"
                  className={passwordErrors.newPassword ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.newPassword}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  placeholder="Повторите новый пароль"
                  className={passwordErrors.confirmPassword ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Изменить пароль
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Безопасность и приватность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Скрывать суммы</p>
                <p className="text-sm text-muted-foreground">Показывать звездочки вместо сумм</p>
              </div>
              <Switch 
                checked={settings.privacy.hideAmounts}
                onCheckedChange={(checked) => 
                  setSettings({
                    ...settings, 
                    privacy: {...settings.privacy, hideAmounts: checked}
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Двухфакторная аутентификация</p>
                <p className="text-sm text-muted-foreground">Дополнительная защита аккаунта</p>
              </div>
              <div className="flex items-center gap-2">
                {!settings.privacy.twoFactor && <Badge variant="secondary">Не настроено</Badge>}
                <Switch 
                  checked={settings.privacy.twoFactor}
                  onCheckedChange={(checked) => 
                    setSettings({
                      ...settings, 
                      privacy: {...settings.privacy, twoFactor: checked}
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4">Управление данными</h4>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Экспортировать данные
              </Button>
              <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                Удалить аккаунт
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const AppearanceSettings = () => {
    const getThemeIcon = (themeValue: string) => {
      switch(themeValue) {
        case "light": return <Sun className="w-4 h-4" />;
        case "dark": return <Moon className="w-4 h-4" />;
        case "system": return <Monitor className="w-4 h-4" />;
        default: return <Monitor className="w-4 h-4" />;
      }
    };

    const getThemeLabel = (themeValue: string) => {
      switch(themeValue) {
        case "light": return "Светлая";
        case "dark": return "Темная";
        case "system": return "Системная";
        default: return "Системная";
      }
    };

    return (
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Внешний вид
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Тема оформления</Label>
              <div className="grid grid-cols-1 gap-3">
                {/* Карточки выбора темы */}
                <div className="space-y-3">
                  <div 
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      theme === "light" 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg flex items-center justify-center">
                        <Sun className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Светлая тема</p>
                        <p className="text-sm text-muted-foreground">Классический светлый интерфейс для дневного использования</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Предварительный просмотр светлой темы */}
                        <div className="w-8 h-6 bg-white border border-gray-200 rounded flex flex-col">
                          <div className="h-2 bg-gray-100 rounded-t"></div>
                          <div className="flex-1 p-1 space-y-0.5">
                            <div className="w-full h-0.5 bg-gray-300 rounded"></div>
                            <div className="w-3/4 h-0.5 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                        {theme === "light" && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      theme === "dark" 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg flex items-center justify-center">
                        <Moon className="w-5 h-5 text-blue-200" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Темная тема</p>
                        <p className="text-sm text-muted-foreground">Темный интерфейс для комфортной работы в темное время</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Предварительный просмотр темной темы */}
                        <div className="w-8 h-6 bg-gray-900 border border-gray-700 rounded flex flex-col">
                          <div className="h-2 bg-gray-800 rounded-t"></div>
                          <div className="flex-1 p-1 space-y-0.5">
                            <div className="w-full h-0.5 bg-gray-600 rounded"></div>
                            <div className="w-3/4 h-0.5 bg-gray-700 rounded"></div>
                          </div>
                        </div>
                        {theme === "dark" && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      theme === "system" 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => setTheme("system")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Системная тема</p>
                        <p className="text-sm text-muted-foreground">Автоматически следует настройкам вашего устройства</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Предварительный просмотр системной темы */}
                        <div className="w-8 h-6 border border-gray-300 dark:border-gray-600 rounded flex">
                          <div className="w-1/2 bg-white dark:bg-gray-900 rounded-l flex flex-col">
                            <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-tl"></div>
                            <div className="flex-1 p-0.5 space-y-0.5">
                              <div className="w-full h-0.5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            </div>
                          </div>
                          <div className="w-1/2 bg-gray-900 dark:bg-white rounded-r flex flex-col">
                            <div className="h-1 bg-gray-800 dark:bg-gray-100 rounded-tr"></div>
                            <div className="flex-1 p-0.5 space-y-0.5">
                              <div className="w-full h-0.5 bg-gray-600 dark:bg-gray-300 rounded"></div>
                            </div>
                          </div>
                        </div>
                        {theme === "system" && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Текущая активная тема и дополнительная информация */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 rounded-lg flex items-center justify-center">
                      {getThemeIcon(theme)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Активная тема: {getThemeLabel(theme)}</p>
                      <p className="text-xs text-muted-foreground">
                        {theme === "system" ? "Изменится автоматически в зависимости от времени суток" : "Тема изменена вручную"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">💡 Совет:</p>
                    <p className="text-blue-800 dark:text-blue-200">
                      Темная тема помогает снизить нагрузку на глаза при работе в условиях низкого освещения и может продлить время работы батареи на OLED-экранах.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Основная валюта</Label>
              <Select 
                value={settings.appearance.currency} 
                onValueChange={(value) => 
                  setSettings({
                    ...settings, 
                    appearance: {...settings.appearance, currency: value}
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KZT">₸ Казахстанский тенге</SelectItem>
                  <SelectItem value="RUB">₽ Российский рубль</SelectItem>
                  <SelectItem value="USD">$ Доллар США</SelectItem>
                  <SelectItem value="EUR">€ Евро</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Формат даты</Label>
              <Select 
                value={settings.appearance.dateFormat} 
                onValueChange={(value) => 
                  setSettings({
                    ...settings, 
                    appearance: {...settings.appearance, dateFormat: value}
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD.MM.YYYY">ДД.ММ.ГГГГ</SelectItem>
                  <SelectItem value="MM/DD/YYYY">ММ/ДД/ГГГГ</SelectItem>
                  <SelectItem value="YYYY-MM-DD">ГГГГ-ММ-ДД</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full" 
              onClick={() => {
                // Здесь можно добавить логику сохранения других настроек
                // Тема уже сохраняется автоматически через ThemeProvider
                alert("Настройки сохранены!");
              }}
            >
              Сохранить настройки
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Личные данные</TabsTrigger>
          <TabsTrigger value="security">Без��пасность</TabsTrigger>
          <TabsTrigger value="appearance">Внешний вид</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfo />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Profile;