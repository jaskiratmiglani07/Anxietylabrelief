import type { APIRoute } from 'astro';
import { generateReflection } from '../../utils/reflectionGenerator';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'meta-llama/llama-3.3-70b-instruct';

export const POST: APIRoute = async ({ request }) => {
  console.log('[API Route] /api/reflection execution started');
  
  try {
    // 1. Parse and validate the request body
    const body = await request.json();
    console.log('[API Route] Request payload received:', body);
    
    const thought = body?.thought?.trim();
    if (!thought || typeof thought !== 'string') {
      console.warn('[API Route] Validation failed: thought is empty or invalid');
      return new Response(
        JSON.stringify({ error: 'Thought is required and must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (thought.length < 3) {
      console.warn('[API Route] Validation failed: thought is too short');
      return new Response(
        JSON.stringify({ error: 'Thought is too short to process' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch the OpenRouter API key from environment variables
    const apiKey = import.meta.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.warn('[API Route] OPENROUTER_API_KEY is not configured. Falling back to procedural local generator.');
      const localReflection = generateReflection(thought);
      console.log('[API Route] Procedural fallback quotes generated:', localReflection.sentences);
      return new Response(
        JSON.stringify({ quotes: localReflection.sentences, isProceduralFallback: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Construct the system prompt for grounded, practical, and non-poetic reflections
    const systemPrompt = `You are a supportive, level-headed guide helping a user gain perspective on their specific worry or concern.
The user will provide a specific worry, fear, regret, or concern they are experiencing.
Your task is to generate exactly 8 short, progressive reflections, returned as a JSON array, to be shown one at a time during a meditation experience.

Rules:
1. ABSOLUTELY NO poetry, NO metaphors, NO abstract quotes, NO vague wisdom, and NO inspirational quote language. Do not sound beautiful; sound helpful, realistic, and grounded.
2. Do not write like a therapist using clinical terminology (e.g., do not say "cognitive distortion", "projection", or "catastrophizing").
3. Do not sound like a motivational speaker. Do not use exclamation marks, hype words, or make promises (e.g., do not say "You will definitely succeed!").
4. Speak in the second person ("you") as a supportive, down-to-earth, and emotionally intelligent friend.
5. Be practical and reassuring while remaining realistic about the situation.
6. Each of the 8 items in the array must be 1 to 2 short, direct sentences that are easy to read in 4 to 8 seconds.
7. The 8 reflections must follow a logical, progressive sequence:
   - Reflections 1 & 2: Direct Acknowledgment. Validate the exact worry they typed. Explain why it is natural for their brain to focus on this concern right now because it feels important.
   - Reflections 3 & 4: Reality Check & Perspective. Challenge the assumption behind the fear using realistic, grounded facts (e.g., worrying doesn't make failure less likely, feeling uncertain doesn't make your fears true, comparing reality to an imagined version of life is unfair).
   - Reflections 5 & 6: De-escalation & Context. Reduce the emotional intensity. Remind the user of their preparation, capacity to handle setbacks, or the fact that this is a temporary situation in a larger life.
   - Reflections 7 & 8: Grounding & Stillness. Bring the focus back to the immediate present room, their breath, and letting go of trying to solve the problem right this second.

Return a JSON object only. The output must strictly conform to this JSON schema:
{
  "quotes": [
    "Sentence(s) 1",
    "Sentence(s) 2",
    "Sentence(s) 3",
    "Sentence(s) 4",
    "Sentence(s) 5",
    "Sentence(s) 6",
    "Sentence(s) 7",
    "Sentence(s) 8"
  ]
}`;

    console.log(`[API Route] Sending request to OpenRouter API using model ${MODEL_NAME}...`);
    
    // 4. Call OpenRouter API
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://anxietylabrelief.vercel.app',
        'X-Title': 'Unburden',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `The user's worry is: "${thought}"` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.72,
        max_tokens: 1024,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error(`[API Route] OpenRouter API error (status ${openRouterResponse.status}):`, errorText);
      throw new Error(`OpenRouter API responded with status ${openRouterResponse.status}: ${errorText}`);
    }

    const completion = await openRouterResponse.json();
    const responseContent = completion.choices?.[0]?.message?.content;
    console.log('[API Route] Raw OpenRouter response received:', responseContent);

    if (!responseContent) {
      throw new Error('OpenRouter returned an empty response');
    }

    // 5. Parse and validate the response schema
    const parsedData = JSON.parse(responseContent);
    const quotes = parsedData.quotes;

    if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
      throw new Error('OpenRouter response format is invalid (missing or empty quotes array)');
    }

    // Ensure we have exactly 8 quotes, padding or slicing if necessary
    let finalizedQuotes = quotes.map((q: any) => typeof q === 'string' ? q.trim() : String(q));
    if (finalizedQuotes.length < 8) {
      console.warn(`[API Route] OpenRouter generated only ${finalizedQuotes.length} quotes. Padding with procedural fallback.`);
      const fallback = generateReflection(thought).sentences;
      while (finalizedQuotes.length < 8) {
        finalizedQuotes.push(fallback[finalizedQuotes.length]);
      }
    } else if (finalizedQuotes.length > 8) {
      finalizedQuotes = finalizedQuotes.slice(0, 8);
    }

    console.log('[API Route] Parsing completed successfully. 8 quotes generated:', finalizedQuotes);

    return new Response(
      JSON.stringify({ quotes: finalizedQuotes }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[API Route] Error encountered during OpenRouter reflection generation:', error);
    
    // In case of any error, fall back gracefully to the high-quality local template system.
    try {
      const body = await request.clone().json().catch(() => ({}));
      const thought = body?.thought || "this current stressor";
      
      console.log('[API Route] Graceful fallback: generating local procedural reflections...');
      const localReflection = generateReflection(thought);
      
      return new Response(
        JSON.stringify({ 
          quotes: localReflection.sentences, 
          error: error?.message || 'OpenRouter Generation Failed', 
          isProceduralFallback: true 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (fallbackError) {
      console.error('[API Route] Critical fallback failure:', fallbackError);
      return new Response(
        JSON.stringify({ 
          quotes: [
            "Take a deep breath and let this worry rest for a moment.",
            "You are observing this thought, but you are not defined by it.",
            "In this quiet space, let the urgency of the concern fade away.",
            "Breathe in the calm of the present room.",
            "Allow the thoughts to drift like clouds across a vast sky.",
            "You do not need to solve the future in this single breath.",
            "Breathe out the tension, leaving only stillness.",
            "You are here, you are safe, and you are whole."
          ], 
          error: 'Critical server error' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
};
