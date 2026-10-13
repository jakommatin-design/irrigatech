import { spawn } from 'node:child_process';
import process from 'node:process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const commands = [
  { label: 'backend', cwd: new URL('../server/', import.meta.url), args: ['run', 'dev'] },
  { label: 'frontend', cwd: new URL('../', import.meta.url), args: ['run', 'dev'] }
];
const children = commands.map(({ label, cwd, args }) => {
  const child = spawn(npm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('error', error => { console.error(`[${label}] ${error.message}`); process.exitCode = 1; });
  child.on('exit', code => { if (code && code !== 0) process.exitCode = code; });
  return child;
});
const stop = () => children.forEach(child => { if (!child.killed) child.kill(); });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
