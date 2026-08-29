export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return new Response('Missing authorization code.', { status: 400 });
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return new Response(`Error: ${tokenData.error_description}`, { status: 400 });
    }

    // Pass token back to Sveltia CMS window
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Success</title></head>
      <body>
        <p>Authentication successful. You can close this window if it doesn't close automatically.</p>
        <script>
          const message = {
            token: "${tokenData.access_token}",
            provider: "github"
          };
          const targetOrigin = window.location.origin;
          window.opener.postMessage("authorization:github:success:" + JSON.stringify(message), targetOrigin);
          window.close();
        </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  } catch (err) {
    return new Response(`Authentication failed: ${err.message}`, { status: 500 });
  }
}
