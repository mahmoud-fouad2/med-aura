import { VideoProviderError, type ParticipantToken, type VideoProvider, type VideoRoom } from "../provider"

/**
 * Daily.co adapter — plain REST, no vendor SDK on the server. Rooms are
 * created `private`, clamped to the join window (`nbf`/`exp`), and every
 * participant needs a short-lived meeting token minted here.
 *
 * Docs: https://docs.daily.co/reference/rest-api
 */

const API_BASE = "https://api.daily.co/v1"

type DailyRoom = {
  id: string
  name: string
  url: string
}

export class DailyProvider implements VideoProvider {
  readonly id = "daily"

  constructor(private readonly apiKey: string) {}

  private async request<T>(
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<{ status: number; body: T | null }> {
    let res: Response
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      })
    } catch (cause) {
      throw new VideoProviderError("daily unreachable", cause)
    }
    const body = (await res.json().catch(() => null)) as T | null
    return { status: res.status, body }
  }

  async createRoom(input: {
    roomName: string
    notBefore: Date
    expiresAt: Date
  }): Promise<VideoRoom> {
    const { status, body } = await this.request<DailyRoom>("/rooms", {
      method: "POST",
      body: {
        name: input.roomName,
        privacy: "private",
        properties: {
          nbf: Math.floor(input.notBefore.getTime() / 1000),
          exp: Math.floor(input.expiresAt.getTime() / 1000),
          max_participants: 4,
          eject_at_room_exp: true,
          enable_screenshare: false,
          enable_chat: false,
          enable_prejoin_ui: false,
          start_video_off: false,
          start_audio_off: false,
        },
      },
    })
    // Concurrent creation: the room already existing is success, not failure.
    if (status === 400 && JSON.stringify(body ?? "").includes("already exists")) {
      const existing = await this.getRoom(input.roomName)
      if (existing) return existing
    }
    if (status !== 200 || !body) {
      throw new VideoProviderError(`daily createRoom failed (${status})`, body)
    }
    return { roomName: body.name, providerRoomId: body.id, roomUrl: body.url }
  }

  async getRoom(roomName: string): Promise<VideoRoom | null> {
    const { status, body } = await this.request<DailyRoom>(
      `/rooms/${encodeURIComponent(roomName)}`,
    )
    if (status === 404) return null
    if (status !== 200 || !body) {
      throw new VideoProviderError(`daily getRoom failed (${status})`, body)
    }
    return { roomName: body.name, providerRoomId: body.id, roomUrl: body.url }
  }

  async createParticipantToken(input: {
    roomName: string
    userName: string
    role: "patient" | "doctor" | "staff"
    expiresAt: Date
  }): Promise<ParticipantToken> {
    const { status, body } = await this.request<{ token: string }>(
      "/meeting-tokens",
      {
        method: "POST",
        body: {
          properties: {
            room_name: input.roomName,
            user_name: input.userName,
            // Doctors/staff moderate the call (can eject, end for all).
            is_owner: input.role !== "patient",
            exp: Math.floor(input.expiresAt.getTime() / 1000),
          },
        },
      },
    )
    if (status !== 200 || !body?.token) {
      throw new VideoProviderError(`daily token failed (${status})`, body)
    }
    return { token: body.token, expiresAt: input.expiresAt }
  }

  async endRoom(roomName: string): Promise<void> {
    const { status } = await this.request(
      `/rooms/${encodeURIComponent(roomName)}`,
      { method: "DELETE" },
    )
    // Already gone is fine — ending must be idempotent.
    if (status !== 200 && status !== 404) {
      throw new VideoProviderError(`daily endRoom failed (${status})`)
    }
  }
}
