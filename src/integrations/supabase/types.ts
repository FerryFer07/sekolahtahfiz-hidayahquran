export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      halaqah: {
        Row: {
          id: string
          nama: string
          pengawas_id: string | null
          tahun_ajaran: string
          ustadz_id: string | null
        }
        Insert: {
          id?: string
          nama: string
          pengawas_id?: string | null
          tahun_ajaran: string
          ustadz_id?: string | null
        }
        Update: {
          id?: string
          nama?: string
          pengawas_id?: string | null
          tahun_ajaran?: string
          ustadz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "halaqah_pengawas_id_fkey"
            columns: ["pengawas_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "halaqah_ustadz_id_fkey"
            columns: ["ustadz_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kehadiran: {
        Row: {
          dicatat_oleh: string
          id: string
          santri_id: string
          status: string
          tanggal: string
        }
        Insert: {
          dicatat_oleh?: string
          id?: string
          santri_id: string
          status: string
          tanggal: string
        }
        Update: {
          dicatat_oleh?: string
          id?: string
          santri_id?: string
          status?: string
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "kehadiran_dicatat_oleh_fkey"
            columns: ["dicatat_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kehadiran_santri_id_fkey"
            columns: ["santri_id"]
            isOneToOne: false
            referencedRelation: "santri"
            referencedColumns: ["id"]
          },
        ]
      }
      pengaturan_sekolah: {
        Row: {
          alamat: string
          hari_sekolah: string[]
          id: number
          kepala_sekolah: string
          logo_url: string | null
          nama_sekolah: string
          putaran_manzil_hari: number
          putaran_sabqi_hari: number
          satuan_default: string
        }
        Insert: {
          alamat?: string
          hari_sekolah?: string[]
          id?: number
          kepala_sekolah?: string
          logo_url?: string | null
          nama_sekolah?: string
          putaran_manzil_hari?: number
          putaran_sabqi_hari?: number
          satuan_default?: string
        }
        Update: {
          alamat?: string
          hari_sekolah?: string[]
          id?: number
          kepala_sekolah?: string
          logo_url?: string | null
          nama_sekolah?: string
          putaran_manzil_hari?: number
          putaran_sabqi_hari?: number
          satuan_default?: string
        }
        Relationships: []
      }
      penugasan_badal: {
        Row: {
          halaqah_id: string
          id: string
          mulai: string
          selesai: string
          ustadz_id: string
        }
        Insert: {
          halaqah_id: string
          id?: string
          mulai: string
          selesai: string
          ustadz_id: string
        }
        Update: {
          halaqah_id?: string
          id?: string
          mulai?: string
          selesai?: string
          ustadz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penugasan_badal_halaqah_id_fkey"
            columns: ["halaqah_id"]
            isOneToOne: false
            referencedRelation: "halaqah"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penugasan_badal_ustadz_id_fkey"
            columns: ["ustadz_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      periode: {
        Row: {
          id: string
          nama: string
          semester: number
          tahun_ajaran: string
          tanggal_mulai: string
          tanggal_selesai: string
        }
        Insert: {
          id?: string
          nama: string
          semester: number
          tahun_ajaran: string
          tanggal_mulai: string
          tanggal_selesai: string
        }
        Update: {
          id?: string
          nama?: string
          semester?: number
          tahun_ajaran?: string
          tanggal_mulai?: string
          tanggal_selesai?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          nama: string
          no_hp: string
          persetujuan_data_pada: string | null
          ukuran_huruf_quran: string
        }
        Insert: {
          id: string
          nama?: string
          no_hp?: string
          persetujuan_data_pada?: string | null
          ukuran_huruf_quran?: string
        }
        Update: {
          id?: string
          nama?: string
          no_hp?: string
          persetujuan_data_pada?: string | null
          ukuran_huruf_quran?: string
        }
        Relationships: []
      }
      quran_ayat: {
        Row: {
          ayat: number
          baris_akhir: number
          baris_awal: number
          halaman: number
          id: number
          juz: number
          surah: number
          teks_utsmani: string
        }
        Insert: {
          ayat: number
          baris_akhir: number
          baris_awal: number
          halaman: number
          id: number
          juz: number
          surah: number
          teks_utsmani: string
        }
        Update: {
          ayat?: number
          baris_akhir?: number
          baris_awal?: number
          halaman?: number
          id?: number
          juz?: number
          surah?: number
          teks_utsmani?: string
        }
        Relationships: [
          {
            foreignKeyName: "quran_ayat_surah_fkey"
            columns: ["surah"]
            isOneToOne: false
            referencedRelation: "quran_surah"
            referencedColumns: ["id"]
          },
        ]
      }
      quran_surah: {
        Row: {
          id: number
          jumlah_ayat: number
          nama_arab: string
          nama_latin: string
        }
        Insert: {
          id: number
          jumlah_ayat: number
          nama_arab: string
          nama_latin: string
        }
        Update: {
          id?: number
          jumlah_ayat?: number
          nama_arab?: string
          nama_latin?: string
        }
        Relationships: []
      }
      santri: {
        Row: {
          aktif: boolean
          catatan: string
          halaqah_id: string | null
          id: string
          jalur: string
          kelas: string
          nama: string
          nis: string
          posisi_hafalan_ayat_id: number | null
        }
        Insert: {
          aktif?: boolean
          catatan?: string
          halaqah_id?: string | null
          id?: string
          jalur: string
          kelas: string
          nama: string
          nis: string
          posisi_hafalan_ayat_id?: number | null
        }
        Update: {
          aktif?: boolean
          catatan?: string
          halaqah_id?: string | null
          id?: string
          jalur?: string
          kelas?: string
          nama?: string
          nis?: string
          posisi_hafalan_ayat_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "santri_halaqah_id_fkey"
            columns: ["halaqah_id"]
            isOneToOne: false
            referencedRelation: "halaqah"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "santri_posisi_hafalan_ayat_id_fkey"
            columns: ["posisi_hafalan_ayat_id"]
            isOneToOne: false
            referencedRelation: "quran_ayat"
            referencedColumns: ["id"]
          },
        ]
      }
      setoran: {
        Row: {
          catatan: string
          created_at: string
          dari_ayat_id: number
          diisi_oleh: string
          diparaf_oleh: string | null
          diparaf_pada: string | null
          disimak: boolean
          id: string
          jenis: string
          jumlah_baris: number
          kali_ulang: number
          nilai: string | null
          sampai_ayat_id: number
          santri_id: string
          tanggal: string
          tempat: string
        }
        Insert: {
          catatan?: string
          created_at?: string
          dari_ayat_id: number
          diisi_oleh?: string
          diparaf_oleh?: string | null
          diparaf_pada?: string | null
          disimak?: boolean
          id?: string
          jenis: string
          jumlah_baris?: number
          kali_ulang?: number
          nilai?: string | null
          sampai_ayat_id: number
          santri_id: string
          tanggal: string
          tempat: string
        }
        Update: {
          catatan?: string
          created_at?: string
          dari_ayat_id?: number
          diisi_oleh?: string
          diparaf_oleh?: string | null
          diparaf_pada?: string | null
          disimak?: boolean
          id?: string
          jenis?: string
          jumlah_baris?: number
          kali_ulang?: number
          nilai?: string | null
          sampai_ayat_id?: number
          santri_id?: string
          tanggal?: string
          tempat?: string
        }
        Relationships: [
          {
            foreignKeyName: "setoran_dari_ayat_id_fkey"
            columns: ["dari_ayat_id"]
            isOneToOne: false
            referencedRelation: "quran_ayat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_diisi_oleh_fkey"
            columns: ["diisi_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_diparaf_oleh_fkey"
            columns: ["diparaf_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_sampai_ayat_id_fkey"
            columns: ["sampai_ayat_id"]
            isOneToOne: false
            referencedRelation: "quran_ayat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_santri_id_fkey"
            columns: ["santri_id"]
            isOneToOne: false
            referencedRelation: "santri"
            referencedColumns: ["id"]
          },
        ]
      }
      setoran_iqro: {
        Row: {
          catatan: string
          created_at: string
          diisi_oleh: string
          diparaf_oleh: string | null
          diparaf_pada: string | null
          disimak: boolean
          halaman_dari: number
          halaman_sampai: number
          id: string
          jilid: number
          kali_ulang: number
          nilai: string | null
          santri_id: string
          tanggal: string
          tempat: string
        }
        Insert: {
          catatan?: string
          created_at?: string
          diisi_oleh?: string
          diparaf_oleh?: string | null
          diparaf_pada?: string | null
          disimak?: boolean
          halaman_dari: number
          halaman_sampai: number
          id?: string
          jilid: number
          kali_ulang?: number
          nilai?: string | null
          santri_id: string
          tanggal: string
          tempat: string
        }
        Update: {
          catatan?: string
          created_at?: string
          diisi_oleh?: string
          diparaf_oleh?: string | null
          diparaf_pada?: string | null
          disimak?: boolean
          halaman_dari?: number
          halaman_sampai?: number
          id?: string
          jilid?: number
          kali_ulang?: number
          nilai?: string | null
          santri_id?: string
          tanggal?: string
          tempat?: string
        }
        Relationships: [
          {
            foreignKeyName: "setoran_iqro_diisi_oleh_fkey"
            columns: ["diisi_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_iqro_diparaf_oleh_fkey"
            columns: ["diparaf_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_iqro_santri_id_fkey"
            columns: ["santri_id"]
            isOneToOne: false
            referencedRelation: "santri"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wali_santri: {
        Row: {
          santri_id: string
          wali_id: string
        }
        Insert: {
          santri_id: string
          wali_id: string
        }
        Update: {
          santri_id?: string
          wali_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wali_santri_santri_id_fkey"
            columns: ["santri_id"]
            isOneToOne: false
            referencedRelation: "santri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wali_santri_wali_id_fkey"
            columns: ["wali_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_halaqah: { Args: { _halaqah: string }; Returns: boolean }
      can_read_santri: { Args: { _santri: string }; Returns: boolean }
      can_teach_santri: { Args: { _santri: string }; Returns: boolean }
      consent_ready: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_child: { Args: { _santri: string }; Returns: boolean }
      teaches_halaqah: { Args: { _halaqah: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "ustadz" | "badal" | "pengawas" | "wali"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "ustadz", "badal", "pengawas", "wali"],
    },
  },
} as const
