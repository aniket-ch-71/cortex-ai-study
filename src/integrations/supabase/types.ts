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
      daily_challenges: {
        Row: {
          challenge_date: string
          completed_count: number
          created_at: string
          id: string
          kind: string
          target_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_date?: string
          completed_count?: number
          created_at?: string
          id?: string
          kind?: string
          target_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_date?: string
          completed_count?: number
          created_at?: string
          id?: string
          kind?: string
          target_count?: number
          updated_at?: string
          user_id?: string
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
      mistake_book: {
        Row: {
          chapter: string | null
          concept: string | null
          correct_index: number | null
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          last_wrong_at: string
          options: Json
          question: string
          question_id: string
          status: string
          subject: string | null
          times_attempted: number
          times_wrong: number
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter?: string | null
          concept?: string | null
          correct_index?: number | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          last_wrong_at?: string
          options?: Json
          question: string
          question_id: string
          status?: string
          subject?: string | null
          times_attempted?: number
          times_wrong?: number
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter?: string | null
          concept?: string | null
          correct_index?: number | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          last_wrong_at?: string
          options?: Json
          question?: string
          question_id?: string
          status?: string
          subject?: string | null
          times_attempted?: number
          times_wrong?: number
          topic?: string | null
          updated_at?: string
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
          best_streak: number
          city: string | null
          created_at: string
          exam_date: string | null
          exam_goal_type: string | null
          exam_goal_value: number | null
          exams: Json
          full_name: string | null
          has_reviewed: boolean
          id: string
          language: string
          last_active: string | null
          last_streak_date: string | null
          onboarded: boolean
          primary_exam: string | null
          referral_code: string | null
          referral_count: number
          show_current_affairs: boolean
          state: string | null
          streak: number
          streak_freeze_week_start: string | null
          streak_freezes_used_week: number
          target_exam: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          best_streak?: number
          city?: string | null
          created_at?: string
          exam_date?: string | null
          exam_goal_type?: string | null
          exam_goal_value?: number | null
          exams?: Json
          full_name?: string | null
          has_reviewed?: boolean
          id: string
          language?: string
          last_active?: string | null
          last_streak_date?: string | null
          onboarded?: boolean
          primary_exam?: string | null
          referral_code?: string | null
          referral_count?: number
          show_current_affairs?: boolean
          state?: string | null
          streak?: number
          streak_freeze_week_start?: string | null
          streak_freezes_used_week?: number
          target_exam?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          best_streak?: number
          city?: string | null
          created_at?: string
          exam_date?: string | null
          exam_goal_type?: string | null
          exam_goal_value?: number | null
          exams?: Json
          full_name?: string | null
          has_reviewed?: boolean
          id?: string
          language?: string
          last_active?: string | null
          last_streak_date?: string | null
          onboarded?: boolean
          primary_exam?: string | null
          referral_code?: string | null
          referral_count?: number
          show_current_affairs?: boolean
          state?: string | null
          streak?: number
          streak_freeze_week_start?: string | null
          streak_freezes_used_week?: number
          target_exam?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          attempt_id: string | null
          chapter: string | null
          concept: string | null
          concept_importance: string | null
          correct_index: number | null
          created_at: string
          difficulty: string | null
          estimated_time_seconds: number | null
          exam_frequency: string | null
          id: string
          is_correct: boolean
          is_pyq: boolean | null
          is_skipped: boolean
          marked_review: boolean
          question_id: string
          selected_index: number | null
          source_type: string | null
          subject: string | null
          test_id: string | null
          time_taken_seconds: number
          topic: string | null
          user_id: string
          weightage: string | null
        }
        Insert: {
          attempt_id?: string | null
          chapter?: string | null
          concept?: string | null
          concept_importance?: string | null
          correct_index?: number | null
          created_at?: string
          difficulty?: string | null
          estimated_time_seconds?: number | null
          exam_frequency?: string | null
          id?: string
          is_correct?: boolean
          is_pyq?: boolean | null
          is_skipped?: boolean
          marked_review?: boolean
          question_id: string
          selected_index?: number | null
          source_type?: string | null
          subject?: string | null
          test_id?: string | null
          time_taken_seconds?: number
          topic?: string | null
          user_id: string
          weightage?: string | null
        }
        Update: {
          attempt_id?: string | null
          chapter?: string | null
          concept?: string | null
          concept_importance?: string | null
          correct_index?: number | null
          created_at?: string
          difficulty?: string | null
          estimated_time_seconds?: number | null
          exam_frequency?: string | null
          id?: string
          is_correct?: boolean
          is_pyq?: boolean | null
          is_skipped?: boolean
          marked_review?: boolean
          question_id?: string
          selected_index?: number | null
          source_type?: string | null
          subject?: string | null
          test_id?: string | null
          time_taken_seconds?: number
          topic?: string | null
          user_id?: string
          weightage?: string | null
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          concept_importance: string | null
          correct_index: number
          created_at: string
          diagram_url: string | null
          difficulty: string
          exam: string
          exam_frequency: string | null
          explanation: string
          id: string
          is_pyq: boolean
          language: string
          options: Json
          pyq_year: number | null
          question: string
          question_hash: string | null
          source_type: string
          sub_exam: string
          subject: string
          svg_diagram: string | null
          topic: string | null
          weightage: string | null
        }
        Insert: {
          concept_importance?: string | null
          correct_index: number
          created_at?: string
          diagram_url?: string | null
          difficulty?: string
          exam: string
          exam_frequency?: string | null
          explanation?: string
          id?: string
          is_pyq?: boolean
          language?: string
          options: Json
          pyq_year?: number | null
          question: string
          question_hash?: string | null
          source_type?: string
          sub_exam: string
          subject: string
          svg_diagram?: string | null
          topic?: string | null
          weightage?: string | null
        }
        Update: {
          concept_importance?: string | null
          correct_index?: number
          created_at?: string
          diagram_url?: string | null
          difficulty?: string
          exam?: string
          exam_frequency?: string | null
          explanation?: string
          id?: string
          is_pyq?: boolean
          language?: string
          options?: Json
          pyq_year?: number | null
          question?: string
          question_hash?: string | null
          source_type?: string
          sub_exam?: string
          subject?: string
          svg_diagram?: string | null
          topic?: string | null
          weightage?: string | null
        }
        Relationships: []
      }
      question_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          question_hash: string
          question_snapshot: Json
          reason: Database["public"]["Enums"]["report_reason"]
          status: Database["public"]["Enums"]["report_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          question_hash: string
          question_snapshot: Json
          reason: Database["public"]["Enums"]["report_reason"]
          status?: Database["public"]["Enums"]["report_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          question_hash?: string
          question_snapshot?: Json
          reason?: Database["public"]["Enums"]["report_reason"]
          status?: Database["public"]["Enums"]["report_status"]
          user_id?: string
        }
        Relationships: []
      }
      readiness_snapshots: {
        Row: {
          created_at: string
          drivers: Json
          id: string
          overall: number
          snapshot_date: string
          subjects: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          drivers?: Json
          id?: string
          overall?: number
          snapshot_date?: string
          subjects?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          drivers?: Json
          id?: string
          overall?: number
          snapshot_date?: string
          subjects?: Json
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
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
      revision_packs: {
        Row: {
          completed_at: string | null
          created_at: string
          estimated_minutes: number
          id: string
          payload: Json
          question_count: number
          score: number | null
          seed_params: Json
          seed_type: Database["public"]["Enums"]["pack_seed"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          payload: Json
          question_count: number
          score?: number | null
          seed_params?: Json
          seed_type: Database["public"]["Enums"]["pack_seed"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          payload?: Json
          question_count?: number
          score?: number | null
          seed_params?: Json
          seed_type?: Database["public"]["Enums"]["pack_seed"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_questions: {
        Row: {
          chapter: string | null
          concept: string | null
          correct_index: number
          created_at: string
          difficulty: string | null
          exam_frequency: string | null
          explanation: string | null
          id: string
          is_pyq: boolean | null
          next_review_at: string | null
          note: string | null
          options: Json
          pyq_year: number | null
          question: string
          question_hash: string
          source_type: string | null
          subject: string | null
          tag: Database["public"]["Enums"]["vault_tag"]
          topic: string | null
          updated_at: string
          user_id: string
          weightage: string | null
        }
        Insert: {
          chapter?: string | null
          concept?: string | null
          correct_index: number
          created_at?: string
          difficulty?: string | null
          exam_frequency?: string | null
          explanation?: string | null
          id?: string
          is_pyq?: boolean | null
          next_review_at?: string | null
          note?: string | null
          options: Json
          pyq_year?: number | null
          question: string
          question_hash: string
          source_type?: string | null
          subject?: string | null
          tag?: Database["public"]["Enums"]["vault_tag"]
          topic?: string | null
          updated_at?: string
          user_id: string
          weightage?: string | null
        }
        Update: {
          chapter?: string | null
          concept?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: string | null
          exam_frequency?: string | null
          explanation?: string | null
          id?: string
          is_pyq?: boolean | null
          next_review_at?: string | null
          note?: string | null
          options?: Json
          pyq_year?: number | null
          question?: string
          question_hash?: string
          source_type?: string | null
          subject?: string | null
          tag?: Database["public"]["Enums"]["vault_tag"]
          topic?: string | null
          updated_at?: string
          user_id?: string
          weightage?: string | null
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
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          kind: string
          meta: Json | null
          questions_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          kind: string
          meta?: Json | null
          questions_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          kind?: string
          meta?: Json | null
          questions_count?: number
          user_id?: string
        }
        Relationships: []
      }
      topic_mastery: {
        Row: {
          accuracy: number
          attempts: number
          avg_time_seconds: number
          chapter: string | null
          confidence_score: number
          correct: number
          created_at: string
          id: string
          last_revised_at: string | null
          last_studied_at: string | null
          retention_score: number
          strength: string
          subject: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number
          attempts?: number
          avg_time_seconds?: number
          chapter?: string | null
          confidence_score?: number
          correct?: number
          created_at?: string
          id?: string
          last_revised_at?: string | null
          last_studied_at?: string | null
          retention_score?: number
          strength?: string
          subject: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number
          attempts?: number
          avg_time_seconds?: number
          chapter?: string | null
          confidence_score?: number
          correct?: number
          created_at?: string
          id?: string
          last_revised_at?: string | null
          last_studied_at?: string | null
          retention_score?: number
          strength?: string
          subject?: string
          topic?: string
          updated_at?: string
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
      weekly_goals: {
        Row: {
          completed_minutes: number
          completed_mocks: number
          completed_questions: number
          created_at: string
          id: string
          target_minutes: number
          target_mocks: number
          target_questions: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          completed_minutes?: number
          completed_mocks?: number
          completed_questions?: number
          created_at?: string
          id?: string
          target_minutes?: number
          target_mocks?: number
          target_questions?: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          completed_minutes?: number
          completed_mocks?: number
          completed_questions?: number
          created_at?: string
          id?: string
          target_minutes?: number
          target_mocks?: number
          target_questions?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_daily_usage: {
        Args: { _kind: string; _limit: number; _user_id: string }
        Returns: boolean
      }
      bump_streak: { Args: { _user_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      public_stats: { Args: never; Returns: Json }
      redeem_referral: { Args: { _code: string }; Returns: boolean }
      username_available: { Args: { uname: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "super_admin"
        | "moderator"
        | "content_creator"
        | "reviewer"
      pack_seed: "mistakes" | "weak" | "confidence" | "due" | "topic" | "mixed"
      report_reason:
        | "wrong_answer"
        | "wrong_explanation"
        | "wrong_diagram"
        | "duplicate"
        | "outdated"
      report_status: "open" | "reviewed" | "dismissed"
      vault_tag: "save" | "important" | "revise_later" | "favorite"
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
      app_role: [
        "admin",
        "user",
        "super_admin",
        "moderator",
        "content_creator",
        "reviewer",
      ],
      pack_seed: ["mistakes", "weak", "confidence", "due", "topic", "mixed"],
      report_reason: [
        "wrong_answer",
        "wrong_explanation",
        "wrong_diagram",
        "duplicate",
        "outdated",
      ],
      report_status: ["open", "reviewed", "dismissed"],
      vault_tag: ["save", "important", "revise_later", "favorite"],
    },
  },
} as const
