"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  LayoutDashboard,
  FileSpreadsheet,
  Target,
  ClipboardList,
  Settings,
  Menu,
  X,
  Building,
  UserCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SuperVisibleMenuProps {
  isAdmin: boolean
}

export function SuperVisibleMenu({ isAdmin }: SuperVisibleMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Home", icon: <Home className="h-6 w-6" /> },
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-6 w-6" /> },
    { href: "/sheets", label: "Sheets", icon: <FileSpreadsheet className="h-6 w-6" /> },
    { href: "/trackers", label: "Trackers", icon: <Target className="h-6 w-6" /> },
    { href: "/reserve-tracker", label: "Reserve Tracker", icon: <ClipboardList className="h-6 w-6" /> },
    { href: "/sites", label: "Sites", icon: <Building className="h-6 w-6" /> },
    { href: "/profile", label: "Profile", icon: <UserCircle className="h-6 w-6" /> },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: <Settings className="h-6 w-6" /> }] : []),
  ]

  return (
    <>
      {/* Super visible floating menu button */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="relative">
          <Button
            onClick={() => setIsOpen(!isOpen)}
            size="lg"
            className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg"
          >
            {isOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
          </Button>
          <span className="absolute -top-10 right-0 whitespace-nowrap rounded-md bg-background px-2 py-1 text-sm font-medium shadow-sm border">
            Menu is here!
          </span>
        </div>
      </div>

      {/* Full screen menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-background">
          <div className="flex h-full flex-col p-6">
            <div className="mb-8 flex items-center justify-between">
              <h1 className="text-2xl font-bold">Navigation Menu</h1>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg border p-4 text-lg font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span className="mr-4">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
