import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

interface ProgressItem {
  id: string;
  name: string;
  current: number;
  target: number;
  color: string;
  monthlyPayment?: number;
  deadline?: string;
  type?: "credit" | "goal" | "general" | "info";
  showProgress?: boolean; // Новый флаг для управления отображением прогресс-бара
}

interface ProgressCardProps {
  title: string;
  icon?: LucideIcon;
  items: ProgressItem[];
  currency?: string;
  showPercentage?: boolean;
  emptyMessage?: string;
}

export function ProgressCard({ 
  title, 
  icon: Icon, 
  items, 
  currency = "₸",
  showPercentage = true,
  emptyMessage = "Нет данных для отображения"
}: ProgressCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8">
            {Icon && <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />}
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          items.map((item) => {
          const progressPercentage = (item.current / item.target) * 100;
          const isCredit = item.type === "credit";
          const isGoal = item.type === "goal";
          const shouldShowProgress = item.showProgress !== false; // По умолчанию true
          
          return (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.deadline && (
                      <p className="text-xs text-muted-foreground">{item.deadline}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {item.current.toLocaleString("kk-KZ")} {currency}
                  </p>
                  {item.monthlyPayment ? (
                    <p className="text-xs text-muted-foreground">
                      {item.monthlyPayment.toLocaleString("kk-KZ")} {currency}/мес
                    </p>
                  ) : shouldShowProgress && item.target > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      из {item.target.toLocaleString("kk-KZ")} {currency}
                    </p>
                  ) : null}
                </div>
              </div>
              
              {/* Прогресс-бар отображается только если shouldShowProgress === true */}
              {shouldShowProgress && (
                <>
                  <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
                  {showPercentage && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {isCredit ? (
                        <>
                          <span>Выплачено {progressPercentage.toFixed(1)}%</span>
                          <span>Осталось {(100 - progressPercentage).toFixed(1)}%</span>
                        </>
                      ) : (
                        <>
                          <span>{progressPercentage.toFixed(1)}% {isGoal ? "достигнуто" : "выполнено"}</span>
                          <span>Осталось {(item.target - item.current).toLocaleString("kk-KZ")} {currency}</span>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
        )}
      </CardContent>
    </Card>
  );
}