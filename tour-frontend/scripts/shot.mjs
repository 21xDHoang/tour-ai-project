/**
 * Chụp ảnh giao diện để tự soát thiết kế.
 *
 * Công cụ phát triển, không nằm trong bundle: `content` của Tailwind chỉ quét
 * `./index.html` và `./src/**`, nên thư mục scripts/ không lọt vào build.
 *
 * Dùng:
 *   node scripts/shot.mjs <url> <file-ra> [--w=1440] [--h=1000] [--full]
 *                        [--wait=800] [--sel=.selector] [--mobile]
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const [, , url, out, ...flags] = process.argv;
if (!url || !out) {
  console.error('Thiếu tham số. Dùng: node scripts/shot.mjs <url> <file-ra> [--full]');
  process.exit(1);
}

const arg = (name, fallback) => {
  const hit = flags.find((f) => f.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => flags.includes(`--${name}`);

const width = Number(arg('w', 1440));
const height = Number(arg('h', 1000));
const waitMs = Number(arg('wait', 900));
const selector = arg('sel', null);
const mobile = has('mobile');

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--disable-gpu', '--no-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: mobile ? 390 : width,
    height: mobile ? 844 : height,
    deviceScaleFactor: 2,
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

  // Chờ web font về để ảnh không bị chụp bằng font dự phòng.
  await page.evaluate(() => document.fonts.ready);

  if (selector) {
    await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {});
  }

  // Ảnh Unsplash tải chậm — chờ thêm rồi mới chụp.
  await new Promise((r) => setTimeout(r, waitMs));

  await page.screenshot({
    path: out,
    fullPage: has('full'),
  });

  console.log(`Đã lưu: ${out}`);
} finally {
  await browser.close();
}
