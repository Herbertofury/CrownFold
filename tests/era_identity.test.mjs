import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,changeEpoch,serialize,restore,stepGame} from '../src/sim.mjs';
import {validEra} from '../src/temporal.mjs';
test('coerced era IDs cannot change worlds or collect repeat exploration insight',()=>{
 const s=createGame();assert.equal(changeEpoch(s,'primeval'),true);
 const before=JSON.stringify(s);
 for(const id of [['primeval'],['neon'],{},null,'constructor']){
  assert.equal(validEra(id),false);
  assert.equal(changeEpoch(s,id),false);
  assert.equal(JSON.stringify(s),before);
 }
});
test('malformed era arrays recover defaults without discarding valid frontier progress',()=>{
 const s=createGame();s.inventory.scrap=731;
 const saved=JSON.parse(serialize(s));
 saved.era=['neon'];saved.temporal.selectedEra=['neon'];saved.temporal.returnEra=['neon'];
 saved.temporal.visited=[['neon'],'primeval'];
 const loaded=restore(JSON.stringify(saved));
 assert.ok(loaded);assert.equal(loaded.inventory.scrap,731);
 assert.equal(loaded.era,'medieval');assert.equal(loaded.temporal.selectedEra,'primeval');assert.equal(loaded.temporal.returnEra,'medieval');
 assert.deepEqual(loaded.temporal.visited,['medieval','primeval']);
 assert.doesNotThrow(()=>stepGame(loaded,{},.1));assert.ok(restore(serialize(loaded)));
});
