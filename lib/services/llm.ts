/**
 * Centralized LLM service using OpenRouter
 * Supports multiple models through OpenRouter's unified API
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

const DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4000;

/**
 * Call OpenRouter API to get LLM completion
 */
export async function callLLM(
  prompt: string,
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const {
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
    systemPrompt,
  } = options;

  const messages: LLMMessage[] = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No completion returned from OpenRouter');
    }

    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('LLM request timed out after 30 seconds');
    }
    console.error('Error calling LLM:', error.message);
    throw error;
  }
}

/**
 * Parse structured data from text using LLM
 * Returns parsed JSON object
 */
export async function parseWithLLM<T = any>(
  text: string,
  instructions: string,
  options: LLMOptions = {}
): Promise<T | null> {
  try {
    const systemPrompt = `You are a data extraction assistant. Extract structured data from the provided text according to the instructions. Return ONLY valid JSON, no additional text or explanation.`;

    const prompt = `${instructions}\n\nText to parse:\n\n${text}`;

    const response = await callLLM(prompt, {
      ...options,
      systemPrompt,
      temperature: 0.3, // Lower temperature for more consistent parsing
    });

    // Try to parse the response as JSON
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('LLM did not return valid JSON:', response.content);
      return null;
    }

    return JSON.parse(jsonMatch[0]) as T;
  } catch (error: any) {
    console.error('Error parsing with LLM:', error.message);
    return null;
  }
}

/**
 * Simple LLM call for general text generation
 */
export async function askLLM(
  question: string,
  context?: string,
  options: LLMOptions = {}
): Promise<string> {
  try {
    const prompt = context
      ? `Context:\n${context}\n\nQuestion: ${question}`
      : question;

    const response = await callLLM(prompt, options);
    return response.content;
  } catch (error: any) {
    console.error('Error asking LLM:', error.message);
    throw error;
  }
}
