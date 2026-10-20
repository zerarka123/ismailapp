// npm run test:scripts — checks the Android patchers against templates shaped like Capacitor 8's.
import assert from 'node:assert/strict';
import { nextVersion, patchGradle, patchManifest, readTargetSdk } from './lib/patch-android.mjs';

const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <activity android:name=".MainActivity" android:exported="true"/>
    </application>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
</manifest>`;
let r = patchManifest(manifest);
assert.match(r.xml, /android:allowBackup="false"/);
assert.match(r.xml, /android:usesCleartextTraffic="false"/);
assert.equal(r.notes.length, 0);
assert.equal(r.permissions.length, 3);
assert.equal(patchManifest(r.xml).xml, r.xml, 'idempotent');
r = patchManifest(manifest.replace('</manifest>', '<uses-permission android:name="android.permission.CAMERA" /></manifest>'));
assert.equal(r.notes.length, 1);
assert.throws(() => patchManifest('<manifest/>'));

for (const g of ['versionCode 1\n        versionName "1.0"', 'versionCode = 1\n        versionName = "1.0"']) {
  const out = patchGradle(`defaultConfig {\n applicationId "x"\n ${g}\n}`, { versionCode: 7, versionName: '1.2.3' });
  assert.match(out, /versionCode 7/);
  assert.match(out, /versionName "1\.2\.3"/);
  assert.equal(patchGradle(out, { versionCode: 7, versionName: '1.2.3' }), out, 'idempotent');
}
assert.throws(() => patchGradle('nothing here', { versionCode: 1, versionName: '1.0.0' }));
assert.throws(() => patchGradle('versionCode 1 versionName "1"', { versionCode: 0, versionName: '1.0.0' }));
assert.throws(() => patchGradle('versionCode 1 versionName "1"', { versionCode: 1, versionName: 'abc' }));

assert.equal(readTargetSdk('ext {\n    minSdkVersion = 24\n    compileSdkVersion = 36\n    targetSdkVersion = 36\n}'), 36);
assert.throws(() => readTargetSdk('ext {}'));
assert.deepEqual(nextVersion({ versionCode: 3, versionName: '1.0.2' }, true), { versionCode: 4, versionName: '1.0.3' });
assert.deepEqual(nextVersion({ versionCode: 3, versionName: '1.0.2' }, false), { versionCode: 3, versionName: '1.0.2' });
console.log('script tests: all passed');
