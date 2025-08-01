// Minimal Database type for TypeScript compilation
// This file should be regenerated with: npm run types:generate
// when the Supabase configuration is fixed

export interface Database {
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
    CompositeTypes: Record<string, unknown>;
  };
}