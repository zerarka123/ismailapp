// Pure text patchers for the files Capacitor generates under android/. Each throws if it cannot find
// what it expects, so a template change never silently produces a wrong build.

export function patchManifest(xml) {
  const notes = [];
  let out = xml;
  const app = out.match(/<application\b[^>]*>/);
  if (!app) throw new Error('AndroidManifest.xml: <application> not found');
  let tag = app[0];
  const setAttr = (name, value) => {
    const re = new RegExp(`${name.replace('.', '\\.')}="[^"]*"`);
    tag = re.test(tag) ? tag.replace(re, `${name}="${value}"`) : tag.replace('<application', `<application\n        ${name}="${value}"`);
  };
  setAttr('android:allowBackup', 'false');
  setAttr('android:usesCleartextTraffic', 'false');
  setAttr('android:supportsRtl', 'true');
  out = out.replace(app[0], tag);
  const perms = [...out.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]);
  // POST_NOTIFICATIONS / WAKE_LOCK come with @capacitor/push-notifications (smart notifications)
  const allowed = new Set(['android.permission.INTERNET', 'android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION', 'android.permission.POST_NOTIFICATIONS', 'android.permission.WAKE_LOCK']);
  for (const p of perms) if (!allowed.has(p)) notes.push(`UNEXPECTED permission in manifest: ${p} (remove it, or declare it in Play Console)`);
  return { xml: out, permissions: perms, notes };
}

export function patchGradle(text, { versionCode, versionName }) {
  if (!Number.isInteger(versionCode) || versionCode < 1) throw new Error('versionCode must be a positive integer');
  if (!/^\d+\.\d+\.\d+$/.test(versionName)) throw new Error('versionName must look like 1.0.0');
  const vc = /versionCode\s*=?\s*\d+/;
  const vn = /versionName\s*=?\s*"[^"]*"/;
  if (!vc.test(text) || !vn.test(text)) throw new Error('app/build.gradle: versionCode/versionName not found');
  return text.replace(vc, `versionCode ${versionCode}`).replace(vn, `versionName "${versionName}"`);
}

export function readTargetSdk(variablesGradle) {
  const m = variablesGradle.match(/targetSdkVersion\s*=\s*(\d+)/);
  if (!m) throw new Error('variables.gradle: targetSdkVersion not found');
  return Number(m[1]);
}

export function nextVersion(v, bump) {
  if (!bump) return { ...v };
  const [a, b, c] = v.versionName.split('.').map(Number);
  return { versionCode: v.versionCode + 1, versionName: `${a}.${b}.${c + 1}` };
}
