// supabase/functions/calendar-sync/index.ts
// FIX: The type reference for Supabase functions was failing to resolve. Using `https://esm.sh/` which is a reliable CDN for ES modules.
// FIX: Updated the type reference to a specific version to resolve TypeScript errors for `Deno`.
// FIX: The type reference URL for Supabase Edge Functions was incorrect. This is updated to a working URL which provides the Deno runtime types, resolving the 'Cannot find name Deno' errors.
/// <reference types="https://esm.sh/v135/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Helper to convert task dates/times into Google Calendar format
const getEventDateTime = (task: any) => {
  const isAllDay = !task.startTime;
  const datePart = task.dueDate;

  if (!datePart) {
    console.error("Task has no due date for sync, skipping:", task.id);
    // Return an empty object which will cause a 400 Bad Request from Google, but we've logged the cause.
    return { start: {}, end: {} };
  }

  if (isAllDay) {
    return {
      start: { date: datePart },
      end: { date: datePart }
    };
  }

  try {
    const [startHour, startMinute] = task.startTime.split(':').map(Number);
    if (isNaN(startHour) || isNaN(startMinute)) {
        throw new Error(`Invalid time format in task.startTime: "${task.startTime}"`);
    }

    const durationInMinutes = (task.duration && task.duration > 0) ? task.duration : 60;

    const [year, month, day] = datePart.split('-').map(Number);

    // Create a UTC date object to perform safe date math, avoiding server timezone issues.
    const startUTC = Date.UTC(year, month - 1, day, startHour, startMinute);
    const endUTC = new Date(startUTC + durationInMinutes * 60 * 1000);
    
    const pad = (num: number) => String(num).padStart(2, '0');

    // Format start and end times as "floating" local time strings for Google Calendar API.
    // Google will interpret these based on the provided timeZone.
    const startDateTimeStr = `${year}-${pad(month)}-${pad(day)}T${pad(startHour)}:${pad(startMinute)}:00`;
    const endDateTimeStr = `${endUTC.getUTCFullYear()}-${pad(endUTC.getUTCMonth() + 1)}-${pad(endUTC.getUTCDate())}T${pad(endUTC.getUTCHours())}:${pad(endUTC.getUTCMinutes())}:00`;

    return {
      start: {
        dateTime: startDateTimeStr,
        timeZone: 'Asia/Shanghai',
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'Asia/Shanghai',
      },
    };
  } catch (e) {
    console.error(`Error creating date/time for Google Calendar event for task ${task.id}:`, e);
    // Fallback to all-day event if time is invalid
    return {
      start: { date: datePart },
      end: { date: datePart }
    };
  }
};


serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { provider } = await req.json();
    if (provider !== 'google') {
      throw new Error("Only Google Calendar sync is supported at this time.");
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header.");
    const jwt = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) throw new Error("User authentication failed.");
    
    const { data: connection, error: connError } = await supabaseAdmin
        .from('calendar_connections')
        .select('refresh_token')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single();

    if (connError || !connection) throw new Error("No active Google Calendar connection found.");
    
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
    
    const { data: tasksToSync, error: tasksError } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('dueDate', 'is', null);

    if (tasksError) throw tasksError;
    
    for (const task of tasksToSync) {
      if (!task.title || task.title.trim() === '') {
        console.warn(`Skipping task with empty title: ID ${task.id}`);
        continue; // Skip this task
      }

      const eventBody = {
        summary: task.title,
        description: task.notes || '',
        ...getEventDateTime(task),
        extendedProperties: {
          private: {
            taskmaster_task_id: String(task.id)
          }
        }
      };

      let eventId = task.calendar_event_id;
      
      try {
        if (eventId) {
            const updateRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventBody)
            });

            // If the event is not found, gone, or returns a bad request (often for deleted events), treat it as missing.
            if (updateRes.status === 400 || updateRes.status === 404 || updateRes.status === 410) {
                eventId = null; 
            } else if (!updateRes.ok) {
                throw new Error(`Failed to update event ${eventId}. Status: ${updateRes.status}`);
            }
        }

        if (!eventId) {
            const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventBody)
            });

            if (!createRes.ok) throw new Error(`Failed to create event for task ${task.id}: ${await createRes.text()}`);
            
            const newEvent = await createRes.json();
            
            const { error: updateDbError } = await supabaseAdmin
                .from('tasks')
                .update({ calendar_event_id: newEvent.id, calendar_provider: 'google' })
                .eq('id', task.id);
                
            if (updateDbError) console.error(`Failed to store event ID for task ${task.id}:`, updateDbError);
        }
      } catch(singleTaskError) {
          console.error(`Error syncing task ${task.id}:`, singleTaskError);
      }
    }
    
    return new Response(JSON.stringify({ message: "Sync process completed." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Calendar sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});