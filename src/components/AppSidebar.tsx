import {Calendar,Home,User,CreditCard,Building,Wallet,BookOpen,PlusCircle,Zap,TrendingUp,PiggyBank,} from "lucide-react";
import { useAppContext, useAppActions } from "../contexts/AppContext"; // Импортируем контекст
import {Sidebar,SidebarContent,SidebarGroup,SidebarGroupContent,SidebarGroupLabel,SidebarMenu,SidebarMenuButton,SidebarMenuItem,} from "./ui/sidebar";

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
];

interface AppSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  // Получаем состояние и действия
  const { state } = useAppContext();
  const { setGlobalLoading } = useAppActions(); // Достаем экшен установки загрузки
  const isLoading = state.globalLoading;

  const isActive = (url: string) => currentView === url.substring(1);

  // Функция обработки навигации
  const handleNavigation = (url: string) => {
    const targetView = url.substring(1);
    
    // Блокируем, если уже идет загрузка или мы уже на этой странице
    if (isLoading || currentView === targetView) return;

    // 1. Мгновенно включаем глобальный лоадер
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
                    disabled={isLoading} // Блокируем кнопку визуально
                    onClick={(e) => {
                      e.preventDefault(); // Предотвращаем стандартное поведение ссылки
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
                    disabled={isLoading} // Блокируем кнопку визуально
                    onClick={(e) => {
                      e.preventDefault(); // Предотвращаем стандартное поведение ссылки
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