export async function onRequest(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const client_id = context.env.GITHUB_CLIENT_ID;
  const client_secret = context.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
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
            window.addEventListener("message", () => {}, false);
            window.opener.postMessage('${postMessageContent}', '*');
            window.close();
          })();
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}
