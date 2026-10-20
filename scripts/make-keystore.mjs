// Creates the UPLOAD key for Google Play.  keytool asks for the passwords itself — nothing is stored by this script.
import { existsSync, mkdirSync } from 'node:fs';
import { javaTool, run } from './lib/run.mjs';

const path = 'keystore/marsa-upload.jks';
if (existsSync(path)) {
  console.log(`\n${path} already exists — NOT overwriting it (losing/overwriting the key blocks future updates).`);
  process.exit(0);
}
mkdirSync('keystore', { recursive: true });
console.log(`
You will be asked for:
  1) a keystore password (choose a long one and WRITE IT DOWN)
  2) your name / organisation (any honest values; they are not shown to users)
  3) confirm.  Press Enter when asked for the key password to reuse the same one.
`);
run(javaTool('keytool'), ['-genkeypair', '-v', '-keystore', path, '-alias', 'marsa-upload', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000']);
console.log(`
Created ${path}  (alias: marsa-upload)
NOW: copy it + the password to TWO safe places (USB + private cloud/password manager).
Never commit it to GitHub. Never send it to anyone (including Claude).`);
