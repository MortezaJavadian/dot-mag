"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        router.push("/panel-admin");
        router.refresh();
      } else {
        setError(result.error || "ورود ناموفق بود");
      }
    } catch (err) {
      setError("خطایی رخ داد");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-center">پنل ادمین</h1>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
          برای مدیریت محتوا وارد شوید
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">نام کاربری</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="نام کاربری را وارد کنید"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="رمز عبور را وارد کنید"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-6">
            {loading ? "در حال ورود..." : "ورود"}
          </Button>
        </form>
      </div>
    </div>
  );
}
