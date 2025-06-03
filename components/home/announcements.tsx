import { Info, AlertTriangle } from "lucide-react"

export function Announcements() {
  // In a real app, you would fetch announcements from an API
  const announcements = [
    {
      id: 1,
      title: "Welcome to the new home page!",
      content: "We've redesigned the home page to provide better navigation and quick access to important information.",
      type: "info",
      date: "2023-05-01",
    },
    {
      id: 2,
      title: "Scheduled maintenance",
      content: "The system will be undergoing maintenance on Saturday, May 15th from 2:00 AM to 4:00 AM UTC.",
      type: "warning",
      date: "2023-05-10",
    },
  ]

  if (announcements.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">No announcements at this time</div>
    )
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={`rounded-md border p-4 ${
            announcement.type === "warning" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            {announcement.type === "warning" ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <Info className="h-4 w-4 text-blue-500" />
            )}
            <h3 className="font-medium">{announcement.title}</h3>
          </div>
          <p className="text-sm">{announcement.content}</p>
          <div className="mt-2 text-xs text-muted-foreground">
            Posted on {new Date(announcement.date).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}
