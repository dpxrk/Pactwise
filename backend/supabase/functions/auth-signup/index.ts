import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { 
  isPublicEmailDomain, 
  extractEmailDomain, 
  generateEnterpriseIdentifier,
  validateEmailDomainForEnterprise 
} from '../_shared/email-domain-validator.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface SignUpRequest {
  email: string;
  password: string;
  metadata?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    organization?: string;
    role?: string;
    department?: string;
  };
  inviteCode?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, password, metadata, inviteCode } = await req.json() as SignUpRequest;

    // Validate email domain
    const domain = extractEmailDomain(email);
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const isPublicDomain = isPublicEmailDomain(email);

    // Check for existing enterprises with this domain (only for non-public domains)
    let existingEnterprise = null;
    if (!isPublicDomain) {
      const { data: enterprises } = await supabaseClient
        .from('enterprises')
        .select('id, name, domain, settings')
        .eq('domain', domain)
        .is('deleted_at', null)
        .limit(1)
        .single();
      
      existingEnterprise = enterprises;
    }

    // Check if there's an invite code
    let invitedToEnterprise = null;
    if (inviteCode) {
      const { data: invite } = await supabaseClient
        .from('enterprise_invites')
        .select('enterprise_id, role')
        .eq('code', inviteCode)
        .eq('status', 'pending')
        .single();
      
      if (invite) {
        invitedToEnterprise = invite;
      }
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user account' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine which enterprise to assign the user to
    let enterpriseId: string;
    let userRole = 'viewer'; // Default role

    if (invitedToEnterprise) {
      // User has an invite - join that enterprise
      enterpriseId = invitedToEnterprise.enterprise_id;
      userRole = invitedToEnterprise.role || 'viewer';
      
      // Mark invite as used
      await supabaseClient
        .from('enterprise_invites')
        .update({ 
          status: 'accepted',
          accepted_by: authData.user.id,
          accepted_at: new Date().toISOString()
        })
        .eq('code', inviteCode);
    } else if (existingEnterprise && !isPublicDomain) {
      // Non-public domain with existing enterprise - join it
      enterpriseId = existingEnterprise.id;
      userRole = 'viewer'; // New users joining existing enterprise start as viewers
    } else {
      // Create a new enterprise
      const enterpriseName = generateEnterpriseIdentifier(email, metadata);
      
      const { data: newEnterprise, error: entError } = await supabaseClient
        .from('enterprises')
        .insert({
          name: enterpriseName,
          domain: isPublicDomain ? null : domain, // Only set domain for corporate emails
          settings: {
            is_personal: isPublicDomain,
            created_from_signup: true,
            signup_metadata: {
              email,
              timestamp: new Date().toISOString(),
            }
          }
        })
        .select()
        .single();

      if (entError || !newEnterprise) {
        // Rollback auth user creation
        await supabaseClient.auth.admin.deleteUser(authData.user.id);
        
        return new Response(
          JSON.stringify({ error: 'Failed to create organization' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      enterpriseId = newEnterprise.id;
      userRole = 'owner'; // First user in new enterprise becomes owner
    }

    // Create the user profile
    const { data: userProfile, error: userError } = await supabaseClient
      .from('users')
      .insert({
        auth_id: authData.user.id,
        email: email,
        first_name: metadata?.first_name || email.split('@')[0],
        last_name: metadata?.last_name || '',
        role: userRole,
        enterprise_id: enterpriseId,
        department: metadata?.department,
        is_active: true,
      })
      .select()
      .single();

    if (userError || !userProfile) {
      // Rollback auth user and potentially enterprise creation
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      
      // If we created a new enterprise, delete it
      if (!invitedToEnterprise && !existingEnterprise) {
        await supabaseClient
          .from('enterprises')
          .delete()
          .eq('id', enterpriseId);
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the signup event
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userProfile.id,
        action: 'user.signup',
        resource_type: 'user',
        resource_id: userProfile.id,
        details: {
          email,
          enterprise_id: enterpriseId,
          is_public_domain: isPublicDomain,
          joined_existing: !!existingEnterprise,
          invited: !!invitedToEnterprise,
        }
      });

    return new Response(
      JSON.stringify({
        user: userProfile,
        session: authData.session,
        enterprise: {
          id: enterpriseId,
          isNew: !invitedToEnterprise && !existingEnterprise,
          isPersonal: isPublicDomain,
        },
        message: isPublicDomain 
          ? 'Welcome! Your personal workspace has been created.'
          : existingEnterprise 
            ? `Welcome! You've been added to ${existingEnterprise.name}.`
            : 'Welcome! Your organization workspace has been created.',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during signup' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});