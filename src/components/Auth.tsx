import { useState } from "react";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Checkbox } from "./ui/checkbox";

interface AuthProps {
  onLogin: (user: { email: string; name: string }) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    rememberMe: false
  });

  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {[key: string]: string} = {};

    if (!loginForm.email) {
      newErrors.email = "Введите email";
    } else if (!validateEmail(loginForm.email)) {
      newErrors.email = "Некорректный email";
    }

    if (!loginForm.password) {
      newErrors.password = "Введите пароль";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Симуляция успешного входа
      const user = {
        email: loginForm.email,
        name: loginForm.email.split('@')[0]
      };
      onLogin(user);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {[key: string]: string} = {};

    if (!registerForm.firstName) {
      newErrors.firstName = "Введите имя";
    }

    if (!registerForm.lastName) {
      newErrors.lastName = "Введите фамилию";
    }

    if (!registerForm.email) {
      newErrors.email = "Введите email";
    } else if (!validateEmail(registerForm.email)) {
      newErrors.email = "Некорректный email";
    }

    if (!registerForm.password) {
      newErrors.password = "Введите пароль";
    } else if (!validatePassword(registerForm.password)) {
      newErrors.password = "Пароль должен содержать минимум 6 символов";
    }

    if (!registerForm.confirmPassword) {
      newErrors.confirmPassword = "Подтвердите пароль";
    } else if (registerForm.password !== registerForm.confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают";
    }

    if (!registerForm.agreeToTerms) {
      newErrors.agreeToTerms = "Необходимо согласие с условиями";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Симуляция успешной регистрации
      const user = {
        email: registerForm.email,
        name: `${registerForm.firstName} ${registerForm.lastName}`
      };
      onLogin(user);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">Система учёта бюджета</CardTitle>
          <p className="text-muted-foreground">Войдите в свой аккаунт или создайте новый</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    placeholder="your@email.com"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="login-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      placeholder="Введите пароль"
                      className={errors.password ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={loginForm.rememberMe}
                    onCheckedChange={(checked) => setLoginForm({...loginForm, rememberMe: checked as boolean})}
                  />
                  <Label htmlFor="remember" className="text-sm">Запомнить меня</Label>
                </div>

                <Button type="submit" className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  Войти
                </Button>

                <div className="text-center">
                  <Button variant="link" className="text-sm">
                    Забыли пароль?
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      value={registerForm.firstName}
                      onChange={(e) => setRegisterForm({...registerForm, firstName: e.target.value})}
                      placeholder="Иван"
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm({...registerForm, lastName: e.target.value})}
                      placeholder="Петров"
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    placeholder="your@email.com"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="register-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      placeholder="Минимум 6 символов"
                      className={errors.password ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
                </div>

                <div>
                  <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                      placeholder="Повторите пароль"
                      className={errors.confirmPassword ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={registerForm.agreeToTerms}
                    onCheckedChange={(checked) => setRegisterForm({...registerForm, agreeToTerms: checked as boolean})}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    Я согласен с{" "}
                    <Button variant="link" className="p-0 h-auto text-sm">
                      условиями использования
                    </Button>
                  </Label>
                </div>
                {errors.agreeToTerms && <p className="text-sm text-red-500">{errors.agreeToTerms}</p>}

                <Button type="submit" className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Создать аккаунт
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}