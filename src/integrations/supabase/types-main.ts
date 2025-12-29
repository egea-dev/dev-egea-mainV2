// src/integrations/supabase/types-main.ts
// Tipos para la base de datos MAIN (wbxzfcfxipkylydbrqiu)

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    auth_user_id: string | null
                    full_name: string
                    email: string | null
                    phone: string | null
                    role: string
                    status: string
                    avatar_url: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    auth_user_id?: string | null
                    full_name: string
                    email?: string | null
                    phone?: string | null
                    role?: string
                    status?: string
                    avatar_url?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    auth_user_id?: string | null
                    full_name?: string
                    email?: string | null
                    phone?: string | null
                    role?: string
                    status?: string
                    avatar_url?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            vehicles: {
                Row: {
                    id: string
                    name: string
                    license_plate: string | null
                    type: string
                    capacity: number
                    is_active: boolean
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    license_plate?: string | null
                    type?: string
                    capacity?: number
                    is_active?: boolean
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    license_plate?: string | null
                    type?: string
                    capacity?: number
                    is_active?: boolean
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            screen_data: {
                Row: {
                    id: string
                    screen_id: string
                    data: Json | null
                    state: string
                    status: string
                    start_date: string | null
                    end_date: string | null
                    location: string | null
                    responsible_profile_id: string | null
                    assigned_to: string | null
                    work_site_id: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    screen_id: string
                    data?: Json | null
                    state?: string
                    status?: string
                    start_date?: string | null
                    end_date?: string | null
                    location?: string | null
                    responsible_profile_id?: string | null
                    assigned_to?: string | null
                    work_site_id?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    screen_id?: string
                    data?: Json | null
                    state?: string
                    status?: string
                    start_date?: string | null
                    end_date?: string | null
                    location?: string | null
                    responsible_profile_id?: string | null
                    assigned_to?: string | null
                    work_site_id?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            work_sites: {
                Row: {
                    id: string
                    name: string
                    address: string | null
                    city: string | null
                    is_active: boolean
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    address?: string | null
                    city?: string | null
                    is_active?: boolean
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    address?: string | null
                    city?: string | null
                    is_active?: boolean
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
        }
        Views: {
            detailed_tasks: {
                Row: {
                    id: string
                    title: string | null
                    status: string | null
                    state: string | null
                    // ... resto de campos simplificados
                }
            }
        }
        Functions: {}
    }
}
