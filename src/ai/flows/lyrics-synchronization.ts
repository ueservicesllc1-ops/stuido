
'use server';
/**
 * @fileOverview Un agente de IA que sincroniza la letra de una canción con un archivo de audio.
 *
 * - synchronizeLyricsFlow - Una función que maneja el proceso de sincronización de letras.
 * - LyricsSyncInput - El tipo de entrada para la función synchronizeLyricsFlow.
 * - LyricsSyncOutput - El tipo de retorno para la función.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LyricsSyncInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "El archivo de audio de la canción completa, como un data URI que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  lyrics: z.string().describe('La letra completa de la canción como un único string.'),
});
export type LyricsSyncInput = z.infer<typeof LyricsSyncInputSchema>;

const WordTimestampSchema = z.object({
    word: z.string().describe("Una palabra de la letra."),
    startTime: z.number().describe("El tiempo de inicio de la palabra en segundos desde el comienzo de la canción."),
    endTime: z.number().describe("El tiempo de finalización de la palabra en segundos."),
});

const LyricsSyncOutputSchema = z.object({
  words: z.array(WordTimestampSchema).describe("Un array de todas las palabras de la letra, cada una con su tiempo de inicio y fin."),
});
export type LyricsSyncOutput = z.infer<typeof LyricsSyncOutputSchema>;

export async function synchronizeLyricsFlow(input: LyricsSyncInput): Promise<LyricsSyncOutput> {

  const prompt = ai.definePrompt({
    name: 'lyricsSyncPrompt',
    input: {schema: LyricsSyncInputSchema},
    output: {schema: LyricsSyncOutputSchema},
    prompt: `You are an expert audio analyst specializing in lyrics synchronization, like a karaoke machine. Your task is to analyze an audio file and a string of lyrics to determine the precise start and end time for each individual word.

    - You will be given an audio file of a full song and the complete lyrics.
    - You must listen to the audio and identify when each word from the lyrics is sung.
    - Your output must be an array of objects, where each object contains a single 'word', its 'startTime' in seconds, and its 'endTime' in seconds.
    - The order of the words in the output array must match the order in the original lyrics.
    - Be as precise as possible with the timestamps.
    
    Analyze the following audio file and lyrics:
    Audio: {{media url=audioDataUri}}
    Lyrics:
    ---
    {{{lyrics}}}
    ---
    `,
  });

  const { output } = await prompt(input);
  return output!;
}
