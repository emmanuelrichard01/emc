import fs from 'fs';
import path from 'path';

// Run with: node --env-file=.env scripts/fetch-screenshots.mjs
const API_KEY = process.env.SCREENSHOT_API_KEY;
if (!API_KEY) {
  console.error('Missing SCREENSHOT_API_KEY env var. Set it in .env (see .env.example) and run with --env-file=.env.');
  process.exit(1);
}

const projects = [
  { id: 'medvax', url: 'https://medvaxhealth.com' },
  { id: 'ultra-news', url: 'https://ultra-news.vercel.app/' },
  { id: 'caritas-scholar', url: 'https://caritas-ai-scholar.vercel.app/' },
  { id: 'evanty', url: 'https://evanty.vercel.app/' }
];

async function fetchScreenshots() {
  console.log('Starting screenshot downloads...');
  for (const p of projects) {
    const target = `https://screenshotapi.to/api/v1/screenshot?url=${encodeURIComponent(p.url)}&width=1280&height=720&type=png&colorScheme=light&devicePixelRatio=2`;
    console.log(`Fetching ${p.id}...`);
    try {
      const res = await fetch(target, {
        headers: { 'x-api-key': API_KEY }
      });
      if (!res.ok) {
        console.error(`Failed to fetch ${p.id}: ${await res.text()}`);
        continue;
      }
      const buffer = await res.arrayBuffer();
      
      const outDir = path.join(process.cwd(), 'public', 'images');
      if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
      }

      fs.writeFileSync(path.join(outDir, `${p.id}.png`), Buffer.from(buffer));
      console.log(`Saved public/images/${p.id}.png`);
    } catch (e) {
      console.error(`Error for ${p.id}:`, e);
    }
  }
  console.log('Done!');
}

fetchScreenshots();
