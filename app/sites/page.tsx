import Link from "next/link"
import { Building, ArrowUpDown, Wrench } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SitesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Site Management</h1>
        <p className="text-muted-foreground">Manage your sites, modernization projects, and relocations</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              <CardTitle>New Sites</CardTitle>
            </div>
            <CardDescription>Manage new site deployments and installations</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create and manage new site deployments, track installation progress, and monitor site readiness.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/sites/new">View New Sites</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" />
              <CardTitle>Modernization</CardTitle>
            </div>
            <CardDescription>Manage site modernization projects</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Track modernization projects, equipment upgrades, and technology refreshes across your sites.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/sites/modernization">View Modernization</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-6 w-6 text-primary" />
              <CardTitle>Relocation</CardTitle>
            </div>
            <CardDescription>Manage site relocation projects</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Plan and execute site relocations, track moving schedules, and manage transition periods.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/sites/relocation">View Relocation</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
