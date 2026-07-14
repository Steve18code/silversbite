import { describe, expect, it } from 'vitest';
import { extractTranscript } from '../services/transcription-service';

describe('extractTranscript', () => {
  it('extracts the top alternative from a single result', () => {
    const results = [
      {
        alternatives: [
          { transcript: 'I want two jollof rice', confidence: 0.95 },
          { transcript: 'I want to jollof rice', confidence: 0.6 },
        ],
      },
    ];

    expect(extractTranscript(results)).toBe('I want two jollof rice');
  });

  it('joins multiple result segments with spaces', () => {
    const results = [
      { alternatives: [{ transcript: 'I want two jollof rice' }] },
      { alternatives: [{ transcript: 'and one coke please' }] },
    ];

    expect(extractTranscript(results)).toBe('I want two jollof rice and one coke please');
  });

  it('returns an empty string for null results', () => {
    expect(extractTranscript(null)).toBe('');
  });

  it('returns an empty string for undefined results', () => {
    expect(extractTranscript(undefined)).toBe('');
  });

  it('returns an empty string for an empty array', () => {
    expect(extractTranscript([])).toBe('');
  });

  it('skips segments with no alternatives without crashing', () => {
    const results = [
      { alternatives: [{ transcript: 'hello' }] },
      { alternatives: [] },
      { alternatives: [{ transcript: 'world' }] },
    ];

    expect(extractTranscript(results)).toBe('hello world');
  });

  it('trims leading/trailing whitespace from the joined result', () => {
    const results = [{ alternatives: [{ transcript: '  hi there  ' }] }];
    expect(extractTranscript(results)).toBe('hi there');
  });
});
