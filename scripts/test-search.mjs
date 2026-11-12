// npm run test:search — smart search (src/lib/smartSearch.js) and the landing-site language helpers.
import assert from 'node:assert/strict';
import { expandQuery, fuzzyMatch, normalize, orFilter, skeleton } from '../src/lib/smartSearch.js';
import { categoryNames, ml, notFoundPage, page, placeHtml, priceHtml, wilayaNames } from '../site/functions/_lib/site.js';

// Arabic ↔ Latin spellings reach the database together
assert.ok(expandQuery('ياماها')[0].includes('yamaha'));
assert.ok(expandQuery('yamaha')[0].includes('ياماها'));
assert.ok(expandQuery('yam')[0].includes('ياماها'), 'a few letters are enough');
assert.ok(expandQuery('yamha')[0].includes('yamaha'), 'one wrong letter');
assert.ok(expandQuery('محرك')[0].includes('moteur'));
assert.equal(expandQuery('moteur yamaha 40').length, 3, 'one group per word');
assert.deepEqual(expandQuery('   '), []);
assert.equal(expandQuery('a b c d e f g h').length, 5, 'at most five words');

// The user's text cannot break out of the filter
assert.equal(orFilter(['50%_"x'], ['title']), 'title.ilike."%50\\\\%\\\\_\\"x%"');
assert.equal(orFilter(['a', 'b'], ['title', 'description']).split(',').length, 4);

assert.equal(normalize('Hélice  إعلان'), 'helice اعلان');
assert.equal(skeleton('tohatsu'), skeleton(normalize('توهاتسو')));

// Typo-tolerant fallback
assert.ok(fuzzyMatch('yamha', 'Moteur yamaha 150 cv'));
assert.ok(fuzzyMatch('ياماها', 'Moteur yamaha 85 cv'));
assert.ok(fuzzyMatch('yamaha', 'محرك ياماها 115 حصان'));
assert.ok(fuzzyMatch('توهاتسو', 'Moteur Tohatsu 30'));
assert.ok(fuzzyMatch('قارب', 'Console bateaux'));
assert.ok(!fuzzyMatch('yamaha', 'Console bateaux'));
assert.ok(!fuzzyMatch('yamaha suzuki', 'Moteur yamaha'), 'every word must match');
assert.ok(!fuzzyMatch('', 'anything'));

// Site: wilayas and categories follow the language
assert.deepEqual(wilayaNames('تيبازة'), ['تيبازة', 'Tipaza', 'Tipaza']);
assert.deepEqual(wilayaNames('الجزائر'), ['الجزائر', 'Alger', 'Algiers']);
assert.deepEqual(wilayaNames('مكان آخر'), ['مكان آخر', 'مكان آخر', 'مكان آخر']);
assert.equal(categoryNames('inox_workshops', 'ورشات الإينوكس')[1], 'Ateliers inox');
assert.equal(categoryNames('x', 'ع', 'F', 'E')[2], 'E');
assert.match(placeHtml('تيبازة', 'Berard'), /data-fr="Tipaza".*· Berard$/);
assert.match(priceHtml(850000), /data-fr="850 000 DA"/);
assert.equal(priceHtml(0), '');
assert.match(ml(['<a>', '"b"', 'c']), /data-fr="&quot;b&quot;".*>&lt;a&gt;</);
const html = page({ title: 'T', titles: ['ع', 'F', 'E'], description: 'd', path: '/c/x', body: '<h1>x</h1>' });
assert.match(html, /class="langsw"/);
assert.match(html, /name="ml-title" data-ar="ع" data-fr="F" data-en="E"/);
assert.equal(notFoundPage().status, 404);

console.log('search + site language tests passed');
