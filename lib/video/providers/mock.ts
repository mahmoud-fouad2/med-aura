import { randomUUID } from "node:crypto"
import type { ParticipantToken, VideoProvider, VideoRoom } from "../provider"

/**
 * In-memory provider for local development and unit tests ONLY. The provider
 * selector refuses to hand it out in production — a mock must never become a
 * silent stand-in for a real call.
 */
export class MockProvider implements VideoProvider {
  readonly id = "mock"
  private readonly rooms = new Map<string, VideoRoom>()

  async createRoom(input: { roomName: string }): Promise<VideoRoom> {
    const existing = this.rooms.get(input.roomName)
    if (existing) return existing
    const room: VideoRoom = {
      roomName: input.roomName,
      providerRoomId: randomUUID(),
      roomUrl: `https://mock.invalid/${input.roomName}`,
    }
    this.rooms.set(input.roomName, room)
    return room
  }

  async getRoom(roomName: string): Promise<VideoRoom | null> {
    return this.rooms.get(roomName) ?? null
  }

  async createParticipantToken(input: {
    roomName: string
    expiresAt: Date
  }): Promise<ParticipantToken> {
    return { token: `mock-token-${randomUUID()}`, expiresAt: input.expiresAt }
  }

  async endRoom(roomName: string): Promise<void> {
    this.rooms.delete(roomName)
  }
}
