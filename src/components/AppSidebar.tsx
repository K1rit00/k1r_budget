import React from "react"; // 1. Добавлен импорт React для типов
import {
  Calendar,
  Home,
  User,
  CreditCard,
  Building,
  Wallet,
  BookOpen,
  PlusCircle,
  Zap,
  TrendingUp,
  PiggyBank,
  HandCoins,
} from "lucide-react";
import { useAppContext, useAppActions } from "../contexts/AppContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

const mainItems = [
  {
    title: "Главная",
    url: "#dashboard",
    icon: Home,
  },
  {
    title: "Быстрые расходы",
    url: "#quick-expenses",
    icon: PlusCircle,
  },
  {
    title: "Календарь платежей",
    url: "#calendar",
    icon: Calendar,
  },
];

const managementItems = [
  {
    title: "Профиль",
    url: "#profile",
    icon: User,
  },
  {
    title: "Справочники",
    url: "#references",
    icon: BookOpen,
  },
  {
    title: "Доходы",
    url: "#income",
    icon: TrendingUp,
  },
  {
    title: "Кредиты / Рассрочки",
    url: "#credits",
    icon: CreditCard,
  },
  {
    title: "Аренда жилья",
    url: "#rent",
    icon: Building,
  },
  {
    title: "Коммунальные платежи",
    url: "#utilities",
    icon: Zap,
  },
  {
    title: "Ежемесячные траты",
    url: "#monthly",
    icon: Wallet,
  },
  {
    title: "Депозиты",
    url: "#deposits",
    icon: PiggyBank,
  },
  {
    title: "Долги",
    url: "#debts",
    icon: HandCoins,
  },
];

interface AppSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const { state } = useAppContext();
  const { setGlobalLoading } = useAppActions();
  const isLoading = state.globalLoading;

  // Получаем состояние мобильного устройства и функцию управления меню
  const { isMobile, setOpenMobile } = useSidebar();

  const isActive = (url: string) => currentView === url.substring(1);

  const handleNavigation = (url: string) => {
    const targetView = url.substring(1);

    // Если это мобильное устройство, закрываем меню сразу при клике
    if (isMobile) {
      setOpenMobile(false);
    }
    
    // Блокируем, если уже идет загрузка или мы уже на этой странице
    if (isLoading || currentView === targetView) return;

    // Мгновенно включаем глобальный лоадер
    setGlobalLoading(true);
    onViewChange(targetView);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-6 text-lg">
            Система учёта бюджета
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    disabled={isLoading}
                    // 2. Исправлен тип события e
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      handleNavigation(item.url);
                    }}
                    className={isLoading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
                  >
                    <a href={item.url} className="flex items-center gap-3 px-4 py-3 w-full text-left">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3">
            Управление
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    disabled={isLoading}
                    // 3. Исправлен тип события e
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      handleNavigation(item.url);
                    }}
                    className={isLoading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
                  >
                    <a href={item.url} className="flex items-center gap-3 px-4 py-3 w-full text-left">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}