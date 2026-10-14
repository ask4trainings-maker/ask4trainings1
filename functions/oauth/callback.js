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

function getCorsHeaders(request) {
  return {
    "Access-Control-Allow-Origin": getCorsOrigin(request),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request)
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const client_id = env.GITHUB_CLIENT_ID;
  const client_secret = env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return new Response('Missing authorization code', {
      status: 400,
      headers: getCorsHeaders(request)
    });
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Ask4Trainings-CMS'
    },
    body: JSON.stringify({ client_id, client_secret, code })
  });

  const tokenData = await tokenResponse.json();

  const postMessageContent = tokenData.access_token
    ? `authorizing:github:success:${JSON.stringify({ token: tokenData.access_token, provider: 'github' })}`
    : `authorizing:github:error:${JSON.stringify(tokenData)}`;

  const html = `
    <!doctype html>
    <html>
      <body>
        <script>
          (() => {
            if (window.opener) {
              window.addEventListener("message", () => {}, false);
              window.opener.postMessage('${postMessageContent}', '*');
              window.close();
            } else {
              window.location.href = "https://ask4trainings.com/admin/";
            }
          })();
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      ...getCorsHeaders(request)
    }
  });
}
