export function LogoutButton() {
  return (
    <form action="/logout" method="post" className="w-full">
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-brand-white/88 transition-colors duration-200 hover:bg-white/10"
      >
        <span className="text-lg">↗</span>
        <span className="font-medium">Log out</span>
      </button>
    </form>
  );
}
