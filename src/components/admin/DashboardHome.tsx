import { DashboardStats, CategoryStat } from "./constants";

export default function DashboardHome() {
  const stats: DashboardStats[] = [
    { label: "總銷售額", value: "$125,430.50", change: "+2.5% 較上月", changeType: "positive" },
    { label: "新訂單", value: "82", change: "+5.1% 較上月", changeType: "positive" },
    { label: "會員成長", value: "15", change: "-1.2% 較上月", changeType: "negative" },
  ];

  const categoryStats: CategoryStat[] = [
    { name: "韓國美妝", percentage: 80 },
    { name: "日本零食", percentage: 60 },
    { name: "泰國裝飾", percentage: 50 },
    { name: "服飾", percentage: 40 },
    { name: "電子產品", percentage: 20 },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex flex-col gap-2 rounded-xl border border-border-light bg-card-light p-6">
            <p className="text-base font-medium text-text-secondary-light">{stat.label}</p>
            <p className="text-3xl font-bold tracking-tight text-text-primary-light">{stat.value}</p>
            <p className={`text-base font-medium ${stat.changeType === "positive" ? "text-success" : "text-danger"}`}>
              {stat.changeType === "positive" ? "+" : ""}{stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Sales Chart */}
        <div className="flex flex-col gap-2 rounded-xl border border-border-light bg-card-light p-6 lg:col-span-3">
          <p className="text-lg font-medium text-text-primary-light">銷售趨勢</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold tracking-tight text-text-primary-light">$8,492</p>
            <p className="text-base font-medium text-success">+12.8%</p>
          </div>
          <p className="text-base text-text-secondary-light">最近 30 天</p>
          <div className="mt-4 flex h-64 w-full flex-col">
            <svg fill="none" preserveAspectRatio="none" viewBox="0 0 478 150" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H0V109Z" fill="url(#paint0_linear_chart)"></path>
              <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25" stroke="#3182CE" strokeLinecap="round" strokeWidth="3"></path>
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_chart" x1="236" x2="236" y1="1" y2="149">
                  <stop stopColor="#3182CE" stopOpacity="0.2"></stop>
                  <stop offset="1" stopColor="#3182CE" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Categories Chart */}
        <div className="flex flex-col gap-4 rounded-xl border border-border-light bg-card-light p-6 lg:col-span-2">
          <p className="text-lg font-medium text-text-primary-light">分類銷售排行</p>
          <div className="flex flex-col gap-4">
            {categoryStats.map((cat, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm font-medium text-text-secondary-light">
                  <span>{cat.name}</span>
                  <span>{cat.percentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-primary/20">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${cat.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
