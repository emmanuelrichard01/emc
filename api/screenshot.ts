export const config = {
  runtime: 'edge',
};

// Only these project domains can be screenshotted — this endpoint is public
// (no auth), so an open allowlist keeps it from being abused as a
// pay-per-request URL-fetch proxy against our screenshotapi.to quota.
const ALLOWED_HOSTS = new Set([
  'medvaxhealth.com',
  'ultra-news.vercel.app',
  'caritas-ai-scholar.vercel.app',
  'evanty.vercel.app',
]);

export default async function handler(request: Request) {
  const apiKey = process.env.SCREENSHOT_API_KEY;
  if (!apiKey) {
    return new Response('Screenshot service not configured', { status: 500 });
  }

  const targetUrl = new URL(request.url).searchParams.get('url');
  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    return new Response('Invalid url parameter', { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(hostname)) {
    return new Response('Host not allowed', { status: 403 });
  }

  try {
    const screenshotRes = await fetch(
      `https://screenshotapi.to/api/v1/screenshot?url=${encodeURIComponent(targetUrl)}&width=1280&height=720&type=png&colorScheme=light&devicePixelRatio=2`,
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    );

    if (!screenshotRes.ok) {
      return new Response('Error fetching screenshot', { status: screenshotRes.status });
    }

    const imageBuffer = await screenshotRes.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000',
      },
    });
  } catch {
    return new Response('Internal Server Error', { status: 500 });
  }
}
