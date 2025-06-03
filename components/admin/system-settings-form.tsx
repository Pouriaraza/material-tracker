"use client"

import type React from "react"

import { useState } from "react"
import { Loader2 } from "lucide-react"

type SettingsFormValues = {
  siteName: string
  allowSignup: boolean
  itemsPerPage: number
  enableNotifications: boolean
  maintenanceMode: boolean
}

export function SystemSettingsForm({ initialSettings }: { initialSettings: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [settings, setSettings] = useState<SettingsFormValues>(
    initialSettings || {
      siteName: "Tracker App",
      allowSignup: true,
      itemsPerPage: 10,
      enableNotifications: true,
      maintenanceMode: false,
    },
  )
  const [errors, setErrors] = useState<Partial<Record<keyof SettingsFormValues, string>>>({})

  const validateForm = () => {
    const newErrors: Partial<Record<keyof SettingsFormValues, string>> = {}

    if (!settings.siteName || settings.siteName.length < 2) {
      newErrors.siteName = "Site name must be at least 2 characters."
    }

    if (settings.itemsPerPage < 5 || settings.itemsPerPage > 100) {
      newErrors.itemsPerPage = "Items per page must be between 5 and 100."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    // In a real app, this would save to your database
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    alert("Settings updated successfully!")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <label htmlFor="siteName" className="text-sm font-medium">
          Site Name
        </label>
        <input
          id="siteName"
          name="siteName"
          type="text"
          value={settings.siteName || ""}
          onChange={handleInputChange}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
        />
        {errors.siteName && <p className="text-sm text-red-500">{errors.siteName}</p>}
        <p className="text-sm text-gray-500">This is the name of your application as it appears to users.</p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="allowSignup" className="text-base font-medium">
              Allow Signup
            </label>
            <p className="text-sm text-gray-500">When enabled, new users can sign up for accounts.</p>
          </div>
          <input
            id="allowSignup"
            name="allowSignup"
            type="checkbox"
            checked={settings.allowSignup}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="itemsPerPage" className="text-sm font-medium">
          Items Per Page
        </label>
        <input
          id="itemsPerPage"
          name="itemsPerPage"
          type="number"
          value={settings.itemsPerPage || ""}
          onChange={handleInputChange}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
        />
        {errors.itemsPerPage && <p className="text-sm text-red-500">{errors.itemsPerPage}</p>}
        <p className="text-sm text-gray-500">Number of items to display per page in lists and tables.</p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="enableNotifications" className="text-base font-medium">
              Enable Notifications
            </label>
            <p className="text-sm text-gray-500">Send email notifications for important events.</p>
          </div>
          <input
            id="enableNotifications"
            name="enableNotifications"
            type="checkbox"
            checked={settings.enableNotifications}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="maintenanceMode" className="text-base font-medium">
              Maintenance Mode
            </label>
            <p className="text-sm text-gray-500">When enabled, only admins can access the site.</p>
          </div>
          <input
            id="maintenanceMode"
            name="maintenanceMode"
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Settings"
        )}
      </button>
    </form>
  )
}
