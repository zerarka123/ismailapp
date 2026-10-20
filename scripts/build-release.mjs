// Builds a signed Android App Bundle (.aab) ready to upload to Google Play:   npm run android:release [-- --bump]
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { javaTool, run } from './lib/run.mjs';
import { nextVersion, patchGradle } from './lib/patch-android.mjs';

const KEYSTORE = process.env.MARSA_KEYSTORE || 'keystore/marsa-upload.jks';
const ALIAS = process.env.MARSA_KEY_ALIAS || 'marsa-upload';
if (!existsSync('android')) throw new Error('android/ not found. Run: npm run android:setup');
if (!existsSync(KEYSTORE)) throw new Error(`${KEYSTORE} not found. Run: npm run keystore`);

const bump = process.argv.includes('--bump');
const version = nextVersion(JSON.parse(readFileSync('android-version.json', 'utf8')), bump);
writeFileSync('android-version.json', JSON.stringify(version) + '\n');
const gPath = 'android/app/build.gradle';
writeFileSync(gPath, patchGradle(readFileSync(gPath, 'utf8'), version));
console.log(`Building version ${version.versionName} (code ${version.versionCode})`);

run('npm', ['run', 'build']);
run('npx', ['cap', 'sync', 'android']);
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
run(gradlew, ['clean', 'bundleRelease'], { cwd: 'android' });

const built = 'android/app/build/outputs/bundle/release/app-release.aab';
if (!existsSync(built)) throw new Error(`Expected ${built} but it was not created.`);
mkdirSync('release', { recursive: true });
const out = join('release', `marsa-${version.versionName}-${version.versionCode}.aab`);
copyFileSync(built, out);

console.log('\nSigning with your upload key — enter the keystore password when asked.');
run(javaTool('jarsigner'), ['-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', '-keystore', KEYSTORE, out, ALIAS]);
run(javaTool('jarsigner'), ['-verify', out]);
console.log(`\nDONE ->  ${out}\nUpload this file in Play Console (Testing -> Closed testing -> Create release).`);
