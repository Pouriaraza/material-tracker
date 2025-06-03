import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  Home,
  LayoutDashboard,
  FileSpreadsheet,
  Target,
  ClipboardList,
  Settings,
  Building,
  UserCircle,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function NavigationPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // For now, we'll consider any user with email pouria.raz@mtnirancell.ir as an admin
  const isAdmin = session?.user?.email === "pouria.raz@mtnirancell.ir"

  const navItems = [
    {
      title: "Main Navigation",
      items: [
        { href: "/", label: "Home", icon: <Home className="h-5 w-5" />, description: "Return to the home page" },
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
          description: "View your dashboard",
        },
      ],
    },
    {
      title: "Sheets",
      items: [
        {
          href: "/sheets",
          label: "All Sheets",
          icon: <FileSpreadsheet className="h-5 w-5" />,
          description: "View all your sheets",
        },
        {
          href: "/sheets/new",
          label: "New Sheet",
          icon: <Plus className="h-5 w-5 mr-1" />,
          secondIcon: <FileSpreadsheet className="h-5 w-5" />,
          description: "Create a new sheet",
        },
      ],
    },
    {
      title: "Trackers",
      items: [
        {
          href: "/trackers",
          label: "All Trackers",
          icon: <Target className="h-5 w-5" />,
          description: "View all your trackers",
        },
        {
          href: "/trackers/new",
          label: "New Tracker",
          icon: <Plus className="h-5 w-5 mr-1" />,
          secondIcon: <Target className="h-5 w-5" />,
          description: "Create a new tracker",
        },
        {
          href: "/reserve-tracker",
          label: "Reserve Tracker",
          icon: <ClipboardList className="h-5 w-5" />,
          description: "Access the reserve tracker",
        },
      ],
    },
    {
      title: "Sites",
      items: [
        {
          href: "/sites",
          label: "All Sites",
          icon: <Building className="h-5 w-5" />,
          description: "Manage all sites",
        },
        {
          href: "/sites/new",
          label: "New Sites",
          icon: <Building className="h-5 w-5" />,
          description: "Manage new site deployments",
        },
        {
          href: "/sites/modernization",
          label: "Modernization",
          icon: <Building className="h-5 w-5" />,
          description: "Manage site modernization",
        },
        {
          href: "/sites/relocation",
          label: "Relocation",
          icon: <Building className="h-5 w-5" />,
          description: "Manage site relocation",
        },
      ],
    },
    {
      title: "User",
      items: [
        {
          href: "/profile",
          label: "Profile",
          icon: <UserCircle className="h-5 w-5" />,
          description: "View and edit your profile",
        },
      ],
    },
  ]

  // Add admin section if user is admin
  if (isAdmin) {
    navItems.push({
      title: "Admin",
      items: [
        {
          href: "/admin",
          label: "Admin Dashboard",
          icon: <Settings className="h-5 w-5" />,
          description: "Access the admin dashboard",
        },
        {
          href: "/admin/users",
          label: "User Management",
          icon: <Settings className="h-5 w-5" />,
          description: "Manage users",
        },
      ],
    })
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-8">Navigation</h1>

      <div className="space-y-8">
        {navItems.map((section) => (
          <div key={section.title}>
            <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <Card key={item.href}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {item.icon}
                      {item.secondIcon}
                      <CardTitle>{item.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={item.href}>Go to {item.label}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
