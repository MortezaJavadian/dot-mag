import { getAdminUser } from "@/lib/auth";
import { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { logoutAction } from "@/app/actions/authActions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const adminUser = await getAdminUser();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {adminUser && (
        <div className="bg-white dark:bg-slate-900 border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
