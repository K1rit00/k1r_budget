import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface KPICardProps {
  title: string;
  value: number | string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon: LucideIcon;
  customIcon?: LucideIcon;
  colorScheme: "green" | "blue" | "orange" | "purple" | "red";
}

export function KPICard({ 
  title, 
  value, 
  trend, 
  trendDirection = "neutral",
  icon: Icon, 
  customIcon,
  colorScheme 
}: KPICardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === "number") {
      return val.toLocaleString("kk-KZ") + " ₸";
    }
    return val;
  };

  const colorConfig = {
    green: {
      gradient: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800",
      title: "text-green-700 dark:text-green-400",
      value: "text-green-900 dark:text-green-100",
      trend: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-200 dark:bg-green-800/50",
      iconText: "text-green-700 dark:text-green-300"
    },
    blue: {
      gradient: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800",
      title: "text-blue-700 dark:text-blue-400",
      value: "text-blue-900 dark:text-blue-100",
      trend: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-200 dark:bg-blue-800/50",
      iconText: "text-blue-700 dark:text-blue-300"
    },
    orange: {
      gradient: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800",
      title: "text-orange-700 dark:text-orange-400",
      value: "text-orange-900 dark:text-orange-100",
      trend: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-200 dark:bg-orange-800/50",
      iconText: "text-orange-700 dark:text-orange-300"
    },
    purple: {
      gradient: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800",
      title: "text-purple-700 dark:text-purple-400",
      value: "text-purple-900 dark:text-purple-100",
      trend: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-200 dark:bg-purple-800/50",
      iconText: "text-purple-700 dark:text-purple-300"
    },
    red: {
      gradient: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800",
      title: "text-red-700 dark:text-red-400",
      value: "text-red-900 dark:text-red-100",
      trend: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-200 dark:bg-red-800/50",
      iconText: "text-red-700 dark:text-red-300"
    }
  };

  const colors = colorConfig[colorScheme];
  const TrendIcon = trendDirection === "up" ? ArrowUpRight : trendDirection === "down" ? ArrowDownRight : null;

  return (
    <Card className={`rounded-2xl ${colors.gradient}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm mb-1 ${colors.title}`}>{title}</p>
            <p className={`text-2xl ${colors.value}`}>{formatValue(value)}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {customIcon ? (
                  React.createElement(customIcon, { className: `w-3 h-3 ${colors.trend}` })
                ) : (
                  TrendIcon && <TrendIcon className={`w-3 h-3 ${colors.trend}`} />
                )}
                <span className={`text-xs ${colors.trend}`}>{trend}</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.iconBg}`}>
            <Icon className={`w-6 h-6 ${colors.iconText}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}