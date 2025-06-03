import { getReserveItems } from "@/lib/db-reserve"
import { ReserveTrackerClient } from "./reserve-tracker-client"

export async function ReserveTracker() {
  const items = await getReserveItems()

  return <ReserveTrackerClient initialItems={items} />
}
