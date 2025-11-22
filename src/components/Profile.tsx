import { useState, useEffect } from "react";
import { User, Shield, Palette, Key, Sun, Moon, Monitor } from "lucide-react";
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

  // Settings State
  const [settings, setSettings] = useState({
    privacy: {
      hideAmounts: false,
      twoFactor: false // Placeholder
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
          
          // Populate Personal Info
          setProfile({
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            email: userData.login || "", 
            phone: userData.phone || "",
            birthDate: userData.birthDate ? userData.birthDate.split('T')[0] : "",
          });

          // Populate Settings
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

          // Sync local theme with DB theme on initial load
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

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = {
        theme: settings.appearance.theme,
        currency: settings.appearance.currency,
        dateFormat: settings.appearance.dateFormat,
        hideAmounts: settings.privacy.hideAmounts
      };

      await apiService.updateProfile({
        settings: settingsToSave
      });
      
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
            <Input 
              id="email"
              value={profile.email}
              disabled 
              className="bg-muted"
            />
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

          <Button 
            className="w-full" 
            onClick={handleSavePersonalInfo}
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const SecuritySettings = () => (
    <div className="space-y-6">
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 mb-4">
        Раздел безопасности временно недоступен для редактирования.
      </div>

      <Card className="rounded-2xl opacity-75 pointer-events-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Смена пароля
          </CardTitle>
        </CardHeader>
        <CardContent>
             <div className="space-y-4">
                <Label>Текущий пароль</Label>
                <Input type="password" disabled />
                <Label>Новый пароль</Label>
                <Input type="password" disabled />
                <Button disabled className="w-full">Изменить пароль</Button>
             </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Приватность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between opacity-50">
              <div>
                <p className="font-medium">Двухфакторная аутентификация</p>
                <p className="text-sm text-muted-foreground">Дополнительная защита аккаунта (Скоро)</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Скоро</Badge>
                <Switch disabled checked={false} />
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full mt-4" 
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить настройки приватности"}
          </Button>
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
                {/* Light Theme */}
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      currentTheme === "light" 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => handleThemeChange("light")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg flex items-center justify-center">
                      <Sun className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Светлая тема</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {currentTheme === "light" && <div className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                  </div>
                </div>

                {/* Dark Theme */}
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      currentTheme === "dark" 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => handleThemeChange("dark")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg flex items-center justify-center">
                      <Moon className="w-5 h-5 text-blue-200" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Темная тема</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {currentTheme === "dark" && <div className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                  </div>
                </div>

                {/* System Theme */}
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      currentTheme === "system" 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => handleThemeChange("system")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Системная тема</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {currentTheme === "system" && <div className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Active Info */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 rounded-lg flex items-center justify-center">
                    {getThemeIcon(currentTheme)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Выбрано: {getThemeLabel(currentTheme)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? "Сохранение..." : "Сохранить настройки внешнего вида"}
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