"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileSpreadsheet,
  Target,
  ClipboardList,
  Building,
  Settings,
  UserCircle,
  Users,
  BarChart3,
  Shield,
} from "lucide-react"

interface HomeNavigationProps {
  isAdmin: boolean
}

export function HomeNavigation({ isAdmin }: HomeNavigationProps) {
  const pathname = usePathname()

  const mainNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      description: "View your analytics and reports",
    },
    {
      title: "Sheets",
      href: "/sheets",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      description: "Manage your spreadsheets",
    },
    {
      title: "Trackers",
      href: "/trackers",
      icon: <Target className="h-5 w-5" />,
      description: "Track your goals and metrics",
    },
    {
      title: "Reserve Tracker",
      href: "/reserve-tracker",
      icon: <ClipboardList className="h-5 w-5" />,
      description: "Manage your inventory",
    },
    {
      title: "Sites",
      href: "/sites",
      icon: <Building className="h-5 w-5" />,
      description: "View and manage locations",
    },
    {
      title: "Profile",
      href: "/profile",
      icon: <UserCircle className="h-5 w-5" />,
      description: "Update your account settings",
    },
  ]

  const adminNavItems = [
    {
      title: "Admin Dashboard",
      href: "/admin",
      icon: <Settings className="h-5 w-5" />,
      description: "Admin control panel",
    },
    {
      title: "User Management",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      description: "Manage system users",
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      description: "System usage statistics",
    },
    {
      title: "Roles & Permissions",
      href: "/admin/roles",
      icon: <Shield className="h-5 w-5" />,
      description: "Manage user roles",
    },
  ]

  return (
    <div className="flex flex-col">
      <div className="space-y-1 px-3 py-2">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md border bg-background">
              {item.icon}
            </span>
            <div className="flex flex-col">
              <span className="font-medium leading-none">{item.title}</span>
              <span className="hidden text-xs text-muted-foreground md:inline-block">{item.description}</span>
            </div>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <>
          <div className="my-2 px-6">
            <div className="h-[1px] w-full bg-border" />
          </div>
          <div className="space-y-1 px-3 py-2">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Admin</div>
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md border bg-background">
                  {item.icon}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium leading-none">{item.title}</span>
                  <span className="hidden text-xs text-muted-foreground md:inline-block">{item.description}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
