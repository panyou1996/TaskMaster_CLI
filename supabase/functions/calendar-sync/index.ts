// supabase/functions/calendar-sync/index.ts
// FIX: Replaced esm.sh with unpkg for the type reference to ensure Deno can resolve the Supabase function types.
/// <reference types="https://unpkg.com/@supabase/functions-js@2/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to convert task dates/times into Google Calendar format
const getEventDateTime = (task: { dueDate?: string, startTime?: string, duration?: number }) => {
    const isAllDay = !task.startTime;
    const datePart = task.dueDate || new Date().toISOString().split('T')[0];

    if (isAllDay) {
        return {
            start: { date: datePart },
            end: { date: datePart },
        };
    }

    try {
        const startDateTime = new Date(`${datePart}T${task.startTime}`);
        if (isNaN(startDateTime.getTime())) {
            throw new Error('Invalid start time format');
        }
        const endDateTime = new Date(startDateTime.getTime() + (task.duration || 60) * 60 * 1000);

        return {
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() },
        };
    } catch(e) {
        console.error("Error creating date object for task:", task, e);
        // Fallback to all-day event if time is invalid
        return {
            start: { date: datePart },
            end: { date: datePart },
        };
    }
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { provider } = await req.json();

        if (provider !== 'google') {
            throw new Error("Only Google Calendar sync is supported at this time.");
        }
        
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const authHeader = req.headers.get('Authorization')!;
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
                grant_type: 'refresh_token',
            }),
        });

        if (!tokenResponse.ok) throw new Error(`Failed to refresh token: ${await tokenResponse.text()}`);
        const tokens = await tokenResponse.json();
        const accessToken = tokens.access_token;

        const { data: tasksToSync, error: tasksError } = await supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .neq('dueDate', null);

        if (tasksError) throw tasksError;

        for (const task of tasksToSync) {
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
                        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(eventBody)
                    });
                    if (updateRes.status === 404 || updateRes.status === 410) { // Not Found or Gone
                        eventId = null;
                    } else if (!updateRes.ok) {
                        throw new Error(`Failed to update event ${eventId}. Status: ${updateRes.status}`);
                    }
                }

                if (!eventId) {
                    const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
            } catch (singleTaskError) {
                console.error(`Error syncing task ${task.id}:`, singleTaskError);
            }
        }

        return new Response(JSON.stringify({ message: "Sync process completed." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Calendar sync error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});