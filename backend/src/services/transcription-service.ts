import { SpeechClient, protos } from '@google-cloud/speech';
import { env } from '../config/env';
import { logger } from '../config/logger';

type SpeechRecognitionResult = protos.google.cloud.speech.v1.ISpeechRecognitionResult;

const speechClient = new SpeechClient({
  projectId: env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(env.GOOGLE_CLOUD_CREDENTIALS_JSON),
});

/**
 * Pure function extracting the transcript text from Google's response shape.
 * Split out from transcribeAudio so it's testable without a real API call —
 * Google can return multiple result segments for longer audio, each with
 * multiple alternatives ranked by confidence; we want the top alternative
 * from every segment, joined into one string.
 */
export function extractTranscript(
  results: SpeechRecognitionResult[] | null | undefined,
): string {
  return (results ?? [])
    .map((result) => result.alternatives?.[0]?.transcript ?? '')
    .filter((text) => text.length > 0)
    .join(' ')
    .trim();
}

/**
 * Transcribes a voice note buffer using Google Cloud Speech-to-Text.
 *
 * WhatsApp voice notes arrive as OGG/Opus, 16kHz mono — matches Google's
 * OGG_OPUS encoding directly, no conversion needed. `en-NG` (Nigerian
 * English) is set as the primary language; note this does NOT have strong
 * Pidgin support specifically (Google has no dedicated Pidgin language
 * code) — Whisper handles Pidgin/code-switching better, which is why the
 * roadmap has a planned transition back to Whisper once free-tier economics
 * matter less than transcription quality.
 */
export async function transcribeAudio(buffer: Buffer, _mimeType: string): Promise<string> {
  try {
    const [response] = await speechClient.recognize({
      audio: { content: buffer.toString('base64') },
      config: {
        encoding: 'OGG_OPUS',
        sampleRateHertz: 16000,
        languageCode: 'en-NG',
        alternativeLanguageCodes: ['en-US'],
        enableAutomaticPunctuation: true,
      },
    });

    const transcript = extractTranscript(response.results);

    if (!transcript) {
      throw new Error('Google Speech-to-Text returned an empty transcript');
    }

    return transcript;
  } catch (err) {
    logger.error({ err }, 'Google Cloud Speech-to-Text transcription failed');
    throw new Error('Failed to transcribe voice note');
  }
}
