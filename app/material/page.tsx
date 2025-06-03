"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Settings, Database, Bug, AlertCircle, RefreshCw, Copy, CheckCircle, Wrench } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { BrandDialog } from "@/components/material/brand-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface Brand {
  id: string
  name: string
  slug: string
  description: string
  color: string
  created_at: string
}

export default function MaterialPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [needsManualSetup, setNeedsManualSetup] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFixingConstraint, setIsFixingConstraint] = useState(false)
  const { toast } = useToast()

  const sqlMigration = `-- Create material brands table
CREATE TABLE IF NOT EXISTS material_brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_material_brands_slug ON material_brands(slug);
CREATE INDEX IF NOT EXISTS idx_material_brands_created_by ON material_brands(created_by);

-- Enable RLS
ALTER TABLE material_brands ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all material brands" ON material_brands FOR SELECT USING (true);
CREATE POLICY "Users can insert material brands" ON material_brands FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their material brands" ON material_brands FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their material brands" ON material_brands FOR DELETE USING (auth.uid() = created_by);

-- Fix brand constraint to allow custom brands
ALTER TABLE material_categories DROP CONSTRAINT IF EXISTS material_categories_brand_check;

-- Insert default brands (replace 'YOUR_USER_ID' with your actual user ID)
INSERT INTO material_brands (name, slug, description, color, created_by)
VALUES 
  ('Ericsson', 'ericsson', 'Ericsson equipment and materials', '#0066B3', auth.uid()),
  ('Huawei', 'huawei', 'Huawei equipment and materials', '#C7000B', auth.uid());`

  useEffect(() => {
    fetchBrands()
  }, [])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlMigration)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const fixBrandConstraint = async () => {
    setIsFixingConstraint(true)
    try {
      const response = await fetch("/api/material/fix-brand-constraint", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Constraint Fixed",
          description: "Brand constraint has been removed successfully",
        })
      } else {
        toast({
          title: "Fix Failed",
          description: "Failed to remove brand constraint",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fixing constraint:", error)
      toast({
        title: "Error",
        description: "Failed to fix brand constraint",
        variant: "destructive",
      })
    } finally {
      setIsFixingConstraint(false)
    }
  }

  const refreshSchema = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/material/refresh-schema", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Schema refreshed",
          description: "Database schema has been refreshed successfully",
        })
        await fetchBrands()
      } else {
        toast({
          title: "Schema refresh failed",
          description: "Failed to refresh database schema",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error refreshing schema:", error)
      toast({
        title: "Error",
        description: "Failed to refresh schema",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const setupBrandsTable = async () => {
    setIsSettingUp(true)
    setSetupError(null)
    setNeedsManualSetup(false)

    try {
      const response = await fetch("/api/setup-material-brands-table", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setSetupError(null)
        setNeedsManualSetup(false)
        toast({
          title: "Success",
          description: "Brand table created successfully!",
        })
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await fetchBrands()
      } else {
        if (data.needsManualSetup) {
          setNeedsManualSetup(true)
          setSetupError("Database table needs to be created manually using SQL")
        } else {
          setSetupError(data.error || "Failed to setup brands table")
        }
      }
    } catch (error) {
      console.error("Error setting up brands table:", error)
      setSetupError("Failed to setup brands table")
      setNeedsManualSetup(true)
    } finally {
      setIsSettingUp(false)
    }
  }

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/material/brands")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.tableExists === false) {
        setSetupError("Database tables need to be created")
        setNeedsManualSetup(true)
      } else {
        console.log("Fetched brands:", data.brands)
        setBrands(data.brands || [])
        setSetupError(null)
        setNeedsManualSetup(false)
      }
    } catch (error) {
      console.error("Error fetching brands:", error)
      setSetupError("Failed to connect to database")
      setNeedsManualSetup(true)
    } finally {
      setLoading(false)
    }
  }

  const handleBrandCreated = () => {
    console.log("Brand created, refreshing brands list...")
    fetchBrands()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (setupError || needsManualSetup) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Package className="mr-3 h-8 w-8 text-primary" />
              Material Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage equipment and materials by brand</p>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <p className="font-medium">Database Setup Required</p>
                <p className="text-sm text-muted-foreground mt-1">{setupError}</p>
              </div>

              {needsManualSetup && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Please run this SQL in your Supabase SQL editor:</p>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                      <code>{sqlMigration}</code>
                    </pre>
                    <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={copyToClipboard}>
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy SQL
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={refreshSchema} disabled={isRefreshing} size="sm" variant="outline">
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                      {isRefreshing ? "Refreshing..." : "Refresh Schema"}
                    </Button>
                    <Button onClick={fetchBrands} variant="outline" size="sm">
                      Check Again
                    </Button>
                    <Button onClick={setupBrandsTable} disabled={isSettingUp} size="sm">
                      {isSettingUp ? "Checking..." : "Try Auto Setup"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Material management system is not ready</p>
            <p className="text-sm text-muted-foreground">Run the SQL migration above to initialize the system</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center">
            <Package className="mr-3 h-8 w-8 text-primary" />
            Material Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage equipment and materials by brand</p>
        </div>
        <Button onClick={fixBrandConstraint} disabled={isFixingConstraint} size="sm" variant="outline" className="mr-2">
          <Wrench className={`h-4 w-4 mr-2 ${isFixingConstraint ? "animate-spin" : ""}`} />
          {isFixingConstraint ? "Fixing..." : "Fix Brand Constraint"}
        </Button>
        <Button onClick={refreshSchema} disabled={isRefreshing} size="sm" variant="outline" className="mr-2">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
        <BrandDialog onBrandCreated={handleBrandCreated} />
      </div>

      {/* Material Brands */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Show database brands if they exist */}
        {brands.map((brand) => (
          <Card key={brand.id} className="hover:shadow-lg transition-shadow">
            <CardHeader style={{ backgroundColor: brand.color + "10", borderBottom: `2px solid ${brand.color}` }}>
              <CardTitle className="text-xl flex items-center">
                <Package className="mr-2 h-5 w-5" style={{ color: brand.color }} />
                {brand.name} Materials
              </CardTitle>
              <CardDescription>{brand.description || `Manage ${brand.name} equipment and materials`}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-4">
                <Package className="mx-auto h-12 w-12 mb-4" style={{ color: brand.color }} />
                <h3 className="text-lg font-semibold">{brand.name} Equipment</h3>
                <p className="mt-2 text-muted-foreground">Track and manage {brand.name} materials and equipment</p>
                <Button className="mt-6 w-full" style={{ backgroundColor: brand.color }} asChild>
                  <Link href={`/material/${brand.slug}`}>
                    <Package className="mr-2 h-4 w-4" /> Open {brand.name} Materials
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Always show Ericsson and Huawei cards if they're not in the database */}
        {!brands.find((b) => b.slug === "ericsson") && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader style={{ backgroundColor: "#0066B310", borderBottom: "2px solid #0066B3" }}>
              <CardTitle className="text-xl flex items-center">
                <Package className="mr-2 h-5 w-5" style={{ color: "#0066B3" }} />
                Ericsson Materials
              </CardTitle>
              <CardDescription>Manage Ericsson equipment and materials</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-4">
                <Package className="mx-auto h-12 w-12 mb-4" style={{ color: "#0066B3" }} />
                <h3 className="text-lg font-semibold">Ericsson Equipment</h3>
                <p className="mt-2 text-muted-foreground">Track and manage Ericsson materials and equipment</p>
                <Button className="mt-6 w-full" style={{ backgroundColor: "#0066B3" }} asChild>
                  <Link href="/material/ericsson">
                    <Package className="mr-2 h-4 w-4" /> Open Ericsson Materials
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!brands.find((b) => b.slug === "huawei") && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader style={{ backgroundColor: "#C7000B10", borderBottom: "2px solid #C7000B" }}>
              <CardTitle className="text-xl flex items-center">
                <Package className="mr-2 h-5 w-5" style={{ color: "#C7000B" }} />
                Huawei Materials
              </CardTitle>
              <CardDescription>Manage Huawei equipment and materials</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-4">
                <Package className="mx-auto h-12 w-12 mb-4" style={{ color: "#C7000B" }} />
                <h3 className="text-lg font-semibold">Huawei Equipment</h3>
                <p className="text-muted-foreground">Track and manage Huawei materials and equipment</p>
                <Button className="mt-6 w-full" style={{ backgroundColor: "#C7000B" }} asChild>
                  <Link href="/material/huawei">
                    <Package className="mr-2 h-4 w-4" /> Open Huawei Materials
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {brands.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="text-center py-12">
              <Package className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Default Material Brands Available</h3>
              <p className="text-muted-foreground mb-6">
                Ericsson and Huawei brands are available above. Create additional brands as needed.
              </p>
              <BrandDialog onBrandCreated={handleBrandCreated} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>Setup and manage your material management system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" asChild>
              <Link href="/material/setup">
                <Database className="mr-2 h-4 w-4" />
                Setup Database
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/material/auto-setup">
                <Settings className="mr-2 h-4 w-4" />
                Auto Setup
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/material/debug">
                <Bug className="mr-2 h-4 w-4" />
                Debug Tools
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
