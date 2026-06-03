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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      current_affairs: {
        Row: {
          date: string
          generated_at: string
          id: string
          items: Json
        }
        Insert: {
          date: string
          generated_at?: string
          id?: string
          items: Json
        }
        Update: {
          date?: string
          generated_at?: string
          id?: string
          items?: Json
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          ai_tests_used: number
          doubts_used: number
          usage_date: string
          user_id: string
        }
        Insert: {
          ai_tests_used?: number
          doubts_used?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          ai_tests_used?: number
          doubts_used?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      doubts: {
        Row: {
          answer: string
          created_at: string
          id: string
          language: string
          question: string
          subject: string | null
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          language?: string
          question: string
          subject?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          language?: string
          question?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mock_attempts: {
        Row: {
          answers: Json
          breakdown: Json | null
          completed_at: string
          id: string
          marked_for_review: Json | null
          score: number
          test_id: string
          time_taken_seconds: number
          total: number
          user_id: string
        }
        Insert: {
          answers: Json
          breakdown?: Json | null
          completed_at?: string
          id?: string
          marked_for_review?: Json | null
          score: number
          test_id: string
          time_taken_seconds?: number
          total: number
          user_id: string
        }
        Update: {
          answers?: Json
          breakdown?: Json | null
          completed_at?: string
          id?: string
          marked_for_review?: Json | null
          score?: number
          test_id?: string
          time_taken_seconds?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          created_at: string
          difficulty: string
          exam: string | null
          id: string
          language: string
          num_questions: number
          pattern: Json | null
          questions: Json
          subject: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          exam?: string | null
          id?: string
          language?: string
          num_questions: number
          pattern?: Json | null
          questions: Json
          subject: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          exam?: string | null
          id?: string
          language?: string
          num_questions?: number
          pattern?: Json | null
          questions?: Json
          subject?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      note_analyses: {
        Row: {
          created_at: string
          feedback: Json
          id: string
          input_text: string
          score: number
          subject: string | null
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: Json
          id?: string
          input_text: string
          score: number
          subject?: string | null
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: Json
          id?: string
          input_text?: string
          score?: number
          subject?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          exam: string | null
          flashcards: Json
          id: string
          language: string
          style: string
          subject: string
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          exam?: string | null
          flashcards?: Json
          id?: string
          language?: string
          style?: string
          subject: string
          title: string
          topic: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          exam?: string | null
          flashcards?: Json
          id?: string
          language?: string
          style?: string
          subject?: string
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          exams: Json
          full_name: string | null
          has_reviewed: boolean
          id: string
          language: string
          last_active: string | null
          onboarded: boolean
          primary_exam: string | null
          show_current_affairs: boolean
          state: string | null
          streak: number
          target_exam: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          exams?: Json
          full_name?: string | null
          has_reviewed?: boolean
          id: string
          language?: string
          last_active?: string | null
          onboarded?: boolean
          primary_exam?: string | null
          show_current_affairs?: boolean
          state?: string | null
          streak?: number
          target_exam?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          exams?: Json
          full_name?: string | null
          has_reviewed?: boolean
          id?: string
          language?: string
          last_active?: string | null
          onboarded?: boolean
          primary_exam?: string | null
          show_current_affairs?: boolean
          state?: string | null
          streak?: number
          target_exam?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          correct_index: number
          created_at: string
          difficulty: string
          exam: string
          explanation: string
          id: string
          language: string
          options: Json
          question: string
          sub_exam: string
          subject: string
          topic: string | null
        }
        Insert: {
          correct_index: number
          created_at?: string
          difficulty?: string
          exam: string
          explanation?: string
          id?: string
          language?: string
          options: Json
          question: string
          sub_exam: string
          subject: string
          topic?: string | null
        }
        Update: {
          correct_index?: number
          created_at?: string
          difficulty?: string
          exam?: string
          explanation?: string
          id?: string
          language?: string
          options?: Json
          question?: string
          sub_exam?: string
          subject?: string
          topic?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          display: boolean
          exam: string | null
          id: string
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display?: boolean
          exam?: string | null
          id?: string
          rating: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display?: boolean
          exam?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          exam: string
          exam_date: string | null
          hours_per_day: number
          id: string
          plan: Json
          subjects: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam: string
          exam_date?: string | null
          hours_per_day?: number
          id?: string
          plan: Json
          subjects?: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam?: string
          exam_date?: string | null
          hours_per_day?: number
          id?: string
          plan?: Json
          subjects?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      public_stats: { Args: never; Returns: Json }
      username_available: { Args: { uname: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
