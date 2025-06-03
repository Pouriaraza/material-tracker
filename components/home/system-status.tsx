import { CheckCircle, Clock } from "lucide-react"

export function SystemStatus() {
  // In a real app, you would fetch this data from an API
  const services = [
    { name: "Database", status: "operational", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
    { name: "Storage", status: "operational", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
    { name: "Authentication", status: "operational", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
    { name: "API", status: "operational", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  ]

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <div key={service.name} className="flex items-center justify-between">
          <span className="text-sm">{service.name}</span>
          <div className="flex items-center gap-1">
            {service.icon}
            <span className="text-xs capitalize">{service.status}</span>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
        <span>Last checked:</span>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Just now</span>
        </div>
      </div>
    </div>
  )
}
