import test from 'node:test';
import assert from 'node:assert/strict';
import {SETTINGS_KEY,DEFAULT_SETTINGS,normalizeSettings,loadSettings,saveSettings,aimDelta,masterVolume} from '../src/settings.mjs';

function memoryStorage(initial={}){const data=new Map(Object.entries(initial));return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}

test('missing settings preserve original aim, audio-off and full-effects behavior',()=>assert.deepEqual(loadSettings(memoryStorage()),DEFAULT_SETTINGS));
for(const bad of [null,[],false,'bad',42])test(`invalid settings container ${JSON.stringify(bad)} falls back safely`,()=>assert.deepEqual(normalizeSettings(bad),DEFAULT_SETTINGS));
test('bounded numerical values clamp without permitting NaN or Infinity',()=>{
 assert.deepEqual(normalizeSettings({sensitivity:900,volume:-1}),{...DEFAULT_SETTINGS,sensitivity:3,volume:0});
 assert.equal(normalizeSettings({sensitivity:-900,volume:99}).sensitivity,.25);
 assert.equal(normalizeSettings({volume:99}).volume,1);
 for(const value of [NaN,Infinity,-Infinity,'1',null,true,{}]){assert.equal(normalizeSettings({sensitivity:value}).sensitivity,1);assert.equal(normalizeSettings({volume:value}).volume,1);}
});
test('booleans are strict and unknown fields do not enter saved preferences',()=>{
 assert.deepEqual(normalizeSettings({invertY:'false',soundEnabled:1,reduceEffects:[],extra:'discard'}),DEFAULT_SETTINGS);
 assert.deepEqual(normalizeSettings({invertY:true,soundEnabled:true,reduceEffects:true}),{...DEFAULT_SETTINGS,invertY:true,soundEnabled:true,reduceEffects:true});
});
test('system reduced motion is used only until an explicit preference is saved',()=>{
 const defaults={...DEFAULT_SETTINGS,reduceEffects:true},storage=memoryStorage();
 assert.equal(loadSettings(storage,defaults).reduceEffects,true);
 assert.equal(normalizeSettings({volume:.5},defaults).reduceEffects,true);
 saveSettings(storage,{...defaults,reduceEffects:false});assert.equal(loadSettings(storage,defaults).reduceEffects,false);
});
test('malformed and unavailable storage never prevents playing',()=>{
 assert.deepEqual(loadSettings(memoryStorage({[SETTINGS_KEY]:'{broken'})),DEFAULT_SETTINGS);
 assert.deepEqual(loadSettings(null),DEFAULT_SETTINGS);
 assert.deepEqual(loadSettings({getItem(){throw Error('blocked');}}),DEFAULT_SETTINGS);
 assert.equal(saveSettings(null,DEFAULT_SETTINGS),false);
 assert.equal(saveSettings({setItem(){throw Error('quota');}},DEFAULT_SETTINGS),false);
});
test('settings roundtrip uses a dedicated key without modifying either campaign',()=>{
 const storage=memoryStorage({'crownfold-riftfront-save-v1':'open-world','crownfold-riftfront-quick-save-v1':'quick-session'});
 const expected={sensitivity:2.5,invertY:true,volume:.37,soundEnabled:true,reduceEffects:true};
 assert.equal(saveSettings(storage,expected),true);assert.deepEqual(loadSettings(storage),expected);
 assert.equal(storage.data.get('crownfold-riftfront-save-v1'),'open-world');assert.equal(storage.data.get('crownfold-riftfront-quick-save-v1'),'quick-session');
});
test('resetting preferences does not remove campaign records',()=>{
 const storage=memoryStorage({'crownfold-riftfront-save-v1':'survival'});saveSettings(storage,{...DEFAULT_SETTINGS,volume:.4});saveSettings(storage,DEFAULT_SETTINGS);
 assert.deepEqual(loadSettings(storage),DEFAULT_SETTINGS);assert.equal(storage.data.get('crownfold-riftfront-save-v1'),'survival');
});
test('aim sensitivity scales both axes and preserves zero motion',()=>{
 assert.deepEqual(aimDelta(10,10,DEFAULT_SETTINGS),{yaw:.023999999999999997,pitch:-.020999999999999998});
 const low=aimDelta(16,-9,{...DEFAULT_SETTINGS,sensitivity:.25}),high=aimDelta(16,-9,{...DEFAULT_SETTINGS,sensitivity:3});
 assert.equal(high.yaw,low.yaw*12);assert.equal(high.pitch,low.pitch*12);assert.equal(aimDelta(0,0,DEFAULT_SETTINGS).yaw,0);
});
test('inverted aiming changes pitch direction without changing horizontal motion',()=>{
 const normal=aimDelta(-12,9,DEFAULT_SETTINGS),inverted=aimDelta(-12,9,{...DEFAULT_SETTINGS,invertY:true});
 assert.equal(normal.yaw,inverted.yaw);assert.equal(normal.pitch,-inverted.pitch);
});
test('mute wins over master volume and zero volume is silent',()=>{
 assert.equal(masterVolume(DEFAULT_SETTINGS),0);assert.equal(masterVolume({...DEFAULT_SETTINGS,soundEnabled:true,volume:.37}),.37);
 assert.equal(masterVolume({...DEFAULT_SETTINGS,soundEnabled:true,volume:0}),0);
});
test('preferences and defaults are independent snapshots',()=>{
 const a=normalizeSettings(null),b=normalizeSettings(null);a.volume=.2;assert.equal(b.volume,1);assert.equal(DEFAULT_SETTINGS.volume,1);
});
