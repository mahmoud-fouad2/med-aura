/**
 * Provider-agnostic video contract. Everything the rest of Med Aura knows
 * about a video vendor goes through this interface — swapping Daily for
 * Agora/Twilio/Jitsi/anything later means writing one new adapter, not
 * touching the service, the APIs, or any screen.
 */

export type VideoRole = "patient" | "doctor" | "staff"

export type VideoRoom = {
  /** Our stable name for the room (also the provider room name). */
  roomName: string
  /** The provider's own id for the room, when it has one. */
  providerRoomId: string | null
  /** Join URL understood by the provider's SDKs. Useless without a token. */
  roomUrl: string
}

export type ParticipantToken = {
  token: string
  expiresAt: Date
}

export interface VideoProvider {
  readonly id: string

  createRoom(input: {
    roomName: string
    /** Provider-side clamp: the room refuses joins outside this range. */
    notBefore: Date
    expiresAt: Date
  }): Promise<VideoRoom>

  getRoom(roomName: string): Promise<VideoRoom | null>

  createParticipantToken(input: {
    roomName: string
    userName: string
    role: VideoRole
    expiresAt: Date
  }): Promise<ParticipantToken>

  endRoom(roomName: string): Promise<void>
}

/** Raised when the vendor API misbehaves — callers map it to humane copy. */
export class VideoProviderError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message)
  }
}
