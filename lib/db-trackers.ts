import { createClient } from "@/lib/supabase/server"
import type { Tracker, TrackerLog } from "@/types/tracker"

// Get all trackers for a user
export async function getUserTrackers(userId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("trackers")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching trackers:", error)
      return []
    }

    // If no trackers, return empty array
    if (!data || data.length === 0) {
      return []
    }

    // Get logs for all trackers
    const trackerIds = data.map((tracker) => tracker.id)

    const { data: logs, error: logsError } = await supabase
      .from("tracker_logs")
      .select("*")
      .in("tracker_id", trackerIds)
      .order("date", { ascending: false })

    if (logsError) {
      console.error("Error fetching tracker logs:", logsError)
      return data.map(mapDbTrackerToTracker)
    }

    // Group logs by tracker_id
    const logsByTrackerId: Record<string, TrackerLog[]> = {}
    if (logs) {
      logs.forEach((log) => {
        if (!logsByTrackerId[log.tracker_id]) {
          logsByTrackerId[log.tracker_id] = []
        }
        logsByTrackerId[log.tracker_id].push({
          id: log.id,
          date: log.date,
          amount: log.amount,
          note: log.note || "",
        })
      })
    }

    // Add logs to each tracker
    return data.map((tracker) => ({
      id: tracker.id,
      title: tracker.title,
      description: tracker.description || "",
      type: tracker.type as "habit" | "goal",
      target: tracker.target,
      unit: tracker.unit,
      startDate: tracker.start_date,
      progress: tracker.progress,
      logs: logsByTrackerId[tracker.id] || [],
      createdAt: tracker.created_at,
    }))
  } catch (error) {
    console.error("Error in getUserTrackers:", error)
    return []
  }
}

// Get a single tracker by ID
export async function getTrackerById(trackerId: string, userId: string) {
  try {
    const supabase = createClient()

    // Get tracker
    const { data: tracker, error } = await supabase
      .from("trackers")
      .select("*")
      .eq("id", trackerId)
      .eq("owner_id", userId)
      .single()

    if (error) {
      console.error("Error fetching tracker:", error)
      return null
    }

    // Get logs for this tracker
    const { data: logs, error: logsError } = await supabase
      .from("tracker_logs")
      .select("*")
      .eq("tracker_id", trackerId)
      .order("date", { ascending: false })

    if (logsError) {
      console.error("Error fetching tracker logs:", logsError)
      return mapDbTrackerToTracker(tracker)
    }

    // Map logs
    const trackerLogs: TrackerLog[] = logs
      ? logs.map((log) => ({
          id: log.id,
          date: log.date,
          amount: log.amount,
          note: log.note || "",
        }))
      : []

    // Return tracker with logs
    return {
      id: tracker.id,
      title: tracker.title,
      description: tracker.description || "",
      type: tracker.type as "habit" | "goal",
      target: tracker.target,
      unit: tracker.unit,
      startDate: tracker.start_date,
      progress: tracker.progress,
      logs: trackerLogs,
      createdAt: tracker.created_at,
    }
  } catch (error) {
    console.error("Error in getTrackerById:", error)
    return null
  }
}

// Create a new tracker
export async function createTracker(tracker: Omit<Tracker, "id" | "logs" | "createdAt">, userId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("trackers")
      .insert([
        {
          title: tracker.title,
          description: tracker.description,
          type: tracker.type,
          target: tracker.target,
          unit: tracker.unit,
          start_date: tracker.startDate,
          progress: tracker.progress,
          owner_id: userId,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating tracker:", error)
      return null
    }

    return mapDbTrackerToTracker(data)
  } catch (error) {
    console.error("Error in createTracker:", error)
    return null
  }
}

// Update a tracker
export async function updateTracker(tracker: Tracker, userId: string) {
  try {
    const supabase = createClient()

    // Check if user owns this tracker
    const { data: existingTracker, error: checkError } = await supabase
      .from("trackers")
      .select("owner_id")
      .eq("id", tracker.id)
      .single()

    if (checkError || existingTracker.owner_id !== userId) {
      console.error("User does not have permission to update this tracker")
      return false
    }

    const { error } = await supabase
      .from("trackers")
      .update({
        title: tracker.title,
        description: tracker.description,
        type: tracker.type,
        target: tracker.target,
        unit: tracker.unit,
        start_date: tracker.startDate,
        progress: tracker.progress,
      })
      .eq("id", tracker.id)

    if (error) {
      console.error("Error updating tracker:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateTracker:", error)
    return false
  }
}

// Delete a tracker
export async function deleteTracker(trackerId: string, userId: string) {
  try {
    const supabase = createClient()

    // Check if user owns this tracker
    const { data: existingTracker, error: checkError } = await supabase
      .from("trackers")
      .select("owner_id")
      .eq("id", trackerId)
      .single()

    if (checkError || existingTracker.owner_id !== userId) {
      console.error("User does not have permission to delete this tracker")
      return false
    }

    const { error } = await supabase.from("trackers").delete().eq("id", trackerId)

    if (error) {
      console.error("Error deleting tracker:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteTracker:", error)
    return false
  }
}

// Add a log entry to a tracker
export async function addTrackerLog(trackerId: string, amount: number, note: string, userId: string) {
  try {
    const supabase = createClient()

    // Check if user owns this tracker
    const { data: existingTracker, error: checkError } = await supabase
      .from("trackers")
      .select("owner_id, progress")
      .eq("id", trackerId)
      .single()

    if (checkError || existingTracker.owner_id !== userId) {
      console.error("User does not have permission to update this tracker")
      return null
    }

    // Add log entry
    const { data: log, error: logError } = await supabase
      .from("tracker_logs")
      .insert([
        {
          tracker_id: trackerId,
          amount,
          note,
          date: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (logError) {
      console.error("Error adding tracker log:", logError)
      return null
    }

    // Update tracker progress
    const newProgress = existingTracker.progress + amount
    const { error: updateError } = await supabase.from("trackers").update({ progress: newProgress }).eq("id", trackerId)

    if (updateError) {
      console.error("Error updating tracker progress:", updateError)
      return null
    }

    return {
      id: log.id,
      date: log.date,
      amount: log.amount,
      note: log.note || "",
    }
  } catch (error) {
    console.error("Error in addTrackerLog:", error)
    return null
  }
}

// Helper function to map database tracker to frontend tracker
function mapDbTrackerToTracker(dbTracker: any): Tracker {
  return {
    id: dbTracker.id,
    title: dbTracker.title,
    description: dbTracker.description || "",
    type: dbTracker.type as "habit" | "goal",
    target: dbTracker.target,
    unit: dbTracker.unit,
    startDate: dbTracker.start_date,
    progress: dbTracker.progress,
    logs: [],
    createdAt: dbTracker.created_at,
  }
}
