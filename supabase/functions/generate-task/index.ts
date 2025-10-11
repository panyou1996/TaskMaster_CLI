import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@0.4.0"

// Handle CORS preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, listNames } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in Supabase environment variables.')
    }
    if (!prompt) {
      throw new Error('Prompt is required.')
    }

    const ai = new GoogleGenAI({ apiKey });
    const today = new Date().toISOString().split('T')[0];

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "The main title of the task." },
        list: { type: Type.STRING, description: `The category for the task. Must be one of: ${listNames.join(', ')}.` },
        isImportant: { type: Type.BOOLEAN, description: "Whether the task is important." },
        isToday: { type: Type.BOOLEAN, description: "Whether the task is for today." },
        type: { type: Type.STRING, description: "The type of task, either 'Fixed' (has a specific time) or 'Flexible'.", enum: ['Fixed', 'Flexible'] },
        dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format." },
        startTime: { type: Type.STRING, description: "The start time in HH:MM (24-hour) format." },
        duration: { type: Type.INTEGER, description: "The estimated duration of the task in minutes." },
        notes: { type: Type.STRING, description: "Any additional notes or details." },
      },
      required: ["title", "list"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an intelligent task parser. Analyze the user's text and extract task details. Your response MUST be in JSON format and strictly adhere to the provided schema. The user's available task lists are: ${listNames.join(', ')}. If the user specifies a list that isn't in the available lists, or doesn't specify one, use '${listNames[0] || 'Personal'}' as the default. If the user mentions a time without a date, assume it's for today (${today}). Infer if the task is important or for today based on keywords. A task with a specific startTime is 'Fixed', otherwise it is 'Flexible'.`,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const parsed = JSON.parse(response.text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
