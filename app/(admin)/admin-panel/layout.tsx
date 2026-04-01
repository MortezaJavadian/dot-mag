import { getAdminUser } from "@/lib/auth";
import { ReactNode } from "react";
import { logoutAction } from "@/app/actions/authActions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const adminUser = await getAdminUser();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {adminUser && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <div className="container py-4">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold">پنل ادمین</h1>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition"
                >
                  خروج
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="container py-8 text-slate-900 dark:text-slate-100">
        <div className="max-w-6xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
