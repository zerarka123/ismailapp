// One-time (and repeatable) Android project setup:  npm run android:setup
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { capture, javaTool, run } from './lib/run.mjs';
import { patchGradle, patchManifest, readTargetSdk } from './lib/patch-android.mjs';

const major = Number(process.versions.node.split('.')[0]);
if (major < 22) throw new Error(`Node ${process.versions.node} is too old. Capacitor 8 needs Node 22 or newer.`);
const j = capture(javaTool('java'), ['-version']);
const jv = j.out.match(/version "(\d+)/);
if (!j.ok || !jv) throw new Error('Java (JDK) not found. Install JDK 21 (Temurin) and reopen the terminal.');
if (Number(jv[1]) < 21) throw new Error(`JDK ${jv[1]} found, but Capacitor 8 needs JDK 21 or newer.`);

run('npm', ['run', 'build']);
if (!existsSync('android')) run('npx', ['cap', 'add', 'android']);
run('npx', ['capacitor-assets', 'generate', '--android']);

const version = JSON.parse(readFileSync('android-version.json', 'utf8'));
const mPath = 'android/app/src/main/AndroidManifest.xml';
const m = patchManifest(readFileSync(mPath, 'utf8'));
writeFileSync(mPath, m.xml);
const gPath = 'android/app/build.gradle';
writeFileSync(gPath, patchGradle(readFileSync(gPath, 'utf8'), version));
const target = readTargetSdk(readFileSync('android/variables.gradle', 'utf8'));
run('npx', ['cap', 'sync', 'android']);

console.log('\n==== Android setup summary ====');
console.log('permissions in manifest:', m.permissions.join(', ') || '(none)');
m.notes.forEach((n) => console.log('WARNING:', n));
console.log(`targetSdkVersion = ${target}`, target >= 36 ? '(OK for Google Play)' : '(TOO LOW: Google Play needs 36 or newer)');
console.log(`version: ${version.versionName} (code ${version.versionCode})`);
console.log('\nNext: npm run keystore   (once)   then   npm run android:release');
