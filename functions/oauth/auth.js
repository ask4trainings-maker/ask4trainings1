export async function onRequest(context) {
  const client_id = context.env.GITHUB_CLIENT_ID;
  const redirect_uri = `${new URL(context.request.url).origin}/oauth/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=repo,user`;
  return Response.redirect(url, 302);
}
