const { test } = require('node:test');
const assert = require('node:assert/strict');
const Scout = require('../../skills/x-com/scripts/core.js');
test('profile extraction excludes posts, X routes and external links', () => {
  assert.equal(Scout.handleFromUrl('https://x.com/Example_1'), 'example_1');
  for (const url of ['/home','/i','/user/status/123','https://evil.test/user','/too_long_for_a_handle','/search']) assert.equal(Scout.handleFromUrl(url), null);
});
test('US rules distinguish location from store and never use vague regions', () => {
  assert.equal(Scout.matches({ accountBasedIn: 'United States', connectedVia: 'Canada App Store' }, 'appstore'), false);
  assert.equal(Scout.matches({ accountBasedIn: 'United States' }, 'account'), true);
  for (const value of ['United States App Store','USA App Store','U.S. App Store']) assert.equal(Scout.usStore(value), true);
  for (const value of ['', 'North America','United States Virgin Islands','Not United States','United States Google Play']) assert.equal(Scout.usStore(value), false);
  assert.equal(Scout.matches({ connectedVia: 'US App Store' }, 'either'), true);
});
test('About labels are read without interpreting profile biography as a location', () => {
  assert.deepEqual(Scout.parseAbout('About this account\nAccount based in\nUnited States\nConnected via\nUnited States App Store\nDate joined\nMarch 2020'), { accountBasedIn: 'United States', connectedVia: 'United States App Store', dateJoined: 'March 2020' });
  assert.equal(Scout.parseAbout('I live in United States').accountBasedIn, '');
  assert.equal(Scout.parseAbout('Account based in\nConnected via\nJapan App Store').accountBasedIn, '');
  assert.equal(Scout.parseAbout('Connected via: USA App Store').connectedVia, 'USA App Store');
});
test('CSV escapes quotes, newlines and executable spreadsheet formulas', () => {
  const result = Scout.csv([{handle:'test', note:'=HYPERLINK("bad")', accountBasedIn:'a\nb'}]);
  assert.ok(result.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(result.includes('"a\nb"'));
});
test('import validates schema, sanitizes fields and canonicalizes profile URLs', () => {
  const [record] = Scout.validateRecords({version:1,records:[{handle:'Example',status:'checked',profileUrl:'javascript:alert(1)',note:'x'.repeat(2000)}]});
  assert.equal(record.profileUrl,'https://x.com/example');
  assert.equal(record.note.length,1000);
  for (const input of [{}, {version:2,records:[]}, {version:1,records:[{handle:'../home',status:'checked'}]}, {version:1,records:[{handle:'user',status:'other'}]}]) assert.throws(() => Scout.validateRecords(input));
});

test('connection labels keep raw text and separate country from source',()=>{
  for(const [raw,source,country] of [
    ['United States App Store','appstore','United States'],
    ['United Kingdom Android App','android','United Kingdom'],
    ['Canada Google Play','android','Canada'],
    ['Japan Google Play Store','android','Japan'],
    ['Web','web',''],
    ['Android App','android','']
  ]) assert.deepEqual(Scout.connection(raw),{raw,source,country});
  assert.equal(Scout.connection('Unknown client').source,'unknown');
});
test('multiple countries require exact country labels AND selected sources',()=>{
  const filters={rule:'custom',countries:['United States','Canada'],sources:['android','web'],countryField:'either'};
  assert.equal(Scout.matches({connectedVia:'Canada Android App'},filters),true);
  assert.equal(Scout.matches({connectedVia:'Canada App Store'},filters),false);
  assert.equal(Scout.matches({connectedVia:'Web',accountBasedIn:'Canada'},filters),true);
  assert.equal(Scout.matches({connectedVia:'Web'},filters),false);
  assert.equal(Scout.matches({connectedVia:'North America Android App'},filters),false);
  assert.equal(Scout.matches({connectedVia:'United States Virgin Islands Android App'},filters),false);
  assert.equal(Scout.matches({connectedVia:'USA Android App'},filters),true);
});
test('country field selection does not substitute account country for missing Web country',()=>{
  const record={connectedVia:'Web',accountBasedIn:'United States'};
  const filters={rule:'custom',countries:['United States'],sources:['web'],countryField:'connection'};
  assert.equal(Scout.matches(record,filters),false);
  assert.equal(Scout.matches(record,{...filters,countryField:'account'}),true);
  assert.equal(Scout.matches(record,{...filters,countryField:'either'}),true);
});
test('filter validation rejects empty lists and normalizes explicit any-source setting',()=>{
  const filters={countries:[' Canada ','Canada','United Kingdom'],sources:['any','web'],countryField:'account'};
  assert.deepEqual(Scout.validateFilters(filters),{countries:['Canada','United Kingdom'],sources:['any'],countryField:'account'});
  for(const bad of [{...filters,countries:[]},{...filters,sources:[]},{...filters,countryField:'bio'},{...filters,sources:['unknown']}]) assert.throws(()=>Scout.validateFilters(bad));
});
