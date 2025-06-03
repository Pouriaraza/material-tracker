"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Settings,
  Target,
  ClipboardList,
  Users,
  BarChart3,
  Shield,
  ActivitySquare,
  Menu,
  X,
  UserCircle,
  Building,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MenuItem {
  title: string
  href?: string
  icon?: React.ReactNode
  submenu?: MenuItem[]
  isAdmin?: boolean
}

interface SidebarMenuProps {
  isAdmin: boolean
}

export function SidebarMenu({ isAdmin }: SidebarMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const pathname = usePathname()

  const menuItems: MenuItem[] = [
    {
      title: "Home",
      href: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Sheets",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      submenu: [
        {
          title: "All Sheets",
          href: "/sheets",
        },
        {
          title: "New Sheet",
          href: "/sheets/new",
        },
      ],
    },
    {
      title: "Trackers",
      icon: <Target className="h-5 w-5" />,
      submenu: [
        {
          title: "All Trackers",
          href: "/trackers",
        },
        {
          title: "New Tracker",
          href: "/trackers/new",
        },
      ],
    },
    {
      title: "Reserve Tracker",
      href: "/reserve-tracker",
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      title: "Sites",
      href: "/sites",
      icon: <Building className="h-5 w-5" />,
    },
    {
      title: "Material",
      href: "/material",
      icon: <Package className="h-5 w-5" />,
    },
    {
      title: "Profile",
      href: "/profile",
      icon: <UserCircle className="h-5 w-5" />,
    },
    {
      title: "Admin",
      icon: <Settings className="h-5 w-5" />,
      isAdmin: true,
      submenu: [
        {
          title: "Dashboard",
          href: "/admin",
        },
        {
          title: "User Management",
          href: "/admin/users",
          icon: <Users className="h-5 w-5" />,
        },
        {
          title: "Analytics",
          href: "/admin/analytics",
          icon: <BarChart3 className="h-5 w-5" />,
        },
        {
          title: "System Settings",
          href: "/admin/settings",
          icon: <Settings className="h-5 w-5" />,
        },
        {
          title: "Activity Logs",
          href: "/admin/logs",
          icon: <ActivitySquare className="h-5 w-5" />,
        },
        {
          title: "Roles & Permissions",
          href: "/admin/roles",
          icon: <Shield className="h-5 w-5" />,
        },
      ],
    },
  ]

  const toggleSubmenu = (title: string) => {
    if (openSubmenu === title) {
      setOpenSubmenu(null)
    } else {
      setOpenSubmenu(title)
    }
  }

  const renderMenuItem = (item: MenuItem) => {
    // Skip admin items for non-admin users
    if (item.isAdmin && !isAdmin) {
      return null
    }

    const isActive = item.href ? pathname === item.href : false
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isSubmenuOpen = openSubmenu === item.title

    if (hasSubmenu) {
      return (
        <div key={item.title} className="space-y-1">
          <button
            onClick={() => toggleSubmenu(item.title)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              isSubmenuOpen ? "bg-accent/50" : "",
            )}
          >
            <div className="flex items-center">
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.title}
            </div>
            {isSubmenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {isSubmenuOpen && (
            <div className="ml-4 space-y-1 border-l pl-2">
              {item.submenu?.map((subItem) => (
                <Link
                  key={subItem.title}
                  href={subItem.href || "#"}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === subItem.href ? "bg-accent text-accent-foreground" : "transparent",
                  )}
                >
                  {subItem.icon && <span className="mr-2">{subItem.icon}</span>}
                  {subItem.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.title}
        href={item.href || "#"}
        className={cn(
          "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          isActive ? "bg-accent text-accent-foreground" : "transparent",
        )}
      >
        {item.icon && <span className="mr-2">{item.icon}</span>}
        {item.title}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(true)}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-full max-w-xs transform overflow-auto bg-background p-6 shadow-lg transition ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
        <ScrollArea className="my-4 h-[calc(100vh-8rem)]">
          <div className="space-y-1 py-2">{menuItems.map((item) => renderMenuItem(item))}</div>
        </ScrollArea>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden w-64 flex-shrink-0 border-r md:block">
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="space-y-1 p-4">{menuItems.map((item) => renderMenuItem(item))}</div>
        </ScrollArea>
      </div>
    </>
  )
}
