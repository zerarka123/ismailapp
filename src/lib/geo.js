// Location is requested ONLY when the user taps "حدّد موقع نشاطك". Works in the browser and in the Android app.
export async function getPosition() {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const perm = await Geolocation.requestPermissions({ permissions: ['location'] });
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') throw new Error('denied');
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    return round(p.coords);
  }
  if (!navigator.geolocation) throw new Error('unsupported');
  const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000 }));
  return round(p.coords);
}
const round = (c) => ({ lat: Number(c.latitude.toFixed(6)), lng: Number(c.longitude.toFixed(6)) });
