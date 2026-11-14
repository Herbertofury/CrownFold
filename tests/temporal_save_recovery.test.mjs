import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,stepGame} from '../src/sim.mjs';
import {stampFacet} from '../src/temporal.mjs';

test('damaged optional facet entries do not discard valid frontier progress',()=>{
 const s=createGame();s.inventory.scrap=731;stampFacet(s,24,24);
 const save=JSON.parse(serialize(s));
 save.temporal.facets.unshift(null,7,'invalid',{});
 const loaded=restore(JSON.stringify(save));
 assert.ok(loaded);assert.equal(loaded.inventory.scrap,731);
 assert.equal(loaded.temporal.facets.length,1);
 assert.equal(loaded.temporal.facets[0].x,24);
 assert.doesNotThrow(()=>stepGame(loaded,{},.1));
});
test('malformed saved facet turns and skill ranks recover as finite defaults',()=>{
 const s=createGame();stampFacet(s,24,24);
 const save=JSON.parse(serialize(s));
 save.temporal.facets[0].turn='broken';
 save.temporal.skill={ancestor:'broken',engineer:'2',oracle:99};
 const loaded=restore(JSON.stringify(save));
 assert.equal(loaded.temporal.facets[0].turn,0);
 assert.deepEqual(loaded.temporal.skill,{ancestor:0,engineer:2,oracle:3});
 assert.doesNotThrow(()=>stepGame(loaded,{},.1));
 assert.ok(restore(serialize(loaded)));
});
