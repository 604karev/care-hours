export type RateUnit = 'hourly' | 'per_visit'

export interface Workspace {
  id: string
  name: string
  currency_code: string
}

export interface ServiceType {
  id: string
  workspace_id: string
  name: string
  code: string
  background_color: string
  text_color: string
  rate_unit: RateUnit
  rate_amount: number
  currency_code: string
  sort_order: number
  is_archived: boolean
}

export interface Client {
  id: string
  workspace_id: string
  display_name: string
  full_name: string | null
  client_code: string | null
  address: string | null
  phone: string | null
  default_service_type_id: string | null
  typical_start_time: string | null
  typical_duration_minutes: number | null
  planned_minutes_per_month: number | null
  planned_visits_per_month: number | null
  active_from: string | null
  active_to: string | null
  sort_order: number
  is_archived: boolean
}

export interface Visit {
  id: string
  workspace_id: string
  client_id: string
  service_type_id: string
  visit_date: string
  start_time: string
  end_time: string
  unpaid_break_minutes: number
  duration_minutes: number
  rate_unit_snapshot: RateUnit
  rate_amount_snapshot: number
  currency_code_snapshot: string
  service_name_snapshot: string
  background_color_snapshot: string
  text_color_snapshot: string
  amount_snapshot: number
  short_note: string | null
}

export type AppSection = 'month' | 'clients' | 'rates'
