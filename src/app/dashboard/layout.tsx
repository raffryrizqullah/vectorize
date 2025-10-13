"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bars3Icon,
  BellIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  XMarkIcon,
  CubeTransparentIcon,
  HeartIcon,
  KeyIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  ChevronDownIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon as CogSolidIcon,
} from "@heroicons/react/20/solid";
import { UserCircleIcon as UserCircleSolidIcon } from "@heroicons/react/24/solid";
import { clearToken, getToken, meRequest } from "@/lib/api";
import ChatWidget from "@/components/chat/Widget";

type NavItem = {
  name: string;
  href: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Health Check", href: "/dashboard/health-check", icon: HeartIcon },
  { name: "Vectorize", href: "/dashboard/vectorize", icon: DocumentDuplicateIcon },
  { name: "Authentication", href: "/dashboard/authentication", icon: UsersIcon },
  { name: "API Key", href: "/dashboard/api-key", icon: KeyIcon },
  { name: "Chat History", href: "/dashboard/chat-history", icon: ClockIcon },
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const isActive = (href: string) => pathname === href;

  // Guard: verify token and ensure admin role, then load user
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    meRequest(token)
      .then((u) => {
        const role = u?.role || u?.user?.role;
        if (role !== "admin") {
          clearToken();
          router.replace("/login");
          return;
        }
        setUserName(u?.username || u?.full_name || u?.user?.username || u?.user?.full_name || null);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      })
      .finally(() => setAuthChecked(true));
  }, [router]);

  if (!authChecked) {
    return null; // optional: skeleton/loader can be added here
  }

  return (
    <div>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900/80"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative ml-0 flex w-full max-w-xs flex-1 bg-primary px-6 pb-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 rounded p-2 text-white/90 hover:bg-white/10"
              aria-label="Close sidebar"
            >
              <XMarkIcon aria-hidden className="size-6" />
            </button>
            <div className="mt-12 flex w-full flex-col gap-y-5 overflow-y-auto">
              <div className="flex h-16 shrink-0 items-center">
                <Link href="/dashboard" className="inline-block" onClick={() => setSidebarOpen(false)}>
                  <span className="sr-only">Dashboard</span>
                  <CubeTransparentIcon aria-hidden className="h-8 w-8 text-white" />
                </Link>
              </div>
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={classNames(
                              isActive(item.href)
                                ? "bg-primary text-white"
                                : "text-white hover:bg-white/10",
                              "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                            )}
                          >
                            <item.icon
                              className={classNames(
                                isActive(item.href) ? "text-white" : "text-white",
                                "size-6 shrink-0",
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="mt-auto">
                    <Link
                      href="/dashboard/settings"
                      className={classNames(
                        isActive("/dashboard/settings")
                          ? "bg-primary text-white"
                          : "text-white hover:bg-white/10",
                        "group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                      )}
                    >
                      <Cog6ToothIcon className={classNames(
                        isActive("/dashboard/settings") ? "text-white" : "text-white",
                        "size-6 shrink-0",
                      )} aria-hidden="true" />
                      Settings
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/dashboard" className="inline-block">
              <span className="sr-only">Dashboard</span>
              <CubeTransparentIcon aria-hidden className="h-8 w-8 text-white" />
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                      className={classNames(
                        isActive(item.href)
                          ? "bg-primary text-white"
                          : "text-white hover:bg-white/10",
                        "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                      )}
                      >
                        <item.icon
                          className={classNames(
                            isActive(item.href) ? "text-white" : "text-white",
                            "size-6 shrink-0",
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <Link
                  href="/dashboard/settings"
                  className={classNames(
                    isActive("/dashboard/settings")
                      ? "bg-primary text-white"
                      : "text-white hover:bg-white/10",
                    "group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                  )}
                >
                  <Cog6ToothIcon className={classNames(
                    isActive("/dashboard/settings") ? "text-white" : "text-white",
                    "size-6 shrink-0",
                  )} aria-hidden="true" />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main area */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-background px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            aria-label="Open sidebar"
          >
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>

          <div aria-hidden className="h-6 w-px bg-gray-900/10 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <form action="#" method="GET" className="grid flex-1 grid-cols-1">
              <input
                name="search"
                type="search"
                placeholder="Search"
                aria-label="Search"
                className="col-start-1 row-start-1 block size-full pl-8 text-base text-gray-900 outline-hidden placeholder:text-gray-400 sm:text-sm/6"
              />
              <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400" />
            </form>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
                <span className="sr-only">View notifications</span>
                <BellIcon aria-hidden="true" className="size-6" />
              </button>

              <div aria-hidden className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" />

              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserCircleSolidIcon className="size-6" />
                  </span>
                  <span className="hidden lg:block text-sm/6 font-semibold text-gray-900">{userName ?? "User"}</span>
                  <ChevronDownIcon aria-hidden className="hidden lg:block size-5 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-10 mt-2.5 w-44 origin-top-right rounded-md bg-white py-2 ring-1 shadow-lg ring-gray-900/5"
                  >
                    <button
                      className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        router.push("/dashboard/profile");
                      }}
                      role="menuitem"
                    >
                      <UserIcon aria-hidden className="mr-3 size-5 text-gray-400" />
                      Your profile
                    </button>
                    <button
                      className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        router.push("/dashboard/settings");
                      }}
                      role="menuitem"
                    >
                      <CogSolidIcon aria-hidden className="mr-3 size-5 text-gray-400" />
                      Settings
                    </button>
                    <button
                      className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        clearToken();
                        router.push("/login");
                      }}
                      role="menuitem"
                    >
                      <ArrowRightOnRectangleIcon aria-hidden className="mr-3 size-5 text-gray-400" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Chat widget only for dashboard area */}
      <ChatWidget />
    </div>
  );
}
