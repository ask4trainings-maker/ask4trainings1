const ALLOWED_ORIGINS = [
  "https://ask4trainings.com",
  "https://www.ask4trainings.com",
  "http://localhost:4321",
  "http://127.0.0.1:4321"
];

function getCorsOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return "https://ask4trainings.com";
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": getCorsOrigin(context.request),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response("Missing GITHUB_CLIENT_ID environment variable", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": getCorsOrigin(request)
      }
    });
  }

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "repo,user");

  return Response.redirect(authUrl.toString(), 302);
}
