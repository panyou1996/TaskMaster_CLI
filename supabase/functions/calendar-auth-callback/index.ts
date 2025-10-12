// supabase/functions/calendar-auth-callback/index.ts
// FIX: Updated the Supabase function types reference to a version-less URL to ensure the Deno namespace is correctly resolved.
// FIX: Corrected Supabase function types reference by removing '/src' from the path. This resolves errors related to the Deno namespace not being found.
/// <reference types="https://esm.sh/@supabase/functions-js/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // User ID from the initial request
  
  // Construct the redirect URL for the frontend app using a reliable environment variable
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'; // Fallback for local dev
  const redirectUrl = new URL('/#/settings', appUrl);

  if (!code) {
    redirectUrl.searchParams.set('error', 'auth_code_missing');
    return Response.redirect(redirectUrl.toString(), 302);
  }

  if (!state) {
    redirectUrl.searchParams.set('error', 'state_missing');
    return Response.redirect(redirectUrl.toString(), 302);
  }

  const userId = state;

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('Google_Calendar_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('Google_Calendar_SECRET');
    const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendar-auth-callback`;
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Failed to fetch token: ${errorBody}`);
    }
    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
      // Google only provides a refresh token on the very first authorization.
      // If the user re-authorizes, we might only get an access token.
      // For this app, we need the refresh token for long-term access.
      console.warn("No refresh token received from Google. User may have already authorized the app.");
    }

    // Create a Supabase admin client to bypass RLS using the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    const connectionData: {
        user_id: string;
        provider: string;
        access_token: string;
        expires_at: string;
        refresh_token?: string;
    } = {
      user_id: userId,
      provider: 'google',
      access_token: tokens.access_token,
      expires_at: expires_at,
    };

    // Only update the refresh token if a new one is provided
    if (tokens.refresh_token) {
      connectionData.refresh_token = tokens.refresh_token;
    }
    
    // Upsert the token data into the database for the correct user
    const { error: upsertError } = await supabaseAdmin
      .from('calendar_connections')
      .upsert(connectionData, { onConflict: 'user_id, provider' });

    if (upsertError) {
      throw upsertError;
    }

    // Redirect user back to the settings page in the app
    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error("Callback error:", error);
    redirectUrl.searchParams.set('error', 'calendar_connection_failed');
    return Response.redirect(redirectUrl.toString(), 302);
  }
});
