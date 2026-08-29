export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') || 'github';

  if (provider === 'github') {
    const clientId = env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return new Response('GITHUB_CLIENT_ID not configured.', { status: 500 });
    }
    
    const state = crypto.randomUUID(); 
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&state=${state}`;
    
    return Response.redirect(githubAuthUrl, 302);
  }

  return new Response('Unsupported provider', { status: 400 });
}
