// Use require() to avoid TypeScript module augmentation errors when the
// package has no type declarations in this project.
// @ts-ignore: ignore missing module type declarations for @google-cloud/speech
const { SpeechClient, protos } = require('@google-cloud/speech');
import { env } from '../config/env';
import { logger } from '../config/logger';

type SpeechRecognitionResult = any;

const speechClient = new SpeechClient({
  projectId: env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(env.GOOGLE_CLOUD_CREDENTIALS_JSON),
});

export function extractTranscript(results: SpeechRecognitionResult[] | null | undefined): string {
  return (results ?? [])
    .map((result) => result.alternatives?.[0]?.transcript ?? '')
    .filter((text) => text.length > 0)
    .join(' ')
    .trim();
}

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
