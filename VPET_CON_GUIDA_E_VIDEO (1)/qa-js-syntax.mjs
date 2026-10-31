import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('dist/index.html', 'utf8');
let checked = 0;
let errors = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attributes = match[1] || '';
  if (/\bsrc\s*=/.test(attributes) || /\btype\s*=\s*["']?(application\/json|application\/ld\+json|importmap)/i.test(attributes)) continue;
  const script = match[2].replace(/<\\\/script/gi, '</script');
  if (!script.trim()) continue;
  checked++;
  try { new vm.Script(script, {filename: 'VPET-inline-script-' + checked + '.js'}); }
  catch (err) {
    errors++;
    console.error('FAIL: script ' + checked + ': ' + err.message);
  }
}
console.log('VPET inline JavaScript checked: ' + checked + ', errors: ' + errors);
if (errors) process.exit(1);
