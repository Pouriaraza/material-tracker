"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Search, RefreshCw, UserCheck, UserX, ShieldAlert, Mail, Users, Clock, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BulkUserManager } from "./bulk-user-manager"

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  created_at: string
  is_admin: boolean
  last_sign_in_at?: string
  role?: string
  is_active: boolean
}

interface UserStats {
  total_users: number
  active_users: number
  admin_users: number
  recent_signups: number
  pending_invitations: number
}

interface Invitation {
  id: string
  email: string
  role: string
  is_admin: boolean
  status: string
  expires_at: string
  created_at: string
}

interface UserManagementProps {
  currentUser: any
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState("user")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (currentUser?.id) {
      checkCurrentUserAdmin()
      fetchData()
    }
  }, [currentUser])

  const checkCurrentUserAdmin = async () => {
    if (!currentUser?.id) return

    try {
      const { data: adminCheck } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", currentUser.id)
        .single()

      setIsCurrentUserAdmin(!!adminCheck)
    } catch (error) {
      console.error("Error checking admin status:", error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch users first
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (profilesError) throw profilesError

      // Fetch admin users separately
      const { data: adminUsers, error: adminError } = await supabase.from("admin_users").select("user_id")

      if (adminError) {
        console.warn("Error fetching admin users:", adminError)
      }

      // Create a set of admin user IDs for quick lookup
      const adminUserIds = new Set(adminUsers?.map((admin) => admin.user_id) || [])

      // Map the data to include admin status
      const mappedUsers: User[] =
        profiles?.map((profile) => ({
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          created_at: profile.created_at,
          is_admin: adminUserIds.has(profile.id),
          last_sign_in_at: profile.last_sign_in_at,
          role: profile.role || "user",
          is_active: profile.is_active !== false, // Default to true if null
        })) || []

      setUsers(mappedUsers)

      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("user_invitations")
        .select("*")
        .order("created_at", { ascending: false })

      if (!invitationsError) {
        setInvitations(invitationsData || [])
      }

      // Calculate stats manually since the function might not exist
      const totalUsers = mappedUsers.length
      const activeUsers = mappedUsers.filter((user) => user.is_active).length
      const adminUsersCount = mappedUsers.filter((user) => user.is_admin).length
      const recentSignups = mappedUsers.filter((user) => {
        const createdDate = new Date(user.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return createdDate > weekAgo
      }).length
      const pendingInvitations = invitationsData?.filter((inv) => inv.status === "pending").length || 0

      setStats({
        total_users: totalUsers,
        active_users: activeUsers,
        admin_users: adminUsersCount,
        recent_signups: recentSignups,
        pending_invitations: pendingInvitations,
      })
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError(error.message || "Failed to fetch data")
      toast({
        title: "خطا در دریافت اطلاعات",
        description: error.message || "مشکلی در بارگذاری اطلاعات کاربران وجود دارد.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async () => {
    if (!newUserEmail.trim()) return

    setIsSubmitting(true)
    try {
      // Create invitation record
      const { error: inviteError } = await supabase.from("user_invitations").insert({
        email: newUserEmail,
        invited_by: currentUser.id,
        role: newUserRole,
        is_admin: isAdmin,
      })

      if (inviteError) throw inviteError

      // Send magic link
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: newUserEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) throw authError

      toast({
        title: "دعوت‌نامه ارسال شد",
        description: `دعوت‌نامه به ${newUserEmail} ارسال شد.`,
      })

      // Reset form
      setNewUserEmail("")
      setNewUserRole("user")
      setIsAdmin(false)
      setAddUserDialogOpen(false)

      // Refresh data
      fetchData()
    } catch (error: any) {
      console.error("Error inviting user:", error)
      toast({
        title: "خطا در ارسال دعوت‌نامه",
        description: error.message || "مشکلی در ارسال دعوت‌نامه وجود دارد.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // Prevent removing admin status from current user
      if (userId === currentUser.id && currentStatus) {
        toast({
          title: "امکان حذف ادمین",
          description: "شما نمی‌توانید دسترسی ادمین خود را حذف کنید.",
          variant: "destructive",
        })
        return
      }

      if (currentStatus) {
        // Remove admin status
        const { error } = await supabase.from("admin_users").delete().eq("user_id", userId)
        if (error) throw error
      } else {
        // Add admin status
        const { error } = await supabase.from("admin_users").insert({
          user_id: userId,
          created_by: currentUser.id,
        })
        if (error) throw error
      }

      // Update local state
      setUsers(users.map((user) => (user.id === userId ? { ...user, is_admin: !currentStatus } : user)))

      toast({
        title: "کاربر به‌روزرسانی شد",
        description: `دسترسی ادمین ${!currentStatus ? "اعطا" : "حذف"} شد.`,
      })

      fetchData()
    } catch (error: any) {
      console.error("Error toggling admin status:", error)
      toast({
        title: "خطا در به‌روزرسانی کاربر",
        description: error.message || "مشکلی در تغییر دسترسی ادمین وجود دارد.",
        variant: "destructive",
      })
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !currentStatus }).eq("id", userId)

      if (error) throw error

      // Update local state
      setUsers(users.map((user) => (user.id === userId ? { ...user, is_active: !currentStatus } : user)))

      toast({
        title: "کاربر به‌روزرسانی شد",
        description: `کاربر ${!currentStatus ? "فعال" : "غیرفعال"} شد.`,
      })

      fetchData()
    } catch (error: any) {
      console.error("Error toggling user status:", error)
      toast({
        title: "خطا در به‌روزرسانی کاربر",
        description: error.message || "مشکلی در تغییر وضعیت کاربر وجود دارد.",
        variant: "destructive",
      })
    }
  }

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase.from("user_invitations").delete().eq("id", invitationId)

      if (error) throw error

      toast({
        title: "دعوت‌نامه حذف شد",
        description: "دعوت‌نامه با موفقیت حذف شد.",
      })

      fetchData()
    } catch (error: any) {
      console.error("Error deleting invitation:", error)
      toast({
        title: "خطا در حذف دعوت‌نامه",
        description: error.message || "مشکلی در حذف دعوت‌نامه وجود دارد.",
        variant: "destructive",
      })
    }
  }

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "هرگز"
    return new Date(dateString).toLocaleDateString("fa-IR")
  }

  // Get user's display name
  const getUserDisplayName = (user: User) => {
    if (user.full_name) return user.full_name
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
    if (user.first_name) return user.first_name
    return user.email
  }

  if (!currentUser) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>احراز هویت مورد نیاز</AlertTitle>
        <AlertDescription>لطفاً برای دسترسی به مدیریت کاربران وارد شوید.</AlertDescription>
      </Alert>
    )
  }

  if (!isCurrentUserAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>دسترسی محدود</AlertTitle>
        <AlertDescription>شما دسترسی ادمین ندارید.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطا</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">کل کاربران</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">کاربران فعال</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ادمین‌ها</CardTitle>
              <ShieldAlert className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.admin_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">عضویت‌های اخیر</CardTitle>
              <UserPlus className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.recent_signups}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">دعوت‌نامه‌های در انتظار</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending_invitations}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">مدیریت کاربران</TabsTrigger>
          <TabsTrigger value="bulk">اضافه کردن دسته‌ای</TabsTrigger>
          <TabsTrigger value="invitations">دعوت‌نامه‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="جستجو بر اساس نام یا ایمیل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                بروزرسانی
              </Button>
              <Button onClick={() => setAddUserDialogOpen(true)}>
                <Mail className="h-4 w-4 mr-2" />
                دعوت کاربر
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>کاربران ({filteredUsers.length})</CardTitle>
              {isCurrentUserAdmin && (
                <Badge className="bg-green-500 flex items-center">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  دسترسی ادمین
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "هیچ کاربری با این جستجو یافت نشد" : "هیچ کاربری یافت نشد"}
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>کاربر</TableHead>
                        <TableHead>ایمیل</TableHead>
                        <TableHead>نقش</TableHead>
                        <TableHead>تاریخ عضویت</TableHead>
                        <TableHead>آخرین ورود</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {getUserDisplayName(user)}
                            {user.id === currentUser.id && (
                              <Badge variant="outline" className="ml-2">
                                شما
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role || "کاربر"}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            {user.last_sign_in_at ? (
                              <span className="flex items-center">
                                <UserCheck className="h-4 w-4 mr-1 text-green-500" />
                                {formatDate(user.last_sign_in_at)}
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <UserX className="h-4 w-4 mr-1 text-gray-400" />
                                هرگز
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {user.is_active ? (
                                <Badge className="bg-green-500">فعال</Badge>
                              ) : (
                                <Badge variant="destructive">غیرفعال</Badge>
                              )}
                              {user.is_admin && <Badge className="bg-blue-500">ادمین</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={user.is_admin}
                                  onCheckedChange={() => toggleAdminStatus(user.id, user.is_admin)}
                                  disabled={user.id === currentUser.id}
                                  size="sm"
                                />
                                <Label className="text-xs">ادمین</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={user.is_active}
                                  onCheckedChange={() => toggleUserStatus(user.id, user.is_active)}
                                  disabled={user.id === currentUser.id}
                                  size="sm"
                                />
                                <Label className="text-xs">فعال</Label>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <BulkUserManager onUsersAdded={fetchData} />
        </TabsContent>

        <TabsContent value="invitations">
          {/* Invitations Section */}
          {invitations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>دعوت‌نامه‌ها ({invitations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{invitation.email}</div>
                        <div className="text-sm text-muted-foreground">
                          نقش: {invitation.role}
                          {invitation.is_admin && " (ادمین)"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ارسال شده: {formatDate(invitation.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            invitation.status === "pending"
                              ? "default"
                              : invitation.status === "accepted"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {invitation.status === "pending"
                            ? "در انتظار"
                            : invitation.status === "accepted"
                              ? "پذیرفته شده"
                              : "منقضی شده"}
                        </Badge>
                        {invitation.status === "pending" && (
                          <Button variant="destructive" size="sm" onClick={() => deleteInvitation(invitation.id)}>
                            حذف
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">هیچ دعوت‌نامه‌ای یافت نشد</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دعوت کاربر جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">آدرس ایمیل</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">نقش</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نقش" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">کاربر</SelectItem>
                  <SelectItem value="manager">مدیر</SelectItem>
                  <SelectItem value="editor">ویرایشگر</SelectItem>
                  <SelectItem value="viewer">بیننده</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
              <Label htmlFor="admin">اعطای دسترسی ادمین</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              لغو
            </Button>
            <Button onClick={handleInviteUser} disabled={!newUserEmail.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> در حال ارسال...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" /> ارسال دعوت‌نامه
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
