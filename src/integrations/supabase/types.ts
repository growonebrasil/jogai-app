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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          id: string
          processed_at: string | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          processed_at?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_flip_results: {
        Row: {
          admin_id: string | null
          captain_cara_id: string | null
          captain_coroa_id: string | null
          coin_result: string
          created_at: string
          id: string
          losing_team_id: string | null
          losing_team_name: string | null
          match_id: string
          occurrence_id: string | null
          pelada_id: string
          team_cara_id: string | null
          team_cara_name: string | null
          team_coroa_id: string | null
          team_coroa_name: string | null
          winning_team_id: string | null
          winning_team_name: string | null
        }
        Insert: {
          admin_id?: string | null
          captain_cara_id?: string | null
          captain_coroa_id?: string | null
          coin_result: string
          created_at?: string
          id?: string
          losing_team_id?: string | null
          losing_team_name?: string | null
          match_id: string
          occurrence_id?: string | null
          pelada_id: string
          team_cara_id?: string | null
          team_cara_name?: string | null
          team_coroa_id?: string | null
          team_coroa_name?: string | null
          winning_team_id?: string | null
          winning_team_name?: string | null
        }
        Update: {
          admin_id?: string | null
          captain_cara_id?: string | null
          captain_coroa_id?: string | null
          coin_result?: string
          created_at?: string
          id?: string
          losing_team_id?: string | null
          losing_team_name?: string | null
          match_id?: string
          occurrence_id?: string | null
          pelada_id?: string
          team_cara_id?: string | null
          team_cara_name?: string | null
          team_coroa_id?: string | null
          team_coroa_name?: string | null
          winning_team_id?: string | null
          winning_team_name?: string | null
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          caption: string | null
          city: string | null
          comments_count: number
          country: string | null
          created_at: string
          id: string
          likes_count: number
          media_type: string
          media_urls: string[]
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          city?: string | null
          comments_count?: number
          country?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          media_type?: string
          media_urls?: string[]
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          city?: string | null
          comments_count?: number
          country?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          media_type?: string
          media_urls?: string[]
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      legal_consents: {
        Row: {
          accepted_at: string
          cookie_preferences: Json
          cookies_version: string
          id: string
          ip_address: string | null
          privacy_version: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          cookie_preferences?: Json
          cookies_version: string
          id?: string
          ip_address?: string | null
          privacy_version: string
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          cookie_preferences?: Json
          cookies_version?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content_md: string
          created_at: string
          id: string
          is_current: boolean
          kind: string
          published_at: string
          version: string
        }
        Insert: {
          content_md: string
          created_at?: string
          id?: string
          is_current?: boolean
          kind: string
          published_at?: string
          version: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          is_current?: boolean
          kind?: string
          published_at?: string
          version?: string
        }
        Relationships: []
      }
      match_award_votes: {
        Row: {
          award_type: string
          created_at: string
          id: string
          match_id: string
          voted_member_id: string
          voter_id: string
        }
        Insert: {
          award_type: string
          created_at?: string
          id?: string
          match_id: string
          voted_member_id: string
          voter_id: string
        }
        Update: {
          award_type?: string
          created_at?: string
          id?: string
          match_id?: string
          voted_member_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_award_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_award_votes_voted_member_id_fkey"
            columns: ["voted_member_id"]
            isOneToOne: false
            referencedRelation: "pelada_members"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          match_id: string
          minute: number | null
          occurrence_id: string | null
          pelada_id: string
          pelada_member_id: string
          recorded_by: string | null
          team: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          match_id: string
          minute?: number | null
          occurrence_id?: string | null
          pelada_id: string
          pelada_member_id: string
          recorded_by?: string | null
          team?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          match_id?: string
          minute?: number | null
          occurrence_id?: string | null
          pelada_id?: string
          pelada_member_id?: string
          recorded_by?: string | null
          team?: string | null
        }
        Relationships: []
      }
      match_stats: {
        Row: {
          assists: number
          created_at: string
          goals: number
          id: string
          match_id: string
          pelada_member_id: string
          red_cards: number
          yellow_cards: number
        }
        Insert: {
          assists?: number
          created_at?: string
          goals?: number
          id?: string
          match_id: string
          pelada_member_id: string
          red_cards?: number
          yellow_cards?: number
        }
        Update: {
          assists?: number
          created_at?: string
          goals?: number
          id?: string
          match_id?: string
          pelada_member_id?: string
          red_cards?: number
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_stats_pelada_member_id_fkey"
            columns: ["pelada_member_id"]
            isOneToOne: false
            referencedRelation: "pelada_members"
            referencedColumns: ["id"]
          },
        ]
      }
      match_teams: {
        Row: {
          created_at: string
          id: string
          match_id: string
          pelada_member_id: string
          team: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          pelada_member_id: string
          team: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          pelada_member_id?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_teams_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_teams_pelada_member_id_fkey"
            columns: ["pelada_member_id"]
            isOneToOne: false
            referencedRelation: "pelada_members"
            referencedColumns: ["id"]
          },
        ]
      }
      match_votes: {
        Row: {
          created_at: string
          id: string
          match_id: string
          rated_member_id: string
          stars: number
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          rated_member_id: string
          stars: number
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          rated_member_id?: string
          stars?: number
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_rated_member_id_fkey"
            columns: ["rated_member_id"]
            isOneToOne: false
            referencedRelation: "pelada_members"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          added_time_seconds: number | null
          coin_flip_winner_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_finished: boolean
          is_paused: boolean
          match_number: number
          occurrence_id: string | null
          paused_at: string | null
          paused_seconds: number | null
          pelada_id: string
          started_at: string | null
          team_a_id: string | null
          team_a_score: number
          team_b_id: string | null
          team_b_score: number
          voting_deadline: string | null
          voting_finalized: boolean
          voting_finalized_at: string | null
          voting_open: boolean
          winner_team_id: string | null
        }
        Insert: {
          added_time_seconds?: number | null
          coin_flip_winner_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_finished?: boolean
          is_paused?: boolean
          match_number?: number
          occurrence_id?: string | null
          paused_at?: string | null
          paused_seconds?: number | null
          pelada_id: string
          started_at?: string | null
          team_a_id?: string | null
          team_a_score?: number
          team_b_id?: string | null
          team_b_score?: number
          voting_deadline?: string | null
          voting_finalized?: boolean
          voting_finalized_at?: string | null
          voting_open?: boolean
          winner_team_id?: string | null
        }
        Update: {
          added_time_seconds?: number | null
          coin_flip_winner_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_finished?: boolean
          is_paused?: boolean
          match_number?: number
          occurrence_id?: string | null
          paused_at?: string | null
          paused_seconds?: number | null
          pelada_id?: string
          started_at?: string | null
          team_a_id?: string | null
          team_a_score?: number
          team_b_id?: string | null
          team_b_score?: number
          voting_deadline?: string | null
          voting_finalized?: boolean
          voting_finalized_at?: string | null
          voting_open?: boolean
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "pelada_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_user_id: string
          category: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          recipient_user_id: string
          type: string
        }
        Insert: {
          actor_user_id: string
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          recipient_user_id: string
          type: string
        }
        Update: {
          actor_user_id?: string
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          recipient_user_id?: string
          type?: string
        }
        Relationships: []
      }
      pelada_award_results: {
        Row: {
          award_type: string
          created_at: string
          id: string
          match_id: string
          vote_count: number
          winner_member_id: string
        }
        Insert: {
          award_type: string
          created_at?: string
          id?: string
          match_id: string
          vote_count?: number
          winner_member_id: string
        }
        Update: {
          award_type?: string
          created_at?: string
          id?: string
          match_id?: string
          vote_count?: number
          winner_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_award_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelada_award_results_winner_member_id_fkey"
            columns: ["winner_member_id"]
            isOneToOne: false
            referencedRelation: "pelada_members"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_day_votes: {
        Row: {
          created_at: string
          id: string
          nota_coletivo: number | null
          nota_defesa: number | null
          nota_desempenho: number | null
          nota_fair_play: number | null
          nota_tecnica: number | null
          occurrence_id: string
          pelada_id: string
          rated_member_id: string
          special_awards: Json
          status: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nota_coletivo?: number | null
          nota_defesa?: number | null
          nota_desempenho?: number | null
          nota_fair_play?: number | null
          nota_tecnica?: number | null
          occurrence_id: string
          pelada_id: string
          rated_member_id: string
          special_awards?: Json
          status?: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nota_coletivo?: number | null
          nota_defesa?: number | null
          nota_desempenho?: number | null
          nota_fair_play?: number | null
          nota_tecnica?: number | null
          occurrence_id?: string
          pelada_id?: string
          rated_member_id?: string
          special_awards?: Json
          status?: string
          voter_id?: string
        }
        Relationships: []
      }
      pelada_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          expense_date: string
          id: string
          pelada_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          expense_date?: string
          id?: string
          pelada_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date?: string
          id?: string
          pelada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_expenses_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_income: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          income_date: string
          pelada_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          income_date?: string
          pelada_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          income_date?: string
          pelada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_income_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_members: {
        Row: {
          created_at: string
          guest_name: string | null
          guest_position: Database["public"]["Enums"]["player_position"] | null
          id: string
          pelada_id: string
          role: Database["public"]["Enums"]["pelada_role"]
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_name?: string | null
          guest_position?: Database["public"]["Enums"]["player_position"] | null
          id?: string
          pelada_id: string
          role?: Database["public"]["Enums"]["pelada_role"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_name?: string | null
          guest_position?: Database["public"]["Enums"]["player_position"] | null
          id?: string
          pelada_id?: string
          role?: Database["public"]["Enums"]["pelada_role"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pelada_members_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          pelada_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          pelada_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          pelada_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_messages_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_occurrences: {
        Row: {
          cancel_reason: string | null
          created_at: string
          id: string
          notes: string | null
          occurrence_date: string
          pelada_id: string
          status: Database["public"]["Enums"]["occurrence_status"]
          updated_at: string
          voting_closed: boolean
          voting_deadline: string | null
          voting_notified_at: string | null
        }
        Insert: {
          cancel_reason?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          occurrence_date: string
          pelada_id: string
          status?: Database["public"]["Enums"]["occurrence_status"]
          updated_at?: string
          voting_closed?: boolean
          voting_deadline?: string | null
          voting_notified_at?: string | null
        }
        Update: {
          cancel_reason?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          occurrence_date?: string
          pelada_id?: string
          status?: Database["public"]["Enums"]["occurrence_status"]
          updated_at?: string
          voting_closed?: boolean
          voting_deadline?: string | null
          voting_notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pelada_occurrences_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          pelada_id: string
          pelada_member_id: string
          reference_month: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          pelada_id: string
          pelada_member_id: string
          reference_month: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          pelada_id?: string
          pelada_member_id?: string
          reference_month?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_payments_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelada_payments_pelada_member_id_fkey"
            columns: ["pelada_member_id"]
            isOneToOne: false
            referencedRelation: "pelada_members"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_team_members: {
        Row: {
          created_at: string
          id: string
          pelada_member_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pelada_member_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pelada_member_id?: string
          team_id?: string
        }
        Relationships: []
      }
      pelada_teams: {
        Row: {
          color: string
          created_at: string
          id: string
          is_playing: boolean
          name: string
          occurrence_id: string | null
          pelada_id: string
          position_in_queue: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_playing?: boolean
          name: string
          occurrence_id?: string | null
          pelada_id: string
          position_in_queue?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_playing?: boolean
          name?: string
          occurrence_id?: string | null
          pelada_id?: string
          position_in_queue?: number
        }
        Relationships: []
      }
      pelada_timeline_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          match_id: string | null
          occurrence_id: string | null
          payload: Json
          pelada_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          match_id?: string | null
          occurrence_id?: string | null
          payload?: Json
          pelada_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          match_id?: string | null
          occurrence_id?: string | null
          payload?: Json
          pelada_id?: string
        }
        Relationships: []
      }
      peladas: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fee_amount: number | null
          fee_due_day: number | null
          fee_type: string | null
          full_address: string | null
          id: string
          is_active: boolean
          is_live: boolean
          is_paid: boolean
          latitude: number | null
          location: string
          location_name: string | null
          longitude: number | null
          match_id_code: string | null
          max_players: number | null
          name: string
          neighborhood: string | null
          pelada_type: Database["public"]["Enums"]["pelada_type"]
          pix_key: string | null
          recurrence_day_of_week: number | null
          recurrence_enabled: boolean
          recurrence_interval: number | null
          recurrence_type: string
          scheduled_date: string
          scheduled_time: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_amount?: number | null
          fee_due_day?: number | null
          fee_type?: string | null
          full_address?: string | null
          id?: string
          is_active?: boolean
          is_live?: boolean
          is_paid?: boolean
          latitude?: number | null
          location: string
          location_name?: string | null
          longitude?: number | null
          match_id_code?: string | null
          max_players?: number | null
          name: string
          neighborhood?: string | null
          pelada_type?: Database["public"]["Enums"]["pelada_type"]
          pix_key?: string | null
          recurrence_day_of_week?: number | null
          recurrence_enabled?: boolean
          recurrence_interval?: number | null
          recurrence_type?: string
          scheduled_date: string
          scheduled_time: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_amount?: number | null
          fee_due_day?: number | null
          fee_type?: string | null
          full_address?: string | null
          id?: string
          is_active?: boolean
          is_live?: boolean
          is_paid?: boolean
          latitude?: number | null
          location?: string
          location_name?: string | null
          longitude?: number | null
          match_id_code?: string | null
          max_players?: number | null
          name?: string
          neighborhood?: string | null
          pelada_type?: Database["public"]["Enums"]["pelada_type"]
          pix_key?: string | null
          recurrence_day_of_week?: number | null
          recurrence_enabled?: boolean
          recurrence_interval?: number | null
          recurrence_type?: string
          scheduled_date?: string
          scheduled_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_card_history: {
        Row: {
          ai_highlight: string | null
          created_at: string
          id: string
          occurrence_id: string | null
          pelada_id: string | null
          snapshot: Json
          user_id: string
        }
        Insert: {
          ai_highlight?: string | null
          created_at?: string
          id?: string
          occurrence_id?: string | null
          pelada_id?: string | null
          snapshot: Json
          user_id: string
        }
        Update: {
          ai_highlight?: string | null
          created_at?: string
          id?: string
          occurrence_id?: string | null
          pelada_id?: string | null
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      player_cards: {
        Row: {
          created_at: string
          defending: number
          dribbling: number
          games_played: number
          id: string
          overall: number
          pace: number
          passing: number
          physical: number
          rarity: Database["public"]["Enums"]["card_rarity"]
          shooting: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          defending?: number
          dribbling?: number
          games_played?: number
          id?: string
          overall?: number
          pace?: number
          passing?: number
          physical?: number
          rarity?: Database["public"]["Enums"]["card_rarity"]
          shooting?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          defending?: number
          dribbling?: number
          games_played?: number
          id?: string
          overall?: number
          pace?: number
          passing?: number
          physical?: number
          rarity?: Database["public"]["Enums"]["card_rarity"]
          shooting?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_milestones: {
        Row: {
          achieved_at: string
          id: string
          stat_type: string
          threshold: number
          user_id: string
          xp_reward: number
        }
        Insert: {
          achieved_at?: string
          id?: string
          stat_type: string
          threshold: number
          user_id: string
          xp_reward?: number
        }
        Update: {
          achieved_at?: string
          id?: string
          stat_type?: string
          threshold?: number
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      player_xp: {
        Row: {
          created_at: string
          id: string
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          current_period_end: string | null
          dominant_foot: Database["public"]["Enums"]["dominant_foot"] | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          height_cm: number | null
          id: string
          name: string
          phone: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          position: Database["public"]["Enums"]["player_position"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          updated_at: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"]
          username: string | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          current_period_end?: string | null
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"] | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          height_cm?: number | null
          id?: string
          name: string
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          position?: Database["public"]["Enums"]["player_position"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
          user_role?: Database["public"]["Enums"]["user_role"]
          username?: string | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          current_period_end?: string | null
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"] | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          height_cm?: number | null
          id?: string
          name?: string
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          position?: Database["public"]["Enums"]["player_position"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role"]
          username?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      reward_unlocks: {
        Row: {
          id: string
          reward_key: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          reward_key: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          reward_key?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          stripe_event_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          stripe_event_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          stripe_event_id?: string | null
          user_id?: string | null
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
      xp_events: {
        Row: {
          created_at: string
          id: string
          ref_id: string | null
          ref_type: string | null
          source: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          ref_id?: string | null
          ref_type?: string | null
          source: string
          user_id: string
          xp: number
        }
        Update: {
          created_at?: string
          id?: string
          ref_id?: string | null
          ref_type?: string | null
          source?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: {
        Args: {
          _ref_id?: string
          _ref_type?: string
          _source: string
          _user_id: string
          _xp: number
        }
        Returns: undefined
      }
      get_my_private_profile: {
        Args: never
        Returns: {
          phone: string
          stripe_customer_id: string
          stripe_subscription_id: string
        }[]
      }
      get_pelada_pix_key: { Args: { _pelada_id: string }; Returns: string }
      has_pro_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pelada_admin: {
        Args: { _pelada_id: string; _user_id: string }
        Returns: boolean
      }
      is_pelada_member: {
        Args: { _pelada_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "player" | "admin"
      attendance_status: "confirmado" | "talvez" | "nao_vou" | "pendente"
      card_rarity: "bronze" | "prata" | "ouro" | "ouro_raro" | "roxo" | "azul"
      card_type: "amarelo" | "vermelho"
      dominant_foot: "direito" | "esquerdo" | "ambidestro"
      gender_type: "masculino" | "feminino"
      occurrence_status: "scheduled" | "in_progress" | "finished" | "canceled"
      pelada_role: "admin" | "player" | "guest"
      pelada_type: "publica" | "privada"
      plan_type: "free" | "pro" | "demo"
      player_position: "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA"
      user_role: "presidente" | "jogador"
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
      app_role: ["player", "admin"],
      attendance_status: ["confirmado", "talvez", "nao_vou", "pendente"],
      card_rarity: ["bronze", "prata", "ouro", "ouro_raro", "roxo", "azul"],
      card_type: ["amarelo", "vermelho"],
      dominant_foot: ["direito", "esquerdo", "ambidestro"],
      gender_type: ["masculino", "feminino"],
      occurrence_status: ["scheduled", "in_progress", "finished", "canceled"],
      pelada_role: ["admin", "player", "guest"],
      pelada_type: ["publica", "privada"],
      plan_type: ["free", "pro", "demo"],
      player_position: ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"],
      user_role: ["presidente", "jogador"],
    },
  },
} as const
