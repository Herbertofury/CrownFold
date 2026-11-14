import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,stepGame} from '../src/sim.mjs';
import {claimBounty,startBounty} from '../src/rpg.mjs';
for(const field of ['coins','xp','faction','goal'])test(`damaged bounty ${field} cannot poison recovered frontier progress`,()=>{
 const s=createGame();s.rpg.coins=731;s.inventory.scrap=819;
 const saved=JSON.parse(serialize(s));saved.rpg.bounty.status='ready';
 if(field==='goal')saved.rpg.bounty.goal={type:'craft',target:'any',count:'broken'};
 else if(field==='faction')saved.rpg.bounty.faction='constructor';
 else delete saved.rpg.bounty[field];
 const loaded=restore(JSON.stringify(saved));assert.ok(loaded);
 assert.equal(loaded.rpg.bounty,null);loaded.player.x=3;loaded.player.z=14;
 assert.equal(claimBounty(loaded),false);
 assert.equal(loaded.rpg.coins,731);assert.equal(loaded.inventory.scrap,819);
 assert.equal(startBounty(loaded),true);
 assert.doesNotThrow(()=>stepGame(loaded,{},.1));assert.ok(restore(serialize(loaded)));
});
test('valid ready bounty preserves rewards and pays exactly once after recovery',()=>{
 const s=createGame();s.rpg.bounty.status='ready';const reward=s.rpg.bounty.coins;
 const loaded=restore(serialize(s));loaded.player.x=3;loaded.player.z=14;
 const before=loaded.rpg.coins;
 assert.equal(claimBounty(loaded),true);assert.equal(loaded.rpg.coins,before+reward);
 assert.equal(claimBounty(loaded),false);assert.equal(loaded.rpg.coins,before+reward);
});
