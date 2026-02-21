"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-8">
          <div className="mb-4 text-9xl font-bold text-zinc-300 dark:text-zinc-700">
            404
          </div>
          <div className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Page Not Found
          </div>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            Sorry, we could not find the page you are looking for.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
          <h3 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Possible Causes
          </h3>
          <ul className="mx-auto max-w-md space-y-2 text-left text-zinc-600 dark:text-zinc-400">
            <li>- The page may have been moved or deleted</li>
            <li>- There might be a typo in the URL</li>
            <li>- You may not have permission to view this page</li>
          </ul>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-zinc-200 px-6 py-3 font-medium text-zinc-800 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Go Back
          </button>
          <Link
            href="/"
            className="rounded-lg bg-[#089ec3] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0ab8d4]"
          >
            Home
          </Link>
          <button
            onClick={() => router.refresh()}
            className="rounded-lg bg-zinc-200 px-6 py-3 font-medium text-zinc-800 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
