import Link from "next/link";
import { useState, useEffect } from "react";
import { NAV_GROUPS } from "./constants";

interface AdminSidebarProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  currentUserPermissions: string[] | null;
}

export default function AdminSidebar({
  activeNav,
  setActiveNav,
  currentUserPermissions,
}: AdminSidebarProps) {
  const [notifications, setNotifications] = useState<{ [key: string]: number }>({});
  // Initialize expanded groups with the one containing activeNav, or first group
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    // Auto expand group containing active item
    const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.id === activeNav));
    if (activeGroup) {
      setExpandedGroups(prev => {
        if (!prev.includes(activeGroup.title)) {
          return [...prev, activeGroup.title];
        }
        return prev;
      });
    }
  }, [activeNav]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/admin/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (e) {
        console.error("Failed to fetch notifications:", e);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, []);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <aside className="flex w-64 flex-col bg-sidebar-dark text-text-primary-dark p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-3 p-4">
        <div className="size-8 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <h2 className="text-xl font-bold">LshWholesale</h2>
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <nav className="flex flex-col gap-2 mt-6">
          {/* Dashboard Standalone */}
          <button
            onClick={() => setActiveNav("dashboard")}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full ${
              activeNav === "dashboard"
                ? "bg-primary/20 text-primary"
                : "text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark"
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <p className="text-sm font-medium flex-1 text-left">儀表看板</p>
          </button>

          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(item => 
              currentUserPermissions === null || currentUserPermissions.includes(item.id)
            );
            
            if (visibleItems.length === 0) return null;

            const isExpanded = expandedGroups.includes(group.title);

            return (
              <div key={group.title} className="flex flex-col">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium text-text-secondary-dark hover:text-text-primary-dark transition-colors"
                >
                  <span>{group.title}</span>
                  <span
                    className={`material-symbols-outlined text-sm transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : "rotate-0"
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                <div
                  className={`ml-3 mb-2 overflow-hidden transition-all duration-200 ${
                    isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="flex flex-col gap-1 pl-2 border-l border-border-dark">
                    {visibleItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full ${
                          activeNav === item.id
                            ? "bg-primary/20 text-primary"
                            : "text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark"
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        <p className="text-sm font-medium flex-1 text-left">{item.label}</p>
                        {notifications[item.id] > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                            {notifications[item.id]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="flex flex-col gap-4 mt-4">
          <div className="h-px bg-border-dark"></div>
          <div className="flex items-center gap-3">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
              style={{ backgroundColor: "#718096" }}
            ></div>
            <div className="flex flex-col">
              <h1 className="text-base font-medium text-text-primary-dark">
                管理員
              </h1>
              <p className="text-sm text-text-secondary-dark">系統管理員</p>
            </div>
          </div>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark"
          >
            <span className="material-symbols-outlined">public</span>
            <p className="text-sm font-medium">返回網站</p>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark"
          >
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium">登出</p>
          </Link>
        </div>
      </div>
    </aside>
  );
}
