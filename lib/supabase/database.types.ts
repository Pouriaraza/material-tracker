export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      sheets: {
        Row: {
          id: string
          name: string
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      columns: {
        Row: {
          id: string
          sheet_id: string
          name: string
          type: "text" | "number" | "date" | "checkbox"
          position: number
          width: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_id: string
          name: string
          type: "text" | "number" | "date" | "checkbox"
          position: number
          width?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sheet_id?: string
          name?: string
          type?: "text" | "number" | "date" | "checkbox"
          position?: number
          width?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      rows: {
        Row: {
          id: string
          sheet_id: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_id: string
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sheet_id?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      cells: {
        Row: {
          id: string
          row_id: string
          column_id: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          row_id: string
          column_id: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          row_id?: string
          column_id?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
      }
      public_links: {
        Row: {
          id: string
          sheet_id: string
          access_key: string
          created_by: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_id: string
          access_key: string
          created_by: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sheet_id?: string
          access_key?: string
          created_by?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      sheet_permissions: {
        Row: {
          id: string
          sheet_id: string
          user_id: string
          role_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_id: string
          user_id: string
          role_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sheet_id?: string
          user_id?: string
          role_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      trackers: {
        Row: {
          id: string
          title: string
          description: string | null
          type: string
          target: number
          unit: string
          start_date: string
          progress: number
          created_at: string
          updated_at: string
          owner_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: string
          target: number
          unit: string
          start_date: string
          progress?: number
          created_at?: string
          updated_at?: string
          owner_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: string
          target?: number
          unit?: string
          start_date?: string
          progress?: number
          created_at?: string
          updated_at?: string
          owner_id?: string
        }
      }
      tracker_logs: {
        Row: {
          id: string
          tracker_id: string
          date: string
          amount: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tracker_id: string
          date: string
          amount: number
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tracker_id?: string
          date?: string
          amount?: number
          note?: string | null
          created_at?: string
        }
      }
      reserve_items: {
        Row: {
          id: string
          user_id: string
          mr_number: string
          status: string
          created_at: string
          updated_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          mr_number: string
          status?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          mr_number?: string
          status?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
        }
      }
      site_folders: {
        Row: {
          id: string
          name: string
          description: string | null
          site_type: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          site_type: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          site_type?: string
          created_by?: string
          created_at?: string
        }
      }
      folder_permissions: {
        Row: {
          id: string
          folder_id: string
          user_id: string
          can_view: boolean
          can_edit: boolean
          can_delete: boolean
          created_at: string
        }
        Insert: {
          id?: string
          folder_id: string
          user_id: string
          can_view?: boolean
          can_edit?: boolean
          can_delete?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          folder_id?: string
          user_id?: string
          can_view?: boolean
          can_edit?: boolean
          can_delete?: boolean
          created_at?: string
        }
      }
      folder_files: {
        Row: {
          id: string
          folder_id: string
          file_name: string
          file_type: string
          file_size: number
          file_path: string
          uploaded_by: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          folder_id: string
          file_name: string
          file_type: string
          file_size: number
          file_path: string
          uploaded_by: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          folder_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          file_path?: string
          uploaded_by?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
