// 문법 검사: js/, api/ 아래 모든 .js 파일에 node --check 실행.
// package.json의 셸 for 루프는 Windows(cmd.exe)에서 돌지 않아 Node 스크립트로 옮겼다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// js/(브라우저) + api/(Vercel 서버 함수)
const files = ['js', 'api']
  .filter(dir => fs.existsSync(path.join(ROOT, dir)))
  .flatMap(dir => fs.readdirSync(path.join(ROOT, dir), { recursive: true })
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(ROOT, dir, f)));

let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error(String(e.stderr || e.message));
  }
}
if (failed) process.exit(1);
console.log(`문법 검사 통과: ${files.length}개 파일`);
