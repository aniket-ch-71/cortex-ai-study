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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bulk_import_errors: {
        Row: {
          code: string
          created_at: string
          field: string | null
          id: number
          job_id: string
          message: string
          raw: Json | null
          row_index: number
        }
        Insert: {
          code: string
          created_at?: string
          field?: string | null
          id?: number
          job_id: string
          message: string
          raw?: Json | null
          row_index: number
        }
        Update: {
          code?: string
          created_at?: string
          field?: string | null
          id?: number
          job_id?: string
          message?: string
          raw?: Json | null
          row_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_import_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bulk_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_import_history: {
        Row: {
          action: string
          created_at: string
          id: number
          job_id: string
          previous_snapshot: Json | null
          question_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          job_id: string
          previous_snapshot?: Json | null
          question_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          job_id?: string
          previous_snapshot?: Json | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_import_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bulk_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_import_jobs: {
        Row: {
          column_map: Json | null
          created_at: string
          created_by: string | null
          current_phase: string | null
          duplicates: number
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          format: string
          id: string
          options: Json
          progress_pct: number
          rows_failed: number
          rows_found: number
          rows_imported: number
          rows_invalid: number
          rows_valid: number
          source_filename: string
          source_path: string | null
          source_size: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          column_map?: Json | null
          created_at?: string
          created_by?: string | null
          current_phase?: string | null
          duplicates?: number
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          format: string
          id?: string
          options?: Json
          progress_pct?: number
          rows_failed?: number
          rows_found?: number
          rows_imported?: number
          rows_invalid?: number
          rows_valid?: number
          source_filename: string
          source_path?: string | null
          source_size?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          column_map?: Json | null
          created_at?: string
          created_by?: string | null
          current_phase?: string | null
          duplicates?: number
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          format?: string
          id?: string
          options?: Json
          progress_pct?: number
          rows_failed?: number
          rows_found?: number
          rows_imported?: number
          rows_invalid?: number
          rows_valid?: number
          source_filename?: string
          source_path?: string | null
          source_size?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_import_logs: {
        Row: {
          created_at: string
          id: number
          job_id: string
          level: string
          message: string
          meta: Json | null
          phase: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          job_id: string
          level?: string
          message: string
          meta?: Json | null
          phase?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          job_id?: string
          level?: string
          message?: string
          meta?: Json | null
          phase?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_import_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bulk_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_schedule: {
        Row: {
          created_at: string
          created_by: string
          publish_at: string
          question_id: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          publish_at: string
          question_id: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          publish_at?: string
          question_id?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_schedule_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
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
      media_library: {
        Row: {
          alt: string | null
          bucket: string
          checksum: string | null
          created_at: string
          deleted_at: string | null
          filename: string
          folder: string
          height: number | null
          id: string
          mime: string
          path: string
          size_bytes: number
          tags: string[]
          thumbnail_path: string | null
          updated_at: string
          uploaded_by: string | null
          version: number
          width: number | null
        }
        Insert: {
          alt?: string | null
          bucket?: string
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          filename: string
          folder?: string
          height?: number | null
          id?: string
          mime: string
          path: string
          size_bytes: number
          tags?: string[]
          thumbnail_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
          width?: number | null
        }
        Update: {
          alt?: string | null
          bucket?: string
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          filename?: string
          folder?: string
          height?: number | null
          id?: string
          mime?: string
          path?: string
          size_bytes?: number
          tags?: string[]
          thumbnail_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
          width?: number | null
        }
        Relationships: []
      }
      media_usage: {
        Row: {
          created_at: string
          id: string
          media_id: string
          option_index: number | null
          question_id: string
          usage_kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          option_index?: number | null
          question_id: string
          usage_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          option_index?: number | null
          question_id?: string
          usage_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_usage_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_usage_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      media_versions: {
        Row: {
          checksum: string | null
          created_at: string
          id: string
          media_id: string
          path: string
          size_bytes: number | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          id?: string
          media_id: string
          path: string
          size_bytes?: number | null
          uploaded_by?: string | null
          version: number
        }
        Update: {
          checksum?: string | null
          created_at?: string
          id?: string
          media_id?: string
          path?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_versions_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
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
      question_ai_reviews: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          model: string
          question_id: string
          score: number | null
          verdict: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          model: string
          question_id: string
          score?: number | null
          verdict: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string
          question_id?: string
          score?: number | null
          verdict?: Json
        }
        Relationships: [
          {
            foreignKeyName: "question_ai_reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      question_assignments: {
        Row: {
          assigned_by: string
          assigned_to: string
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["assignment_priority"]
          question_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["assignment_priority"]
          question_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["assignment_priority"]
          question_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_assignments_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
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
          ai_review: Json | null
          archived: boolean
          archived_at: string | null
          assigned_at: string | null
          assigned_to: string | null
          author_id: string | null
          chapter: string | null
          concept: string | null
          concept_importance: string | null
          correct_index: number
          correct_indices: number[] | null
          created_at: string
          deleted_at: string | null
          diagram_url: string | null
          difficulty: string
          estimated_time_seconds: number | null
          exam: string
          exam_frequency: string | null
          explanation: string
          id: string
          is_pyq: boolean
          language: string
          marks: number
          negative_marks: number
          numerical_answer: number | null
          options: Json
          published_at: string | null
          pyq_year: number | null
          quality_score: number | null
          quality_score_breakdown: Json | null
          question: string
          question_hash: string | null
          question_type: string
          reviewer_id: string | null
          scheduled_publish_at: string | null
          solution_image_url: string | null
          source_type: string
          status: string
          sub_exam: string
          sub_topic: string | null
          subject: string
          svg_diagram: string | null
          tags: string[]
          topic: string | null
          updated_at: string
          version: number
          weightage: string | null
          workflow_state: Database["public"]["Enums"]["workflow_state"]
        }
        Insert: {
          ai_review?: Json | null
          archived?: boolean
          archived_at?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          author_id?: string | null
          chapter?: string | null
          concept?: string | null
          concept_importance?: string | null
          correct_index: number
          correct_indices?: number[] | null
          created_at?: string
          deleted_at?: string | null
          diagram_url?: string | null
          difficulty?: string
          estimated_time_seconds?: number | null
          exam: string
          exam_frequency?: string | null
          explanation?: string
          id?: string
          is_pyq?: boolean
          language?: string
          marks?: number
          negative_marks?: number
          numerical_answer?: number | null
          options: Json
          published_at?: string | null
          pyq_year?: number | null
          quality_score?: number | null
          quality_score_breakdown?: Json | null
          question: string
          question_hash?: string | null
          question_type?: string
          reviewer_id?: string | null
          scheduled_publish_at?: string | null
          solution_image_url?: string | null
          source_type?: string
          status?: string
          sub_exam: string
          sub_topic?: string | null
          subject: string
          svg_diagram?: string | null
          tags?: string[]
          topic?: string | null
          updated_at?: string
          version?: number
          weightage?: string | null
          workflow_state?: Database["public"]["Enums"]["workflow_state"]
        }
        Update: {
          ai_review?: Json | null
          archived?: boolean
          archived_at?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          author_id?: string | null
          chapter?: string | null
          concept?: string | null
          concept_importance?: string | null
          correct_index?: number
          correct_indices?: number[] | null
          created_at?: string
          deleted_at?: string | null
          diagram_url?: string | null
          difficulty?: string
          estimated_time_seconds?: number | null
          exam?: string
          exam_frequency?: string | null
          explanation?: string
          id?: string
          is_pyq?: boolean
          language?: string
          marks?: number
          negative_marks?: number
          numerical_answer?: number | null
          options?: Json
          published_at?: string | null
          pyq_year?: number | null
          quality_score?: number | null
          quality_score_breakdown?: Json | null
          question?: string
          question_hash?: string | null
          question_type?: string
          reviewer_id?: string | null
          scheduled_publish_at?: string | null
          solution_image_url?: string | null
          source_type?: string
          status?: string
          sub_exam?: string
          sub_topic?: string | null
          subject?: string
          svg_diagram?: string | null
          tags?: string[]
          topic?: string | null
          updated_at?: string
          version?: number
          weightage?: string | null
          workflow_state?: Database["public"]["Enums"]["workflow_state"]
        }
        Relationships: []
      }
      question_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          mentions: string[]
          parent_id: string | null
          question_id: string
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          mentions?: string[]
          parent_id?: string | null
          question_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          mentions?: string[]
          parent_id?: string | null
          question_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "question_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_comments_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
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
      question_reviews: {
        Row: {
          attachments: Json
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          next_state: Database["public"]["Enums"]["workflow_state"] | null
          notes: string | null
          prev_state: Database["public"]["Enums"]["workflow_state"] | null
          question_id: string
          reviewer_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          next_state?: Database["public"]["Enums"]["workflow_state"] | null
          notes?: string | null
          prev_state?: Database["public"]["Enums"]["workflow_state"] | null
          question_id: string
          reviewer_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          next_state?: Database["public"]["Enums"]["workflow_state"] | null
          notes?: string | null
          prev_state?: Database["public"]["Enums"]["workflow_state"] | null
          question_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      question_versions: {
        Row: {
          change_note: string | null
          changed_by: string | null
          created_at: string
          id: string
          question_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          question_id: string
          snapshot: Json
          version: number
        }
        Update: {
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          question_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
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
      admin_rollback_import: { Args: { _job_id: string }; Returns: Json }
      assign_question: {
        Args: {
          _due: string
          _notes: string
          _priority: Database["public"]["Enums"]["assignment_priority"]
          _qid: string
          _to_user: string
        }
        Returns: string
      }
      bump_daily_usage: {
        Args: { _kind: string; _limit: number; _user_id: string }
        Returns: boolean
      }
      bump_streak: { Args: { _user_id: string }; Returns: undefined }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      mark_notifications_read: { Args: { _ids: string[] }; Returns: number }
      public_stats: { Args: never; Returns: Json }
      publish_due_scheduled: { Args: never; Returns: number }
      redeem_referral: { Args: { _code: string }; Returns: boolean }
      schedule_question: {
        Args: { _publish_at: string; _qid: string; _tz: string }
        Returns: undefined
      }
      transition_question_state: {
        Args: {
          _note?: string
          _qid: string
          _to: Database["public"]["Enums"]["workflow_state"]
        }
        Returns: Database["public"]["Enums"]["workflow_state"]
      }
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
      assignment_priority: "low" | "normal" | "high" | "urgent"
      assignment_status:
        | "open"
        | "in_progress"
        | "submitted"
        | "completed"
        | "cancelled"
      notification_type:
        | "assignment"
        | "review_requested"
        | "review_completed"
        | "published"
        | "import_finished"
        | "media_updated"
        | "mention"
      pack_seed: "mistakes" | "weak" | "confidence" | "due" | "topic" | "mixed"
      report_reason:
        | "wrong_answer"
        | "wrong_explanation"
        | "wrong_diagram"
        | "duplicate"
        | "outdated"
      report_status: "open" | "reviewed" | "dismissed"
      review_decision: "approve" | "reject" | "request_changes" | "note"
      vault_tag: "save" | "important" | "revise_later" | "favorite"
      workflow_state:
        | "draft"
        | "ai_review"
        | "human_review"
        | "fact_check"
        | "approved"
        | "scheduled"
        | "published"
        | "archived"
        | "deprecated"
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
      assignment_priority: ["low", "normal", "high", "urgent"],
      assignment_status: [
        "open",
        "in_progress",
        "submitted",
        "completed",
        "cancelled",
      ],
      notification_type: [
        "assignment",
        "review_requested",
        "review_completed",
        "published",
        "import_finished",
        "media_updated",
        "mention",
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
      review_decision: ["approve", "reject", "request_changes", "note"],
      vault_tag: ["save", "important", "revise_later", "favorite"],
      workflow_state: [
        "draft",
        "ai_review",
        "human_review",
        "fact_check",
        "approved",
        "scheduled",
        "published",
        "archived",
        "deprecated",
      ],
    },
  },
} as const
