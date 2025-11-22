import { useState } from "react";
import { Eye, EyeOff, LogIn, UserPlus, Loader2, AlertCircle, Clock } from "lucide-react"; // Добавил Clock для иконки истечения времени
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Checkbox } from "./ui/checkbox";
import { apiService } from "../services/api";
import { toast } from "sonner";

// 1. ИСПРАВЛЕНИЕ: Добавляем sessionExpired в интерфейс
interface AuthProps {
  onLogin: (user: { email: string; name: string }) => void;
  sessionExpired?: boolean;
}

// 2. ИСПРАВЛЕНИЕ: Деструктурируем sessionExpired из пропсов
export function Auth({ onLogin, sessionExpired }: AuthProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({
    login: "",
    password: "",
    rememberMe: false
  });

  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    login: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateLogin = (login: string) => {
    return login.length >= 3;
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const newErrors: {[key: string]: string} = {};

    if (!loginForm.login) {
      newErrors.login = "Введите логин";
    } else if (!validateLogin(loginForm.login)) {
      newErrors.login = "Логин должен содержать минимум 3 символа";
    }

    if (!loginForm.password) {
      newErrors.password = "Введите пароль";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiService.login({
        login: loginForm.login,
        password: loginForm.password
      });

      if (response.success) {
        const user = {
          email: response.data.user.login,
          name: response.data.user.fullName || response.data.user.firstName
        };
        
        toast.success("Вход выполнен успешно!");
        onLogin(user);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = "Ошибка при входе";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors({ submit: errorMessage });
      toast.error(errorMessage, { 
        duration: 5000,
        description: "Проверьте правильность введенных данных"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const newErrors: {[key: string]: string} = {};

    if (!registerForm.firstName) newErrors.firstName = "Введите имя";
    if (!registerForm.lastName) newErrors.lastName = "Введите фамилию";
    if (!registerForm.login) newErrors.login = "Введите логин";
    else if (!validateLogin(registerForm.login)) newErrors.login = "Логин должен содержать минимум 3 символа";

    if (!registerForm.password) newErrors.password = "Введите пароль";
    else if (!validatePassword(registerForm.password)) newErrors.password = "Пароль должен содержать минимум 6 символов";

    if (!registerForm.confirmPassword) newErrors.confirmPassword = "Подтвердите пароль";
    else if (registerForm.password !== registerForm.confirmPassword) newErrors.confirmPassword = "Пароли не совпадают";

    if (!registerForm.agreeToTerms) newErrors.agreeToTerms = "Необходимо согласие с условиями";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiService.register({
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        login: registerForm.login,
        password: registerForm.password
      });

      if (response.success) {
        const user = {
          email: response.data.user.login,
          name: response.data.user.fullName || `${response.data.user.firstName} ${response.data.user.lastName}`
        };
        
        toast.success("Регистрация прошла успешно!");
        onLogin(user);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = "Ошибка при регистрации";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors({ submit: errorMessage });
      toast.error(errorMessage, { 
        duration: 5000,
        description: "Попробуйте использовать другой логин или проверьте данные"
      });
    } finally {
      setIsLoading(false);
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
              
              {/* 3. ИСПРАВЛЕНИЕ: Визуальное уведомление об истечении сессии */}
              {sessionExpired && (
                <div className="p-3 mb-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        Сессия истекла
                      </p>
                      <p className="text-xs text-yellow-600/90 dark:text-yellow-400/90 mt-1">
                        В целях безопасности, пожалуйста, войдите снова.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-login">Логин</Label>
                  <Input
                    id="login-login"
                    type="text"
                    value={loginForm.login}
                    onChange={(e) => {
                      setLoginForm({...loginForm, login: e.target.value});
                      if (errors.login) {
                        setErrors(prev => {
                          const newErrors = {...prev};
                          delete newErrors.login;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Введите логин"
                    className={errors.login ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {errors.login && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.login}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="login-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => {
                        setLoginForm({...loginForm, password: e.target.value});
                        if (errors.password) {
                          setErrors(prev => {
                            const newErrors = {...prev};
                            delete newErrors.password;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Введите пароль"
                      className={errors.password ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.password}
                    </p>
                  )}
                </div>
                {errors.submit && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          Ошибка входа
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {errors.submit}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Войти
                    </>
                  )}
                </Button>          
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
               {/* Форма регистрации (без изменений) */}
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      value={registerForm.firstName}
                      onChange={(e) => {
                        setRegisterForm({...registerForm, firstName: e.target.value});
                        if (errors.firstName) {
                          setErrors(prev => {
                            const newErrors = {...prev};
                            delete newErrors.firstName;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Иван"
                      className={errors.firstName ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      value={registerForm.lastName}
                      onChange={(e) => {
                        setRegisterForm({...registerForm, lastName: e.target.value});
                        if (errors.lastName) {
                          setErrors(prev => {
                            const newErrors = {...prev};
                            delete newErrors.lastName;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Петров"
                      className={errors.lastName ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-login">Логин</Label>
                  <Input
                    id="register-login"
                    type="text"
                    value={registerForm.login}
                    onChange={(e) => {
                      setRegisterForm({...registerForm, login: e.target.value});
                      if (errors.login) {
                        setErrors(prev => {
                          const newErrors = {...prev};
                          delete newErrors.login;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Введите логин"
                    className={errors.login ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {errors.login && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.login}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="register-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) => {
                        setRegisterForm({...registerForm, password: e.target.value});
                        if (errors.password) {
                          setErrors(prev => {
                            const newErrors = {...prev};
                            delete newErrors.password;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Минимум 6 символов"
                      className={errors.password ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerForm.confirmPassword}
                      onChange={(e) => {
                        setRegisterForm({...registerForm, confirmPassword: e.target.value});
                        if (errors.confirmPassword) {
                          setErrors(prev => {
                            const newErrors = {...prev};
                            delete newErrors.confirmPassword;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Повторите пароль"
                      className={errors.confirmPassword ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={registerForm.agreeToTerms}
                    onCheckedChange={(checked) => {
                      setRegisterForm({...registerForm, agreeToTerms: checked as boolean});
                      if (errors.agreeToTerms) {
                        setErrors(prev => {
                          const newErrors = {...prev};
                          delete newErrors.agreeToTerms;
                          return newErrors;
                        });
                      }
                    }}
                    disabled={isLoading}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    Я согласен с{" "}
                    <Button variant="link" className="p-0 h-auto text-sm" disabled={isLoading}>
                      условиями использования
                    </Button>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.agreeToTerms}
                  </p>
                )}

                {errors.submit && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          Ошибка регистрации
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {errors.submit}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Регистрация...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Создать аккаунт
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}