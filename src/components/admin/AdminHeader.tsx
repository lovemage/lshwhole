export default function AdminHeader() {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light px-10 py-4 sticky top-0 z-10 bg-card-light">
      <label className="relative flex items-center min-w-40 h-10! max-w-sm">
        <span className="material-symbols-outlined absolute left-3 text-text-secondary-light">
          search
        </span>
        <input
          type="text"
          placeholder="搜尋..."
          className="form-input h-full w-full rounded-lg border border-border-light bg-background-light px-10 text-base text-text-primary-light placeholder:text-text-secondary-light focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </label>
      <div className="flex items-center gap-4">
        <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary-light hover:bg-primary/10 hover:text-primary">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary-light hover:bg-primary/10 hover:text-primary">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
          style={{ backgroundColor: "#E2E8F0" }}
        ></div>
      </div>
    </header>
  );
}
