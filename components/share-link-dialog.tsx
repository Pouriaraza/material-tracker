"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Copy, Check, AlertCircle, LinkIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ShareLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  publicLink: string | null
  isActive: boolean
  onCreateLink: () => Promise<void>
  onToggleLink: () => Promise<void>
  sheetName: string
}

export function ShareLinkDialog({
  open,
  onOpenChange,
  publicLink,
  isActive,
  onCreateLink,
  onToggleLink,
  sheetName,
}: ShareLinkDialogProps) {
  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLink, setCurrentLink] = useState<string | null>(publicLink)
  const [currentActive, setCurrentActive] = useState<boolean>(isActive)

  // Update state when props change
  useEffect(() => {
    setCurrentLink(publicLink)
    setCurrentActive(isActive)
  }, [publicLink, isActive])

  const handleCopyLink = () => {
    if (currentLink) {
      navigator.clipboard.writeText(currentLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCreateLink = async () => {
    setError(null)
    setIsCreating(true)

    try {
      await onCreateLink()
    } catch (err: any) {
      console.error("Error in handleCreateLink:", err)
      setError(err.message || "Failed to create public link. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleLink = async () => {
    setError(null)
    setIsToggling(true)

    try {
      await onToggleLink()
    } catch (err: any) {
      console.error("Error in handleToggleLink:", err)
      setError(err.message || "Failed to update link status. Please try again.")
    } finally {
      setIsToggling(false)
    }
  }

  // Clear error when dialog opens/closes
  useEffect(() => {
    setError(null)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{sheetName}"</DialogTitle>
          <DialogDescription>
            Create a public link to share this sheet with anyone, even if they don't have an account.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {currentLink ? (
            <>
              <div className="flex items-center space-x-2">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="link" className="sr-only">
                    Public link
                  </Label>
                  <Input id="link" value={currentLink} readOnly className="font-mono text-sm" />
                </div>
                <Button type="button" size="icon" variant="outline" onClick={handleCopyLink} disabled={!currentActive}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="sr-only">Copy link</span>
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="link-active"
                  checked={currentActive}
                  onCheckedChange={handleToggleLink}
                  disabled={isToggling}
                />
                <Label htmlFor="link-active">{currentActive ? "Link is active" : "Link is disabled"}</Label>
              </div>

              {!currentActive && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>This link is currently disabled. Enable it to allow access.</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert className="bg-blue-50 border-blue-200">
              <LinkIcon className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                No public link exists yet. Create one to share this sheet.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button onClick={handleCreateLink} disabled={isCreating}>
            {isCreating
              ? currentLink
                ? "Generating..."
                : "Creating..."
              : currentLink
                ? "Generate New Link"
                : "Create Public Link"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
