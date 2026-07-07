import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    const url = (window as any).__env?.SUPABASE_URL || '';
    const key = (window as any).__env?.SUPABASE_ANON_KEY || '';
    this.client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
}
