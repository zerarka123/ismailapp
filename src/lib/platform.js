import { Capacitor } from '@capacitor/core';

// True only inside the installed Android app (Capacitor), false on the website / PWA.
// Google Play's payments policy: the Play build must not tell users how to pay or renew outside Google Play,
// so subscription / renewal wording is hidden when this is true.
export const IS_NATIVE_APP = Capacitor.isNativePlatform();
