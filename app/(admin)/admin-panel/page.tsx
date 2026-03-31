import { getAdminUser } from "@/lib/auth";
import LoginForm from "./_components/LoginForm";
import Dashboard from "./_components/Dashboard";

export const metadata = {
  title: "Admin Panel",
  robots: "noindex, nofollow",
};

export default async function PanelAdminPage() {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return <LoginForm />;
  }

  return <Dashboard />;
}
