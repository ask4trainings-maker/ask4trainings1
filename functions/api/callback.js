export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Ask4Trainings-CMS"
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    const data = await tokenResponse.json();

    if (data.error || !data.access_token) {
      return new Response(`OAuth Error: ${data.error_description || data.error}`, { status: 400 });
    }

    let targetRepo = env.GITHUB_REPO;
    if (!targetRepo) {
      try {
        const configUrl = new URL('/admin/config.yml', request.url);
        const configRes = await fetch(configUrl);
        if (configRes.ok) {
          const configText = await configRes.text();
          const match = configText.match(/repo:\s*([^\s]+)/);
          if (match) targetRepo = match[1].trim();
        }
      } catch (e) {
        console.error("Failed to fetch config.yml", e);
      }
    }

    if (!targetRepo) {
      return new Response("Configuration Error: Target repository not found in env or config.", { status: 500 });
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${targetRepo}`, {
      headers: {
        "Authorization": `Bearer ${data.access_token}`,
        "User-Agent": "Ask4Trainings-CMS-Auth",
        "Accept": "application/vnd.github+json"
      }
    });

    if (!repoResponse.ok) {
      return new Response("Access Denied: Unable to verify repository permissions.", { status: 403 });
    }

    const repoData = await repoResponse.json();
    const permissions = repoData.permissions;

    // Enforce write or admin permissions (Collaborators & Owners only)
    const hasWriteAccess = permissions && (permissions.push === true || permissions.admin === true);

    if (!hasWriteAccess) {
      return new Response("Access Denied: You must be an authorized collaborator or repository owner to access this CMS.", {
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Handshake back to Sveltia CMS window via postMessage
    const content = `
      <!doctype html>
      <html>
        <body>
          <script>
            (function() {
              function receiveMessage(e) {
                window.opener.postMessage(
                  'authorization:github:success:${JSON.stringify({
                    token: data.access_token,
                    provider: "github"
                  })}',
                  e.origin
                );
                window.removeEventListener("message", receiveMessage, false);
                window.close();
              }
              window.addEventListener("message", receiveMessage, false);
              window.opener.postMessage("authorizing:github", "*");
            })();
          </script>
        </body>
      </html>
    `;

    return new Response(content, {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  } catch (err) {
    return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
