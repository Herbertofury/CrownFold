// Browser-local preferences are intentionally separate from either campaign save.
export const SETTINGS_KEY='crownfold-player-settings-v1';
export const DEFAULT_SETTINGS=Object.freeze({sensitivity:1,invertY:false,volume:1,soundEnabled:false,reduceEffects:false});
const numberIn=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
export function normalizeSettings(value,defaults=DEFAULT_SETTINGS){
 const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 return {
  sensitivity:numberIn(source.sensitivity,.25,3,defaults.sensitivity),
  invertY:typeof source.invertY==='boolean'?source.invertY:defaults.invertY,
  volume:numberIn(source.volume,0,1,defaults.volume),
  soundEnabled:typeof source.soundEnabled==='boolean'?source.soundEnabled:defaults.soundEnabled,
  reduceEffects:typeof source.reduceEffects==='boolean'?source.reduceEffects:defaults.reduceEffects,
 };
}
export function loadSettings(storage,defaults=DEFAULT_SETTINGS){
 try{return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY)),defaults);}catch{return normalizeSettings(null,defaults);}
}
export function saveSettings(storage,value){
 try{storage.setItem(SETTINGS_KEY,JSON.stringify(normalizeSettings(value)));return true;}catch{return false;}
}
export function aimDelta(movementX,movementY,settings){
 return {yaw:movementX*.0024*settings.sensitivity,pitch:-movementY*.0021*settings.sensitivity*(settings.invertY?-1:1)};
}
export function masterVolume(settings){return settings.soundEnabled?settings.volume:0;}
