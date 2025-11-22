import { memo, useMemo, useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Target, Calendar, PieChart, Activity, Wallet, Building, Zap, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from "recharts";
import { KPICard } from "./common/KPICard";
import { ProgressCard } from "./common/ProgressCard";
import { apiService } from "../services/api";

// Интерфейсы
interface Credit {
  _id: string;
  id?: string;
  name: string;
  amount: number;
  currentBalance: number;
  monthlyPayment: number;
  startDate: string | Date;
  status: string;
}

interface RentProperty {
  _id: string;
  address: string;
  rentAmount: number;
  startDate: string | Date;
  status: string;
  ownerName: string;
}

interface Deposit {
  _id: string;
  id?: string;
  title: string;
  name: string;
  currentBalance: number;
  amount: number;
  isActive: boolean;
  endDate: string | Date;
  type: string;
  status: string;
}

interface Income {
  _id: string;
  date: string | Date;
  amount: number | string;
  categoryName?: string;
  source: string;
}

interface RentPayment {
  _id: string;
  id?: string;
  amount: number;
  paymentDate: string | Date;
  type: string;
  paymentType: string;
  status: string;
  propertyId: string;
}

const Dashboard = memo(function Dashboard() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [rentProperties, setRentProperties] = useState<RentProperty[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [creditsRes, depositsRes, incomesRes, rentRes, rentPropsRes] = await Promise.all([
          apiService.getCredits({ status: 'active' }),
          apiService.getDeposits({ status: 'active' }),
          apiService.getIncome(),
          apiService.getRentPayments(),
          apiService.getRentProperties({ status: 'active' })
        ]);

        // Обработка Кредитов
        const creditsData = Array.isArray(creditsRes) ? creditsRes : (creditsRes.data || []);
        const mappedCredits = creditsData.map((c: any) => ({
          ...c,
          id: c._id,
          amount: Number(c.amount),
          currentBalance: Number(c.currentBalance || c.amount),
          monthlyPayment: Number(c.monthlyPayment)
        }));
        setCredits(mappedCredits);

        // Обработка Депозитов
        const depositsData = Array.isArray(depositsRes) ? depositsRes : (depositsRes.data || []);
        const mappedDeposits = depositsData.map((d: any) => ({
          ...d,
          id: d._id,
          title: d.name || d.bankName,
          isActive: d.status === 'active',
          currentBalance: Number(d.currentBalance),
          amount: Number(d.amount),
          type: d.type
        }));
        setDeposits(mappedDeposits);

        // Обработка Доходов
        const incomesData = Array.isArray(incomesRes) ? incomesRes : (incomesRes.data || []);
        const mappedIncomes = incomesData.map((i: any) => ({
          ...i,
          amount: Number(i.amount),
          categoryName: i.type?.name || i.source
        }));
        setIncomes(mappedIncomes);

        // Обработка Аренды
        const rentPropsData = Array.isArray(rentPropsRes) ? rentPropsRes : (rentPropsRes.data || []);
        const mappedRentProps = rentPropsData.map((r: any) => ({
          ...r,
          _id: r._id,
          rentAmount: Number(r.rentAmount),
          startDate: r.startDate
        }));
        setRentProperties(mappedRentProps);

      } catch (err) {
        console.error("Ошибка загрузки дашборда:", err);
        setError("Не удалось загрузить данные.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- РАСЧЕТЫ ---

  // 1. Текущий баланс
  const currentBalance = useMemo(() => deposits
    .filter(d => d.isActive)
    .reduce((sum, d) => sum + (d.currentBalance || 0), 0), [deposits]);

  // 2. Доходы за месяц
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
      .reduce((sum, income) => sum + Number(income.amount), 0);
  }, [incomes]);

  // 3. Платежи по кредитам
  const creditPayments = useMemo(() => credits
    .filter(credit => credit.status === "active")
    .reduce((sum, credit) => sum + credit.monthlyPayment, 0), [credits]);

  // 4. Арендная плата (активная)
  const totalRent = useMemo(() => rentProperties
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + r.rentAmount, 0), [rentProperties]);

  // 5. Итоговые расходы (обязательные платежи)
  const monthlyExpenses = creditPayments + totalRent;

  // 6. Метрики здоровья
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  
  // Коэффициент обязательных платежей (Debt + Rent Ratio)
  const fixedCostRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;

  const kpiData = useMemo(() => [
    {
      title: "Текущий баланс",
      value: currentBalance,
      trend: deposits.length > 0 ? "Актуально" : "Нет данных",
      icon: Wallet,
      colorScheme: "green" as const,
      trendDirection: "up" as const
    },
    {
      title: "Доходы за месяц",
      value: monthlyIncome,
      trend: incomes.length > 0 ? "Текущий месяц" : "Нет данных",
      icon: TrendingUp,
      colorScheme: "blue" as const,
      trendDirection: "up" as const
    },
    {
      title: "Обязательства (мес)",
      value: monthlyExpenses,
      trend: credits.length > 0 || rentProperties.length > 0 ? "Кредиты + Аренда" : "Нет данных",
      icon: TrendingDown,
      colorScheme: "orange" as const,
      trendDirection: "down" as const
    },
    {
      title: "Свободные средства",
      value: monthlySavings,
      trend: monthlyIncome > 0 ? `${savingsRate.toFixed(1)}% от дохода` : "Нет данных",
      icon: DollarSign,
      colorScheme: "purple" as const,
      customIcon: Target
    }
  ], [currentBalance, monthlyIncome, monthlyExpenses, monthlySavings, savingsRate, deposits.length, incomes.length, credits.length, rentProperties.length]);

  // --- КОМПОНЕНТЫ ---

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
            <Progress value={Math.max(0, Math.min(100, savingsRate))} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {savingsRate >= 20 ? "Отличный показатель" : savingsRate >= 10 ? "Хороший показатель" : monthlyIncome > 0 ? "Требует улучшения" : "Добавьте доходы"}
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              {/* Обновленный заголовок и метрика */}
              <span className="text-sm">Долговая нагрузка (Кредит + Аренда)</span>
              <span className="text-sm font-medium">{fixedCostRatio.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, fixedCostRatio)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {/* Новые лимиты риска с учетом аренды */}
              {fixedCostRatio <= 40 ? "Комфортный уровень" : fixedCostRatio <= 60 ? "Умеренная нагрузка" : monthlyIncome > 0 ? "Высокий риск (>60%)" : "Нет данных о доходах"}
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
          id: credit.id!,
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
    const savingsDeposits = deposits.filter(d =>
      d.isActive &&
      (d.type === "savings" || d.type === "fixed" || d.type === "investment" || d.type === "spending")
    );

    return (
      <ProgressCard
        title="Прогресс по накоплениям"
        icon={Heart}
        items={savingsDeposits.length > 0 ? savingsDeposits.map(deposit => ({
          id: deposit.id!,
          name: deposit.title,
          current: deposit.currentBalance,
          target: deposit.amount > deposit.currentBalance ? deposit.amount : deposit.currentBalance * 1.1,
          color: "bg-green-500",
          deadline: deposit.endDate ? new Date(deposit.endDate).toLocaleDateString('ru-RU') : 'Нет даты',
          type: "goal"
        })) : []}
        emptyMessage="Нет активных депозитов"
      />
    );
  });

  const UpcomingPayments = () => {
    const now = new Date();

    // 1. Подготовка кредитов
    const upcomingCredits = credits
      .filter(c => c.status === "active")
      .map(credit => {
        const startDate = new Date(credit.startDate);
        const paymentDay = startDate.getDate();
        let nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), paymentDay);
        if (nextPaymentDate < now) {
          nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
        }

        return {
          id: credit.id || credit._id,
          name: credit.name,
          amount: credit.monthlyPayment,
          date: nextPaymentDate,
          type: "credit" as const,
          urgent: false
        };
      });

    // 2. Подготовка аренды
    const upcomingRent = rentProperties
      .filter(r => r.status === 'active')
      .map(property => {
        const startDate = new Date(property.startDate);
        const paymentDay = startDate.getDate(); 

        let nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), paymentDay);
        if (nextPaymentDate < now) {
          nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
        }

        return {
          id: property._id,
          name: `Аренда: ${property.address}`,
          amount: property.rentAmount,
          date: nextPaymentDate,
          type: "rent" as const,
          urgent: false
        };
      });

    // 3. Объединяем, сортируем и обрезаем
    const allPayments = [...upcomingCredits, ...upcomingRent]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Ближайшие платежи (прогноз)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allPayments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Нет запланированных платежей</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPayments.map((payment, index) => {
                const getIcon = (type: string) => {
                  switch (type) {
                    case "credit": return <CreditCard className="w-4 h-4 text-red-500 dark:text-red-400" />;
                    case "rent": return <Building className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
                    default: return <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
                  }
                };

                return (
                  <div key={`${payment.id}-${index}`} className={`flex items-center justify-between p-3 rounded-lg transition-colors bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800`}>
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
      acc[category] += Number(income.amount);
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
            Источники доходов (месяц)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {incomeStreams.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Нет доходов за текущий месяц</p>
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Загрузка данных...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <KPICards />
      <FinancialHealthMetrics />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreditOverview />
        <DepositsProgress />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingPayments />
        <IncomeBreakdown />
      </div>

      {deposits.length === 0 && incomes.length === 0 && credits.length === 0 && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg mb-2">Добро пожаловать!</h3>
            <p className="text-muted-foreground mb-4">
              База данных пуста. Начните с добавления данных в соответствующих разделах.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default Dashboard;