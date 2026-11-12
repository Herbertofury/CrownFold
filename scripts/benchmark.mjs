// Reproducible aggregate-war CPU benchmark. It does not measure rendering or real-GPU FPS.
// Run: npm run benchmark. This is a stress harness, not an AAA certification.
import {tacticalRuntime} from '../src/battlefield.mjs';
import {performance} from 'node:perf_hooks';
import {createGame,enterOperation} from '../src/sim.mjs';
import {stepWarfront,WAR_CAMPAIGNS,BATTALIONS} from '../src/war.mjs';

const seconds=15,dt=1/30,steps=Math.round(seconds/dt),battalionsPerSide=40;
function makeScenario(index){
  const s=createGame();
  enterOperation(s,3+index); // Contract indices 3..7 are the five War Rifts.
  if(!s.war)throw Error(`Failed to create War Rift ${index}`);
  const w=s.war;
  const types=Object.keys(BATTALIONS);
  w.army=[];w.enemyArmy=[];w.enemyWaveTimer=1e8;
  for(let i=0;i<battalionsPerSide;i++){
    for(const side of ['ally','enemy']){
      const type=types[(i*(side==='ally'?3:5)+(side==='ally'?index:index+2))%types.length];
      const unit=BATTALIONS[type],isAlly=side==='ally';
      const b={id:++s.nextId,type,side,era:unit.era,
        x:(i%10-4.5)*7.2,z:(isAlly?-8:-128)+Math.floor(i/10)*7,
        tx:(i%10-4.5)*6.5,tz:isAlly?-135:10,order:'assault',stance:'balanced',
        count:unit.count,maxCount:unit.count,hp:unit.hp,range:unit.range,attackCooldown:i%7/9,
        morale:100,buffs:{ward:0,rush:0,hush:0}};
      (isAlly?w.army:w.enemyArmy).push(b);
    }
  }
  w.population=w.army.reduce((n,b)=>n+b.count,0);w.popCap=2000;
  // Benchmark batched movement, cover, attacks and mission progression without enemies respawning.
  w.enemySupplies=0;w.enemyIncome=0;w.expeditionNext=1e8;w.riftSurgeNext=1e8;
  return s;
}
const results=[];
for(let index=0;index<WAR_CAMPAIGNS.length;index++){
  const s=makeScenario(index),start=performance.now();const samples=[];
  for(let i=0;i<steps;i++){
    s.time+=dt;
    const tick=performance.now();stepWarfront(s,dt);samples.push(performance.now()-tick);
    if(s.war.victory)break;
  }
  const wallMs=performance.now()-start,sorted=samples.toSorted((a,b)=>a-b);
  results.push({campaign:WAR_CAMPAIGNS[index].id,initialAggregateBattalions:battalionsPerSide*2,
    simulatedSeconds:+(samples.length*dt).toFixed(2),steps:samples.length,
    wallMs:+wallMs.toFixed(1),avgTickMs:+(wallMs/samples.length).toFixed(3),
    p95TickMs:+sorted[Math.floor(sorted.length*.95)].toFixed(3),
    alliedFormations:s.war.army.length,enemyFormations:s.war.enemyArmy.length,
    intactCover:s.war.cover.filter(c=>c.hp>0).length});
}
console.log(JSON.stringify({name:'CrownFold aggregate simulation benchmark',
 scope:'Node.js headless logic only, excludes rendering, GPU, networking and player-input latency',
 runtime:process.version,tactics:tacticalRuntime(),stepRateHz:30,results},null,2));
