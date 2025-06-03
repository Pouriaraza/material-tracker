"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, CheckCircle, AlertCircle, Package } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MaterialSetupPage() {
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  const setupDatabase = async () => {
    setIsSettingUp(true)
    setSetupError(null)

    try {
      const response = await fetch("/api/setup-material-tables", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setSetupComplete(true)
        console.log("Database setup successful:", data)
      } else {
        const errorData = await response.json()
        setSetupError(errorData.error || "Failed to setup database")
      }
    } catch (error) {
      console.error("Error setting up database:", error)
      setSetupError("Failed to setup database")
    } finally {
      setIsSettingUp(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Database className="mr-3 h-8 w-8 text-blue-600" />
            Material Database Setup
          </h1>
          <p className="text-muted-foreground mt-1">Initialize database tables for Ericsson and Huawei materials</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Database Initialization
            </CardTitle>
            <CardDescription>
              This will create the necessary database tables for managing Ericsson and Huawei materials, including
              categories and inventory items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {setupError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{setupError}</AlertDescription>
              </Alert>
            )}

            {setupComplete && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Database setup completed successfully! You can now start creating material categories and items.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What will be created:</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Material Categories Table</p>
                    <p className="text-sm text-muted-foreground">
                      Store categories for organizing materials by brand (Ericsson/Huawei)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Materials Table</p>
                    <p className="text-sm text-muted-foreground">
                      Store individual material items with details, quantities, and notes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Security Policies</p>
                    <p className="text-sm text-muted-foreground">Row-level security for data protection</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Indexes & Triggers</p>
                    <p className="text-sm text-muted-foreground">Performance optimization and automatic timestamps</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={setupDatabase}
                disabled={isSettingUp || setupComplete}
                size="lg"
                className="w-full max-w-md"
              >
                {isSettingUp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up database...
                  </>
                ) : setupComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Setup Complete
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Initialize Database
                  </>
                )}
              </Button>
            </div>

            {setupComplete && (
              <div className="text-center space-y-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Ready to start managing materials!</p>
                <div className="flex gap-4 justify-center">
                  <Button asChild variant="outline">
                    <a href="/material/ericsson">
                      <Package className="h-4 w-4 mr-2 text-blue-600" />
                      Ericsson Materials
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/material/huawei">
                      <Package className="h-4 w-4 mr-2 text-red-600" />
                      Huawei Materials
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
