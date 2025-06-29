"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Database, CheckCircle, XCircle } from "lucide-react"

interface DatabaseStatus {
  timestamp: string
  environment: {
    supabaseUrl: string
    anonKey: string
    serviceRoleKey: string
  }
  connections: {
    regularClient: string
    adminClient: string
  }
  tables: {
    settlement_items: string
    user_roles: string
    profiles: string
  }
  errors: string[]
}

export default function DatabaseTestPage() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)

  const checkConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-database-connection")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error("Error checking database connection:", error)
    } finally {
      setLoading(false)
    }
  }

  const setupTables = async () => {
    setSetupLoading(true)
    try {
      const response = await fetch("/api/setup-settlement-table", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        alert("Tables setup completed successfully!")
        checkConnection() // Refresh status
      } else {
        alert(`Setup failed: ${data.error}`)
      }
    } catch (error) {
      console.error("Error setting up tables:", error)
      alert("Error setting up tables")
    } finally {
      setSetupLoading(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  const getStatusIcon = (status: string) => {
    if (status.includes("✅")) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status.includes("❌")) return <XCircle className="h-4 w-4 text-red-500" />
    return null
  }

  const getStatusBadge = (status: string) => {
    if (status.includes("✅"))
      return (
        <Badge variant="default" className="bg-green-500">
          Success
        </Badge>
      )
    if (status.includes("❌")) return <Badge variant="destructive">Failed</Badge>
    return <Badge variant="secondary">Unknown</Badge>
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Database Connection Test</h1>
      </div>

      <div className="flex gap-4 mb-6">
        <Button onClick={checkConnection} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Check Connection
        </Button>

        <Button onClick={setupTables} disabled={setupLoading} variant="outline">
          {setupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Setup Tables
        </Button>
      </div>

      {status && (
        <div className="space-y-6">
          {/* Environment Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>Checking if required environment variables are set</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Supabase URL</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.environment.supabaseUrl)}
                  {getStatusBadge(status.environment.supabaseUrl)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Anonymous Key</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.environment.anonKey)}
                  {getStatusBadge(status.environment.anonKey)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Service Role Key</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.environment.serviceRoleKey)}
                  {getStatusBadge(status.environment.serviceRoleKey)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Connections */}
          <Card>
            <CardHeader>
              <CardTitle>Database Connections</CardTitle>
              <CardDescription>Testing different client connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Regular Client</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.connections.regularClient)}
                  {getStatusBadge(status.connections.regularClient)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Admin Client</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.connections.adminClient)}
                  {getStatusBadge(status.connections.adminClient)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tables */}
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
              <CardDescription>Checking if required tables exist</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>settlement_items</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.tables.settlement_items)}
                  {getStatusBadge(status.tables.settlement_items)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>user_roles</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.tables.user_roles)}
                  {getStatusBadge(status.tables.user_roles)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>profiles</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.tables.profiles)}
                  {getStatusBadge(status.tables.profiles)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {status.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Errors</CardTitle>
                <CardDescription>Issues found during testing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {status.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Timestamp */}
          <div className="text-sm text-gray-500 text-center">
            Last checked: {new Date(status.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
