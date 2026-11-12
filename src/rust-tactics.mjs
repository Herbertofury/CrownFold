// Rust/Wasm owns tactical queries; JS remains a compatibility fallback.
import {WASM_BASE64} from './rust-tactics-data.mjs';
const EXPORTS=['cf_version','cf_reset_covers','cf_add_cover','cf_segment_circle','cf_first_cover','cf_position_blocked','cf_war_path','cf_waypoint_x','cf_waypoint_z','cf_objective_version','cf_objective_step','cf_objective_progress'];
export async function loadTactics(base64=WASM_BASE64,wasm=globalThis.WebAssembly){
  try{
    if(!wasm)throw new Error('WebAssembly unavailable');
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const {instance}=await wasm.instantiate(bytes,{}),api=instance.exports;
    if(EXPORTS.some(name=>typeof api[name]!=='function')||api.cf_version()!==1||api.cf_objective_version()!==1)throw new Error('Unsupported tactical ABI');
    return {api,backend:'rust-wasm',reason:null};
  }catch(error){return {api:null,backend:'javascript',reason:String(error.message||error)};}
}
export const tactics=await loadTactics();
