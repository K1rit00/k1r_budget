import { useState, useEffect } from "react";
import { User, Shield, Palette, Key, Sun, Moon, Monitor, Eye, EyeOff, Check } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { apiService } from "../services/api";

function Profile() {
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    privacy: {
      hideAmounts: false,
      twoFactor: false
    },
    appearance: {
      currency: "KZT",
      dateFormat: "DD.MM.YYYY",
      theme: "system"
    }
  });

  // --- Fetch Data on Mount ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiService.getMe();
        if (response.success) {
          const userData = response.data.user;
          
          setProfile({
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            email: userData.login || "", 
            phone: userData.phone || "",
            birthDate: userData.birthDate ? userData.birthDate.split('T')[0] : "",
          });

          const userSettings = userData.settings || {};
          
          setSettings(prev => ({
            ...prev,
            privacy: {
              ...prev.privacy,
              hideAmounts: userSettings.hideAmounts || false
            },
            appearance: {
              currency: userSettings.currency || userData.currency || "KZT",
              dateFormat: userSettings.dateFormat || "DD.MM.YYYY",
              theme: userSettings.theme || "system"
            }
          }));

          if (userSettings.theme && userSettings.theme !== theme) {
             setTheme(userSettings.theme);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // --- Save Handlers ---
  const handleSavePersonalInfo = async () => {
    setIsSaving(true);
    try {
      await apiService.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        birthDate: profile.birthDate,
      });
      alert("Личные данные успешно сохранены!");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      const message = error.response?.data?.message || "Ошибка при сохранении";
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    // Валидация на фронте
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("Заполните все поля");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Новый пароль должен содержать минимум 6 символов");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError("Новый пароль должен отличаться от текущего");
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordSuccess("Пароль успешно изменен!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      // Очищаем сообщение об успехе через 3 секунды
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (error: any) {
      console.error("Error changing password:", error);
      const message = error.response?.data?.message || "Ошибка при смене пароля";
      setPasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = {
        theme: settings.appearance.theme,
        currency: settings.appearance.currency,
        dateFormat: settings.appearance.dateFormat,
        hideAmounts: settings.privacy.hideAmounts
      };

      await apiService.updateProfile({ settings: settingsToSave });
      alert("Настройки успешно сохранены!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      const message = error.response?.data?.message || "Ошибка при сохранении";
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, theme: newTheme }
    }));
    setTheme(newTheme); 
  };

  // --- Components ---
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
            <Label htmlFor="email">Логин / Email</Label>
            <Input id="email" value={profile.email} disabled className="bg-muted" />
          </div>
          <div>
            <Label htmlFor="phone">Телефон</Label>
            <Input 
              id="phone"
              value={profile.phone}
              placeholder="+7 (xxx) xxx-xx-xx"
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
          <Button className="w-full" onClick={handleSavePersonalInfo} disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const SecuritySettings = () => (
    <div className="space-y-6">
      {/* Смена пароля */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Смена пароля
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && (
            <div className="p-3 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {passwordError}
            </div>
          )}
          
          {passwordSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {passwordSuccess}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Текущий пароль</Label>
            <div className="relative">
              <Input 
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                placeholder="Введите текущий пароль"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Новый пароль</Label>
            <div className="relative">
              <Input 
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Минимум 6 символов"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
            <div className="relative">
              <Input 
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Повторите новый пароль"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleChangePassword}
            disabled={isChangingPassword}
          >
            {isChangingPassword ? "Изменение..." : "Изменить пароль"}
          </Button>
        </CardContent>
      </Card>

      {/* Приватность */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Приватность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Скрывать суммы</p>
              <p className="text-sm text-muted-foreground">Заменяет суммы на ***</p>
            </div>
            <Switch 
              checked={settings.privacy.hideAmounts}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                privacy: { ...prev.privacy, hideAmounts: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-medium">Двухфакторная аутентификация</p>
              <p className="text-sm text-muted-foreground">Дополнительная защита (Скоро)</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Скоро</Badge>
              <Switch disabled checked={false} />
            </div>
          </div>
          
          <Button className="w-full" onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const AppearanceSettings = () => {
    const currentTheme = settings.appearance.theme;

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
                {[
                  { value: "light", label: "Светлая тема", icon: Sun, gradient: "from-yellow-100 to-orange-100", iconColor: "text-yellow-600" },
                  { value: "dark", label: "Темная тема", icon: Moon, gradient: "from-blue-900 to-purple-900", iconColor: "text-blue-200" },
                  { value: "system", label: "Системная тема", icon: Monitor, gradient: "from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900", iconColor: "text-purple-600 dark:text-purple-300" }
                ].map(({ value, label, icon: Icon, gradient, iconColor }) => (
                  <div 
                    key={value}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      currentTheme === value 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => handleThemeChange(value as "light" | "dark" | "system")}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <p className="font-medium flex-1">{label}</p>
                      {currentTheme === value && <div className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить настройки"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Загрузка профиля...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Личные данные</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="appearance">Внешний вид</TabsTrigger>
        </TabsList>
        <TabsContent value="personal"><PersonalInfo /></TabsContent>
        <TabsContent value="security"><SecuritySettings /></TabsContent>
        <TabsContent value="appearance"><AppearanceSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

export default Profile;