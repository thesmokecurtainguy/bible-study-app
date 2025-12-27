"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavbarProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: string;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-blue-600">
                Bible Study App
              </span>
            </Link>
            <div className="hidden space-x-4 md:flex">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/studies"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                My Studies
              </Link>
              <Link
                href="/prayers"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Prayers
              </Link>
              {user.role === "admin" && (
                <>
                  <Link
                    href="/admin/studies"
                    className="rounded-md px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                  >
                    Manage Studies
                  </Link>
                  <Link
                    href="/admin/upload"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    Upload
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-3 rounded-full p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <span className="text-xs font-medium">{userInitials}</span>
                )}
              </div>
              <span className="hidden text-gray-700 md:block">
                {user.name || user.email}
              </span>
              <svg
                className={`h-5 w-5 text-gray-500 transition-transform ${
                  isMenuOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="border-b border-gray-200 px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name || "User"}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Settings
                </Link>
                {user.role === "admin" && (
                  <>
                    <div className="border-t border-gray-200 my-1" />
                    <Link
                      href="/admin/studies"
                      className="block px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Manage Studies
                    </Link>
                    <Link
                      href="/admin/upload"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Upload Study
                    </Link>
                  </>
                )}
                <button
                  onClick={handleSignOut}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="border-t border-gray-200 md:hidden">
        <div className="space-y-1 px-2 pb-3 pt-2">
          <Link
            href="/dashboard"
            className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            href="/studies"
            className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            My Studies
          </Link>
          <Link
            href="/prayers"
            className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Prayers
          </Link>
          {user.role === "admin" && (
            <>
              <Link
                href="/admin/studies"
                className="block rounded-md px-3 py-2 text-base font-medium text-amber-600 hover:bg-amber-50 hover:text-amber-700"
              >
                Manage Studies
              </Link>
              <Link
                href="/admin/upload"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                Upload Study
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}


