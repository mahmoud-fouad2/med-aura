# Multilingual Consultation Plan

## Current state

Med Aura currently embeds a private Daily room and issues short-lived
participant tokens from the server. It does not currently record audio, run live
translation, or persist a transcript. That is intentional: a medical transcript
is sensitive data and must not appear as a UI promise before consent, retention,
access control, and vendor configuration are complete.

## Recommended production design

Use two distinct capabilities:

1. **Live interpretation:** Azure Speech real-time speech translation or the
   Azure OpenAI `gpt-realtime-translate` deployment for continuous audio-to-audio
   interpretation. It supports speech output and translated text, and is the
   appropriate service for a Hindi/Spanish-speaking doctor and an Arabic/
   English/Turkish-speaking patient.
2. **Authoritative transcript:** Daily real-time transcription for captions and
   a final WebVTT artifact, or a server-side speech pipeline when language
   detection and speaker diarization are required. The final artifact must be
   copied to Med Aura private storage and linked to the video session; never put
   a vendor URL in a patient-facing page.

The browser and mobile clients should receive translated caption events through
the existing authenticated session channel. They must not receive vendor API
keys or upload raw audio directly to a third-party service. A small server-side
translation gateway should enforce appointment membership, consent, language
pairs, rate limits, redaction, and retention.

## Required Render variables

Keep these unset until the feature is implemented and privacy-reviewed:

```text
VIDEO_TRANSLATION_PROVIDER=azure
AZURE_SPEECH_ENDPOINT=https://<resource>.cognitiveservices.azure.com
AZURE_SPEECH_REGION=<region>
AZURE_SPEECH_KEY=<secret>
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<secret>
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime-translate
VIDEO_TRANSCRIPTION_ENABLED=false
VIDEO_TRANSCRIPT_RETENTION_DAYS=30
```

Only the selected provider variables are needed. Secrets belong in Render's
secret environment fields, never in the repository, URLs, browser storage, or
logs. `VIDEO_TRANSCRIPTION_ENABLED` must remain `false` until both participants
have explicitly consented and the storage/access workflow is live.

## Data and consent requirements

- Ask each participant separately before the first audio is processed.
- Show a persistent in-call indicator while interpretation or transcription is
  active, with a stop action.
- Store source language, target language, speaker role, timestamps, original
  text, translated text, vendor request ID, consent version, and retention
  expiry. Do not store raw audio by default.
- Expose the final transcript only through the appointment's patient and doctor
  records, with the same authorization boundary as the consultation itself.
- Encrypt stored transcript content, audit every read/export/delete, redact
  payment credentials and unrelated medical details, and delete it when the
  retention period ends.
- Display a medical disclaimer: machine interpretation can be delayed or
  inaccurate and must not replace a qualified human interpreter for consent,
  diagnosis, emergency instructions, or legally required documentation.

## Rollout gates

1. Validate Arabic, English, Turkish, Hindi, and Spanish with production-like
   accents and medical vocabulary.
2. Measure caption latency, translation latency, word error rate, dropped
   segments, reconnect behavior, and cost per consultation.
3. Run a closed pilot with test accounts only; never enable mock video or create
   a real appointment to test this feature.
4. Obtain legal/privacy approval for cross-border processing and retention.
5. Enable the feature by server-side flag, then monitor and keep a manual
   fallback: original audio plus a human interpreter/support path.

## Official references

- Daily transcription: https://docs.daily.co/guides/products/transcription
- Daily transcription API: https://docs.daily.co/reference/rest-api/rooms/transcription/start
- Azure Speech translation: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-translation
- Azure Speech language support: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
- Azure OpenAI realtime translation: https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/gpt-realtime-translate
