import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {return corsResponse;}

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get user context
    const { data: userData } = await supabase
      .from('users')
      .select('id, enterprise_id, role, first_name, last_name')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Update user presence
    if (method === 'POST' && pathname === '/realtime/presence') {
      const { status, activityType, activityDetails, currentPath } = await req.json();

      await supabase
        .from('user_presence')
        .upsert({
          user_id: userData.id,
          status: status || 'online',
          activity_type: activityType,
          activity_details: activityDetails || {},
          current_path: currentPath,
          last_seen_at: new Date().toISOString(),
          enterprise_id: userData.enterprise_id,
        }, {
          onConflict: 'user_id',
        });

      // Broadcast presence update
      await broadcastEvent(supabase, {
        event_type: 'presence_updated',
        event_data: {
          user_id: userData.id,
          user_name: `${userData.first_name} ${userData.last_name}`,
          status,
          activity_type: activityType,
        },
        enterprise_id: userData.enterprise_id,
      });

      return new Response(JSON.stringify({ updated: true }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get active users
    if (method === 'GET' && pathname === '/realtime/presence') {
      const { data: activeUsers } = await supabase
        .from('user_presence')
        .select(`
          *,
          user:users(id, first_name, last_name, email, role)
        `)
        .eq('enterprise_id', userData.enterprise_id)
        .gte('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Active in last 5 minutes
        .neq('user_id', userData.id); // Exclude current user

      return new Response(JSON.stringify(activeUsers || []), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Update typing indicator
    if (method === 'POST' && pathname === '/realtime/typing') {
      const { resourceType, resourceId, fieldName, isTyping } = await req.json();

      if (isTyping) {
        await supabase
          .from('typing_indicators')
          .upsert({
            user_id: userData.id,
            resource_type: resourceType,
            resource_id: resourceId,
            field_name: fieldName,
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30000).toISOString(), // 30 seconds
          }, {
            onConflict: 'user_id,resource_type,resource_id,field_name',
          });
      } else {
        await supabase
          .from('typing_indicators')
          .delete()
          .match({
            user_id: userData.id,
            resource_type: resourceType,
            resource_id: resourceId,
            field_name: fieldName,
          });
      }

      // Broadcast typing update
      await broadcastEvent(supabase, {
        event_type: 'typing_updated',
        event_data: {
          user_id: userData.id,
          user_name: `${userData.first_name} ${userData.last_name}`,
          resource_type: resourceType,
          resource_id: resourceId,
          field_name: fieldName,
          is_typing: isTyping,
        },
        resource_type: resourceType,
        resource_id: resourceId,
        enterprise_id: userData.enterprise_id,
      });

      return new Response(JSON.stringify({ updated: true }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get typing indicators for a resource
    if (method === 'GET' && pathname === '/realtime/typing') {
      const { resourceType, resourceId } = Object.fromEntries(url.searchParams);

      const { data: indicators } = await supabase
        .from('typing_indicators')
        .select(`
          *,
          user:users(id, first_name, last_name)
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .gte('expires_at', new Date().toISOString())
        .neq('user_id', userData.id);

      return new Response(JSON.stringify(indicators || []), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Broadcast custom event
    if (method === 'POST' && pathname === '/realtime/broadcast') {
      const { eventType, eventData, targetUsers, resourceType, resourceId } = await req.json();

      const event = await broadcastEvent(supabase, {
        event_type: eventType,
        event_data: {
          ...eventData,
          sender_id: userData.id,
          sender_name: `${userData.first_name} ${userData.last_name}`,
        },
        user_id: userData.id,
        target_users: targetUsers,
        resource_type: resourceType,
        resource_id: resourceId,
        is_broadcast: !targetUsers || targetUsers.length === 0,
        enterprise_id: userData.enterprise_id,
      });

      return new Response(JSON.stringify({ event_id: event.id }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create collaborative document session
    if (method === 'POST' && pathname === '/realtime/documents') {
      const { documentType, documentId, title, content } = await req.json();

      const { data: doc } = await supabase
        .from('collaborative_documents')
        .upsert({
          document_type: documentType,
          document_id: documentId,
          title,
          content,
          version: 1,
          enterprise_id: userData.enterprise_id,
        }, {
          onConflict: 'document_type,document_id',
        })
        .select()
        .single();

      // Create initial snapshot
      await supabase
        .from('document_snapshots')
        .insert({
          document_id: doc.id,
          version: 1,
          content,
          content_hash: await hashContent(content),
          created_by: userData.id,
          change_summary: 'Initial version',
        });

      return new Response(JSON.stringify(doc), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // Update collaborative document
    if (method === 'PUT' && pathname.match(/^\/realtime\/documents\/[a-f0-9-]+$/)) {
      const docId = pathname.split('/')[3];
      const { content, changeSummary } = await req.json();

      // Check if document is locked
      const { data: doc } = await supabase
        .from('collaborative_documents')
        .select('*')
        .eq('id', docId)
        .single();

      if (doc.is_locked && doc.locked_by !== userData.id) {
        return new Response(
          JSON.stringify({
            error: 'Document is locked',
            locked_by: doc.locked_by,
            locked_at: doc.locked_at,
          }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 423, // Locked
          },
        );
      }

      // Update document
      const newVersion = doc.version + 1;
      const { data: updated } = await supabase
        .from('collaborative_documents')
        .update({
          content,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId)
        .select()
        .single();

      // Create snapshot
      await supabase
        .from('document_snapshots')
        .insert({
          document_id: docId,
          version: newVersion,
          content,
          content_hash: await hashContent(content),
          created_by: userData.id,
          change_summary: changeSummary || 'Updated content',
        });

      // Broadcast update
      await broadcastEvent(supabase, {
        event_type: 'document_updated',
        event_data: {
          document_id: docId,
          version: newVersion,
          updated_by: userData.id,
          change_summary: changeSummary,
        },
        resource_type: 'document',
        resource_id: docId,
        enterprise_id: userData.enterprise_id,
      });

      return new Response(JSON.stringify(updated), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Lock/unlock document
    if (method === 'POST' && pathname.match(/^\/realtime\/documents\/[a-f0-9-]+\/lock$/)) {
      const docId = pathname.split('/')[3];
      const { lock } = await req.json();

      const { data } = await supabase
        .from('collaborative_documents')
        .update({
          is_locked: lock,
          locked_by: lock ? userData.id : null,
          locked_at: lock ? new Date().toISOString() : null,
        })
        .eq('id', docId)
        .select()
        .single();

      // Broadcast lock status
      await broadcastEvent(supabase, {
        event_type: 'document_lock_changed',
        event_data: {
          document_id: docId,
          is_locked: lock,
          locked_by: lock ? userData.id : null,
        },
        resource_type: 'document',
        resource_id: docId,
        enterprise_id: userData.enterprise_id,
      });

      return new Response(JSON.stringify(data), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 404,
    });

  } catch (error) {
    console.error('Realtime error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

async function broadcastEvent(supabase: any, eventData: any) {
  const { data } = await supabase
    .from('realtime_events')
    .insert(eventData)
    .select()
    .single();

  return data;
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}