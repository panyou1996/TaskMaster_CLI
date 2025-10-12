// supabase/functions/calendar-pull/index.ts
// FIX: Corrected the Supabase Edge Function type reference URL. The previous URL was invalid, causing `Deno` types to be unresolved.
/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header.");
    const jwt = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) throw new Error("User authentication failed.");
    
    // 1. Get Google Refresh Token
    const { data: connection, error: connError } = await supabaseAdmin
        .from('calendar_connections')
        .select('refresh_token')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single();
    if (connError || !connection) throw new Error("No active Google Calendar connection found.");

    // 2. Get New Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('Google_Calendar_ID'),
        client_secret: Deno.env.get('Google_Calendar_SECRET'),
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    if (!tokenResponse.ok) throw new Error(`Failed to refresh token: ${await tokenResponse.text()}`);
    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // 3. Fetch existing tasks to avoid duplicates
    const { data: existingTasks, error: tasksError } = await supabaseAdmin
        .from('tasks')
        .select('calendar_event_id')
        .eq('user_id', user.id)
        .eq('calendar_provider', 'google')
        .not('calendar_event_id', 'is', null);
    if (tasksError) throw tasksError;
    const existingEventIds = new Set(existingTasks.map(t => t.calendar_event_id));

    // 4. Fetch Google Calendar Events from the last 30 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const eventsUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    eventsUrl.searchParams.set('timeMin', timeMin.toISOString());
    eventsUrl.searchParams.set('singleEvents', 'true'); // Expand recurring events
    eventsUrl.searchParams.set('orderBy', 'startTime');

    const eventsRes = await fetch(eventsUrl.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!eventsRes.ok) throw new Error(`Failed to fetch Google Calendar events: ${await eventsRes.text()}`);
    const eventsData = await eventsRes.json();
    
    const newTasksToCreate = [];

    // 5. Filter and prepare new tasks
    for (const event of eventsData.items) {
      if (event.status === 'cancelled') continue;
      // This correctly filters out events created by TaskMaster
      if (event.extendedProperties?.private?.taskmaster_task_id) continue;
      if (existingEventIds.has(event.id)) continue;

      const startDate = event.start.date || event.start.dateTime?.split('T')[0];
      const endDate = event.end.date || event.end.dateTime?.split('T')[0];

      if (!startDate) continue;

      let duration = null;
      if (event.start.dateTime && event.end.dateTime) {
        const start = new Date(event.start.dateTime).getTime();
        const end = new Date(event.end.dateTime).getTime();
        duration = Math.round((end - start) / (1000 * 60));
      }

      const today = new Date().toISOString().split('T')[0];

      const newTask = {
        user_id: user.id,
        title: event.summary || 'Untitled Event',
        notes: event.description || undefined,
        category: 'Google Calendar',
        dueDate: endDate || startDate,
        startDate: startDate,
        startTime: event.start.dateTime ? event.start.dateTime.split('T')[1].substring(0, 5) : undefined,
        duration: duration || undefined,
        type: event.start.dateTime ? 'Fixed' : 'Flexible',
        today: startDate === today || endDate === today,
        calendar_event_id: event.id,
        calendar_provider: 'google',
        completed: false
      };
      
      newTasksToCreate.push(newTask);
    }

    // 6. Batch Insert
    if (newTasksToCreate.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('tasks').insert(newTasksToCreate);
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ message: `Sync complete. Pulled ${newTasksToCreate.length} new tasks.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Calendar pull error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
