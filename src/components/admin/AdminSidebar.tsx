import Link from "next/link";
import { NAV_ITEMS } from "./constants";

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
  const filteredNavItems = NAV_ITEMS.filter(
    (item) =>
      currentUserPermissions === null || currentUserPermissions.includes(item.id)
  );

  return (
    <aside className="flex w-64 flex-col bg-sidebar-dark text-text-primary-dark p-4">
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
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeNav === item.id
                  ? "bg-primary/20 text-primary"
                  : "text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <p className="text-sm font-medium">{item.label}</p>
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-4">
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
