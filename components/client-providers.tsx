"use client"

import type React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"

// Add the missing ClientProviders component
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}

export function ClientTabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      {children}
    </Tabs>
  )
}

export function ClientTabsList({ children }: { children: React.ReactNode }) {
  return <TabsList className="grid w-full grid-cols-3 mb-8">{children}</TabsList>
}

export function ClientTabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return <TabsTrigger value={value}>{children}</TabsTrigger>
}

export function ClientTabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  return <TabsContent value={value}>{children}</TabsContent>
}

export function ClientRefreshButton() {
  return <Button onClick={() => window.location.reload()}>Try Again</Button>
}
