export interface TrackerLog {
  id: string
  date: string
  amount: number
  note: string
}

export interface Tracker {
  id: string
  title: string
  description: string
  type: "habit" | "goal"
  target: number
  unit: string
  startDate: string
  progress: number
  logs: TrackerLog[]
  createdAt: string
}
