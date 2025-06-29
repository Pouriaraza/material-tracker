import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/database.types"

// Mock auth for preview environment
const createMockClient = () => {
  return {
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        // Simulate authentication delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mock successful login for demo purposes
        if (email && password) {
          return {
            data: {
              user: {
                id: "mock-user-id",
                email: email,
                user_metadata: { name: "Demo User" },
              },
              session: {
                access_token: "mock-access-token",
                refresh_token: "mock-refresh-token",
                user: {
                  id: "mock-user-id",
                  email: email,
                  user_metadata: { name: "Demo User" },
                },
              },
            },
            error: null,
          }
        }

        return {
          data: { user: null, session: null },
          error: { message: "Invalid credentials" },
        }
      },
      signUp: async ({ email, password }: { email: string; password: string }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        return {
          data: {
            user: {
              id: "mock-user-id",
              email: email,
              user_metadata: { name: "Demo User" },
            },
            session: null,
          },
          error: null,
        }
      },
      signOut: async () => {
        return { error: null }
      },
      resetPasswordForEmail: async (email: string) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return { data: {}, error: null }
      },
      updateUser: async (attributes: any) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return {
          data: {
            user: {
              id: "mock-user-id",
              email: "demo@example.com",
              user_metadata: { name: "Demo User" },
            },
          },
          error: null,
        }
      },
      getSession: async () => {
        return {
          data: {
            session: {
              access_token: "mock-access-token",
              refresh_token: "mock-refresh-token",
              user: {
                id: "mock-user-id",
                email: "demo@example.com",
                user_metadata: { name: "Demo User" },
              },
            },
          },
          error: null,
        }
      },
      onAuthStateChange: (callback: any) => {
        // Mock auth state change
        return {
          data: { subscription: { unsubscribe: () => {} } },
        }
      },
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => ({ data: null, error: null }),
          then: async (callback: any) => callback({ data: [], error: null }),
        }),
        order: (column: string, options?: any) => ({
          then: async (callback: any) => callback({ data: [], error: null }),
        }),
        then: async (callback: any) => callback({ data: [], error: null }),
      }),
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns?: string) => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async (callback: any) => callback({ error: null }),
        }),
      }),
    }),
  }
}

// Check if we're in the preview environment
const isPreview = typeof window !== "undefined" && window.location.hostname.includes("lite.vusercontent.net")

// Create a single supabase client for the entire client-side application
export const createClient = () => {
  if (isPreview) {
    return createMockClient() as any
  }

  try {
    return createClientComponentClient<Database>()
  } catch (error) {
    console.warn("Supabase client creation failed, using mock client:", error)
    return createMockClient() as any
  }
}
