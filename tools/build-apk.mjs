// Builds dist/Tensile.apk. The build runs in a folder outside this project, so the
// many thousands of files it makes never land in a synced folder such as OneDrive.
// First run: npm run android:setup

import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = fileURLToPath(new URL('..', import.meta.url));
const ROOT = join(process.env.LOCALAPPDATA ?? '', 'BandworkAndroid');
const WORK = join(ROOT, 'work');
const JAVA_HOME = join(ROOT, 'jdk');
const ANDROID_HOME = join(ROOT, 'sdk');

if (!existsSync(join(JAVA_HOME, 'bin', 'java.exe')) || !existsSync(ANDROID_HOME)) {
  console.error('Android tools are missing. Run this once first: npm run android:setup');
  process.exit(1);
}

const env = { ...process.env, JAVA_HOME, ANDROID_HOME, ANDROID_SDK_ROOT: ANDROID_HOME };
const run = (command, cwd = WORK) => execSync(command, { cwd, env, stdio: 'inherit' });

mkdirSync(WORK, { recursive: true });
rmSync(join(WORK, 'public'), { recursive: true, force: true });
for (const item of ['public', 'capacitor.config.json', 'package.json', 'package-lock.json']) {
  if (existsSync(join(PROJECT, item))) cpSync(join(PROJECT, item), join(WORK, item), { recursive: true });
}
cpSync(join(PROJECT, 'android'), join(WORK, 'android'), { recursive: true });

run('npm ci --no-audit --no-fund');
run('npx cap sync android');
run(`"${join(WORK, 'android', 'gradlew.bat')}" assembleDebug --no-daemon`, join(WORK, 'android'));

mkdirSync(join(PROJECT, 'dist'), { recursive: true });
const output = join(PROJECT, 'dist', 'Tensile.apk');
copyFileSync(join(WORK, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), output);
console.log(`\nBuilt ${output}`);
