import { memo, useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Target, Calendar, PieChart, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Wallet, Building, Zap, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { KPICard } from "./common/KPICard";
import { ProgressCard } from "./common/ProgressCard";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Credit, Deposit, Income, RentPayment } from "../types";

const Dashboard = memo(function Dashboard() {
  const [credits] = useLocalStorage<Credit[]>("credits", []);
  const [deposits] = useLocalStorage<Deposit[]>("deposits", []);
  const [incomes] = useLocalStorage<Income[]>("incomes", []);
  const [rentPayments] = useLocalStorage<RentPayment[]>("rent-payments", []);

  // Расчет текущего баланса (сумма всех активных депозитов)
  const currentBalance = deposits
    .filter(d => d.isActive)
    .reduce((sum, d) => sum + d.currentBalance, 0);

  // Расчет доходов за текущий месяц
  const monthlyIncome = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return incomes
      .filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getMonth() === currentMonth && 
               incomeDate.getFullYear() === currentYear;
      })
      .reduce((sum, income) => sum + income.amount, 0);
  }, [incomes]);

  // Расчет общего долга
  const totalDebt = credits
    .filter(credit => credit.status === "active")
    .reduce((sum, credit) => sum + credit.currentBalance, 0);

  // Расчет ежемесячных платежей по кредитам
  const creditPayments = credits
    .filter(credit => credit.status === "active")
    .reduce((sum, credit) => sum + credit.monthlyPayment, 0);

  // Расчет расходов (примерно на основе разницы доходов и баланса)
  const monthlyExpenses = monthlyIncome > 0 ? creditPayments : 0;
  const monthlySavings = monthlyIncome - monthlyExpenses;

  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const debtToIncomeRatio = monthlyIncome > 0 ? (creditPayments / monthlyIncome) * 100 : 0;

  const kpiData = useMemo(() => [
    {
      title: "Текущий баланс",
      value: currentBalance,
      trend: deposits.length > 0 ? "+0% за месяц" : "Нет данных",
      icon: Wallet,
      colorScheme: "green" as const,
      trendDirection: "up" as const
    },
    {
      title: "Доходы за месяц",
      value: monthlyIncome,
      trend: incomes.length > 0 ? "+0% к прошлому" : "Нет данных",
      icon: TrendingUp,
      colorScheme: "blue" as const,
      trendDirection: "up" as const
    },
    {
      title: "Расходы за месяц",
      value: monthlyExpenses,
      trend: credits.length > 0 ? "0% к прошлому" : "Нет данных",
      icon: TrendingDown,
      colorScheme: "orange" as const,
      trendDirection: "down" as const
    },
    {
      title: "Накопления",
      value: monthlySavings,
      trend: monthlyIncome > 0 ? `${savingsRate.toFixed(1)}% от дохода` : "Нет данных",
      icon: DollarSign,
      colorScheme: "purple" as const,
      customIcon: Target
    }
  ], [currentBalance, monthlyIncome, monthlyExpenses, monthlySavings, savingsRate, deposits.length, incomes.length, credits.length]);

  const KPICards = memo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((kpi, index) => (
        <KPICard key={index} {...kpi} />
      ))}
    </div>
  ));

  const FinancialHealthMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Финансовое здоровье
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Коэффициент сбережений</span>
              <span className="text-sm font-medium">{savingsRate.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, savingsRate)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {savingsRate >= 20 ? "Отличный показатель" : savingsRate >= 10 ? "Хороший показатель" : monthlyIncome > 0 ? "Требует улучшения" : "Добавьте доходы"}
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Долговая нагрузка</span>
              <span className="text-sm font-medium">{debtToIncomeRatio.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, debtToIncomeRatio)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {debtToIncomeRatio <= 30 ? "Безопасный уровень" : debtToIncomeRatio <= 50 ? "Умеренный риск" : debtToIncomeRatio > 0 ? "Высокий риск" : "Нет кредитов"}
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Ликвидность (месяцы покрытия)</span>
              <span className="text-sm font-medium">
                {monthlyExpenses > 0 ? (currentBalance / monthlyExpenses).toFixed(1) : "∞"}
              </span>
            </div>
            <Progress 
              value={monthlyExpenses > 0 ? Math.min(100, (currentBalance / (monthlyExpenses * 6)) * 100) : 100} 
              className="h-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Рекомендуется 6+ месяцев расходов
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Структура активов
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deposits.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={deposits
                      .filter(d => d.isActive && d.currentBalance > 0)
                      .map((d, idx) => ({
                        name: d.title,
                        value: d.currentBalance,
                        color: `hsl(${(idx * 360) / deposits.length}, 70%, 50%)`
                      }))
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deposits
                      .filter(d => d.isActive && d.currentBalance > 0)
                      .map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / deposits.filter(d => d.isActive && d.currentBalance > 0).length}, 70%, 50%)`} />
                      ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${Number(value).toLocaleString("kk-KZ")} ₸`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--card-foreground))'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {deposits
                  .filter(d => d.isActive && d.currentBalance > 0)
                  .slice(0, 6)
                  .map((deposit, index) => (
                    <div key={deposit.id} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: `hsl(${(index * 360) / deposits.filter(d => d.isActive && d.currentBalance > 0).length}, 70%, 50%)` }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {deposit.title}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет депозитов</p>
                <p className="text-xs">Создайте депозит для отслеживания</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const CreditOverview = memo(() => {
    const activeCredits = credits.filter(c => c.status === "active");
    
    return (
      <ProgressCard
        title="Прогресс по кредитам"
        icon={CreditCard}
        items={activeCredits.length > 0 ? activeCredits.map(credit => ({
          id: credit.id,
          name: credit.name,
          current: credit.amount - credit.currentBalance,
          target: credit.amount,
          color: "bg-red-500",
          monthlyPayment: credit.monthlyPayment,
          type: "credit"
        })) : []}
        emptyMessage="Нет активных кредитов"
      />
    );
  });

  const DepositsProgress = memo(() => {
    const savingsDeposits = deposits.filter(d => d.isActive && d.type === "savings");
    
    return (
      <ProgressCard
        title="Прогресс по накоплениям"
        icon={Heart}
        items={savingsDeposits.length > 0 ? savingsDeposits.map(deposit => ({
          id: deposit.id,
          name: deposit.title,
          current: deposit.currentBalance,
          target: deposit.amount,
          color: "bg-green-500",
          deadline: deposit.endDate,
          type: "goal"
        })) : []}
        emptyMessage="Нет накопительных депозитов"
      />
    );
  });

  const UpcomingPayments = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const upcomingCredits = credits
      .filter(c => c.status === "active")
      .map(credit => ({
        id: credit.id,
        name: credit.name,
        amount: credit.monthlyPayment,
        date: new Date(now.getFullYear(), now.getMonth() + 1, new Date(credit.startDate).getDate()),
        type: "credit" as const,
        urgent: false
      }));

    const allPayments = [...upcomingCredits]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Ближайшие платежи
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allPayments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Нет запланированных платежей</p>
              <p className="text-sm text-muted-foreground">Платежи появятся после добавления кредитов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPayments.map((payment, index) => {
                const getIcon = (type: string) => {
                  switch(type) {
                    case "credit": return <CreditCard className="w-4 h-4 text-red-500 dark:text-red-400" />;
                    case "rent": return <Building className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
                    case "utility": return <Zap className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
                    default: return <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
                  }
                };

                return (
                  <div key={payment.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    payment.urgent 
                      ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' 
                      : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      {getIcon(payment.type)}
                      <div>
                        <p className="font-medium">{payment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{payment.amount.toLocaleString("kk-KZ")} ₸</p>
                      {payment.urgent && (
                        <Badge variant="destructive" className="text-xs">Срочно</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const IncomeBreakdown = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyIncomes = incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate.getMonth() === currentMonth && 
             incomeDate.getFullYear() === currentYear;
    });

    const incomeByCategory = monthlyIncomes.reduce((acc, income) => {
      const category = income.categoryName || "Прочее";
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += income.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalIncome = Object.values(incomeByCategory).reduce((sum, val) => sum + val, 0);

    const incomeStreams = Object.entries(incomeByCategory).map(([category, amount]) => ({
      source: category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      trend: "stable" as const
    }));

    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Источники доходов
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {incomeStreams.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Нет доходов за текущий месяц</p>
              <p className="text-sm text-muted-foreground">Добавьте доходы в разделе "Доходы"</p>
            </div>
          ) : (
            incomeStreams.map((stream, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stream.source}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{stream.amount.toLocaleString("kk-KZ")} ₸</p>
                    <p className="text-xs text-muted-foreground">{stream.percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <Progress value={stream.percentage} className="h-1" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards />

      {/* Financial Health & Asset Structure */}
      <FinancialHealthMetrics />

      {/* Progress Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreditOverview />
        <DepositsProgress />
      </div>

      {/* Upcoming Payments & Income Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingPayments />
        <IncomeBreakdown />
      </div>

      {/* Welcome message for empty state */}
      {deposits.length === 0 && incomes.length === 0 && credits.length === 0 && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg mb-2">Добро пожаловать в систему учёта бюджета!</h3>
            <p className="text-muted-foreground mb-4">
              Начните с добавления данных в соответствующих разделах:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 bg-muted/50 rounded-lg">
                <Wallet className="w-6 h-6 mb-2 text-blue-500" />
                <p className="font-medium mb-1">Депозиты</p>
                <p className="text-sm text-muted-foreground">Создайте депозиты для управления средствами</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <TrendingUp className="w-6 h-6 mb-2 text-green-500" />
                <p className="font-medium mb-1">Доходы</p>
                <p className="text-sm text-muted-foreground">Добавьте источники доходов</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <CreditCard className="w-6 h-6 mb-2 text-red-500" />
                <p className="font-medium mb-1">Кредиты</p>
                <p className="text-sm text-muted-foreground">Отслеживайте кредиты и платежи</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default Dashboard;
