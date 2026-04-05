import { useEffect, useMemo, useState } from "react";
import { MOBILE_MAIN_NAV, NAV_GROUPS, type AdminNavGroup } from "./constants";

interface AdminBottomNavProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  currentUserPermissions: string[] | null;
}

function getMainNavFromActive(activeNav: string): (typeof MOBILE_MAIN_NAV)[number]["id"] {
  if (activeNav === "dashboard") return "dashboard";

  const group = NAV_GROUPS.find((navGroup) =>
    navGroup.items.some((item) => item.id === activeNav)
  );

  const main = MOBILE_MAIN_NAV.find((item) => item.groupTitle === group?.title);
  return main?.id || "dashboard";
}

export default function AdminBottomNav({
  activeNav,
  setActiveNav,
  currentUserPermissions,
}: AdminBottomNavProps) {
  const [activeMain, setActiveMain] = useState<(typeof MOBILE_MAIN_NAV)[number]["id"]>(
    getMainNavFromActive(activeNav)
  );

  useEffect(() => {
    setActiveMain(getMainNavFromActive(activeNav));
  }, [activeNav]);

  const visibleGroups = useMemo<AdminNavGroup[]>(() => {
    return NAV_GROUPS.map((group) => {
      const items = group.items.filter(
        (item) => currentUserPermissions === null || currentUserPermissions.includes(item.id)
      );
      return { ...group, items };
    });
  }, [currentUserPermissions]);

  const activeMainConfig = MOBILE_MAIN_NAV.find((item) => item.id === activeMain);
  const activeGroup = visibleGroups.find((group) => group.title === activeMainConfig?.groupTitle);
  const activeSubItems = activeGroup?.items || [];

  const handleMainClick = (mainId: (typeof MOBILE_MAIN_NAV)[number]["id"]) => {
    setActiveMain(mainId);

    const selectedMain = MOBILE_MAIN_NAV.find((item) => item.id === mainId);
    if (!selectedMain) return;

    if (!selectedMain.groupTitle) {
      setActiveNav("dashboard");
      return;
    }

    const targetGroup = visibleGroups.find((group) => group.title === selectedMain.groupTitle);
    const firstItem = targetGroup?.items[0];

    if (firstItem) {
      setActiveNav(firstItem.id);
    }
  };

  return (
    <>
      {activeSubItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border-light bg-card-light/95 px-3 py-2 backdrop-blur md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {activeSubItems.map((item) => {
              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-light bg-background-light text-text-secondary-light"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border-light bg-card-light md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_MAIN_NAV.map((item) => {
            const isActive = activeMain === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMainClick(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-text-secondary-light"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
