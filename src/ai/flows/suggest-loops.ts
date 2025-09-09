'use server';

/**
 * @fileOverview An AI agent that suggests optimal loop points for audio tracks.
 *
 * - suggestLoops - A function that handles the loop point suggestion process.
 * - SuggestLoopsInput - The input type for the suggestLoops function.
 * - SuggestLoopsOutput - The return type for the suggestLoops function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SuggestLoopsInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio track, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  trackName: z.string().describe('The name of the audio track.'),
});
export type SuggestLoopsInput = z.infer<typeof SuggestLoopsInputSchema>;

const SuggestLoopsOutputSchema = z.object({
  loopStart: z
    .number()
    .describe(
      'The suggested start time (in seconds) for the loop, based on analysis of the audio track.'
    ),
  loopEnd: z
    .number()
    .describe(
      'The suggested end time (in seconds) for the loop, based on analysis of the audio track.'
    ),
  confidence: z
    .number()
    .describe(
      'A confidence score (0-1) indicating the quality of the suggested loop points; higher values indicate better loop points.'
    ),
  reason: z
    .string()
    .describe(
      'A short explanation of why these loop points were suggested, highlighting musical or rhythmic features of the audio track.'
    ),
});
export type SuggestLoopsOutput = z.infer<typeof SuggestLoopsOutputSchema>;

export async function suggestLoops(
  input: SuggestLoopsInput
): Promise<SuggestLoopsOutput> {
  return suggestLoopsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLoopsPrompt',
  input: {schema: SuggestLoopsInputSchema},
  output: {schema: SuggestLoopsOutputSchema},
  prompt: `You are an AI music producer who specializes in finding perfect loop points in audio tracks.

You are given an audio track and its name. You will analyze the track and suggest optimal loop points.

Consider musicality, rhythm, and seamlessness when suggesting loop points.

Respond in JSON format with the loopStart, loopEnd, confidence, and reason fields.

Track Name: {{{trackName}}}
Audio: {{media url=audioDataUri}}
`,
});

const suggestLoopsFlow = ai.defineFlow(
  {
    name: 'suggestLoopsFlow',
    inputSchema: SuggestLoopsInputSchema,
    outputSchema: SuggestLoopsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
