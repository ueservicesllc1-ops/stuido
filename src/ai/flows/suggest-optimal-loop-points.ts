'use server';

/**
 * @fileOverview An AI agent that suggests optimal loop points for audio tracks.
 *
 * - suggestOptimalLoopPoints - A function that handles the loop point suggestion process.
 * - SuggestOptimalLoopPointsInput - The input type for the suggestOptimalLoopPoints function.
 * - SuggestOptimalLoopPointsOutput - The return type for the suggestOptimalLoopPoints function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SuggestOptimalLoopPointsInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio track, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  trackName: z.string().describe('The name of the audio track.'),
});
export type SuggestOptimalLoopPointsInput = z.infer<
  typeof SuggestOptimalLoopPointsInputSchema
>;

const SuggestOptimalLoopPointsOutputSchema = z.object({
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
export type SuggestOptimalLoopPointsOutput = z.infer<
  typeof SuggestOptimalLoopPointsOutputSchema
>;

export async function suggestOptimalLoopPoints(
  input: SuggestOptimalLoopPointsInput
): Promise<SuggestOptimalLoopPointsOutput> {
  return suggestOptimalLoopPointsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimalLoopPointsPrompt',
  input: {schema: SuggestOptimalLoopPointsInputSchema},
  output: {schema: SuggestOptimalLoopPointsOutputSchema},
  prompt: `You are an AI music producer who specializes in finding perfect loop points in audio tracks.

You are given an audio track and its name. You will analyze the track and suggest optimal loop points.

Consider musicality, rhythm, and seamlessness when suggesting loop points.

Respond in JSON format with the loopStart, loopEnd, confidence, and reason fields.

Track Name: {{{trackName}}}
Audio: {{media url=audioDataUri}}
`,
});

const suggestOptimalLoopPointsFlow = ai.defineFlow(
  {
    name: 'suggestOptimalLoopPointsFlow',
    inputSchema: SuggestOptimalLoopPointsInputSchema,
    outputSchema: SuggestOptimalLoopPointsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
