"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, CheckCircle, AlertCircle, Package, Zap } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AutoSetupPage() {
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupResult, setSetupResult] = useState<any>(null)

  const autoSetupDatabase = async () => {
    setIsSettingUp(true)
    setSetupError(null)

    try {
      const response = await fetch("/api/auto-setup-material-database", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setSetupComplete(true)
        setSetupResult(data)
        console.log("Auto setup successful:", data)
      } else {
        setSetupError(data.error || "Failed to setup database")
      }
    } catch (error) {
      console.error("Error in auto setup:", error)
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
            <Zap className="mr-3 h-8 w-8 text-yellow-600" />
            Auto Setup Material Database
          </h1>
          <p className="text-muted-foreground mt-1">Automatically create database with sample data</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Automatic Database Setup
            </CardTitle>
            <CardDescription>
              This will automatically create all necessary tables and populate them with sample data for both Ericsson
              and Huawei materials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {setupError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{setupError}</AlertDescription>
              </Alert>
            )}

            {setupComplete && setupResult && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div>
                    <p className="font-medium">Database setup completed successfully!</p>
                    <p className="text-sm mt-1">
                      Created {setupResult.categoriesCount} categories and {setupResult.materialsCount} sample
                      materials.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What will be created automatically:</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Database Tables</p>
                    <p className="text-sm text-muted-foreground">material_categories and materials tables</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Sample Categories</p>
                    <p className="text-sm text-muted-foreground">
                      6 categories each for Ericsson and Huawei (12 total)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Sample Materials</p>
                    <p className="text-sm text-muted-foreground">Real equipment examples with part numbers</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Security & Performance</p>
                    <p className="text-sm text-muted-foreground">RLS policies, indexes, and triggers</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Sample Data Includes:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-blue-800">Ericsson Equipment:</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• AIR 3268 B41 (Massive MIMO)</li>
                    <li>• AIR 6449 B7 (Radio Unit)</li>
                    <li>• 5G Core AMF</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-red-800">Huawei Equipment:</p>
                  <ul className="text-red-700 space-y-1">
                    <li>• AAU5613 (Active Antenna)</li>
                    <li>• RRU5502W (Remote Radio)</li>
                    <li>• 5G Core UPF</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={autoSetupDatabase}
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
                    <Zap className="h-4 w-4 mr-2" />
                    Auto Setup Database
                  </>
                )}
              </Button>
            </div>

            {setupComplete && (
              <div className="text-center space-y-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Database is ready! Start managing materials now.</p>
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
