import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FileSpreadsheet, Target, Users } from "lucide-react"

export default async function Home() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">Site Tracker</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section
          className="py-20 md:py-32 relative"
          style={{
            backgroundImage: `url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/shapes-dark-QrJaDGpxj12kHAP3nGrW9DbjqeqMo3.png')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="container mx-auto px-4 text-center relative z-10">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white">
              Track Your Progress
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white">
              A powerful platform for managing site information and tracking personal goals.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white hover:bg-white/20 hover:text-white"
                asChild
              >
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </section>
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="bg-card p-6 rounded-lg shadow">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Excel-like Sheets</h3>
                <p className="text-muted-foreground">
                  Manage your site information with powerful spreadsheet capabilities and real-time collaboration.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Progress Tracking</h3>
                <p className="text-muted-foreground">
                  Set goals, track habits, and visualize your progress with beautiful charts and statistics.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">User Permissions</h3>
                <p className="text-muted-foreground">
                  Control who can view and edit your data with granular permissions and secure sharing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Site Tracker. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
