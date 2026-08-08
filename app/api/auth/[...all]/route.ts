import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

const handlers = toNextJsHandler(auth.handler)

function withMobileWebCors(response: Response): Response {
	if (process.env.NODE_ENV === "development") {
		response.headers.set("Access-Control-Allow-Origin", "http://localhost:8081")
		response.headers.set("Access-Control-Allow-Credentials", "true")
		response.headers.set("Vary", "Origin")
	}
	return response
}

export async function GET(request: Request) {
	return withMobileWebCors(await handlers.GET(request))
}

export async function POST(request: Request) {
	return withMobileWebCors(await handlers.POST(request))
}

export function OPTIONS() {
	if (process.env.NODE_ENV !== "development") {
		return new Response(null, { status: 404 })
	}
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "http://localhost:8081",
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			Vary: "Origin",
		},
	})
}
