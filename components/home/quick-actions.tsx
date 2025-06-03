import Link from "next/link"
import { FileSpreadsheet, Target, ClipboardList, Building } from "lucide-react"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  const actions = [
    {
      icon: <Target className="h-5 w-5" />,
      label: "New Tracker",
      href: "/trackers/new",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    },
    {
      icon: <FileSpreadsheet className="h-5 w-5" />,
      label: "New Sheet",
      href: "/sheets/new",
      color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      label: "Reserve Item",
      href: "/reserve-tracker",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    },
    {
      icon: <Building className="h-5 w-5" />,
      label: "New Site",
      href: "/sites/new",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => (
        <Button
          key={action.href}
          asChild
          variant="outline"
          className="flex h-24 flex-col items-center justify-center gap-2 p-2"
        >
          <Link href={action.href}>
            <div className={`rounded-full p-2 ${action.color}`}>{action.icon}</div>
            <span className="text-xs font-medium">{action.label}</span>
          </Link>
        </Button>
      ))}
    </div>
  )
}
