import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createHelipadTexture, createWindowTexture } from './prototype-assets';
import { CRANE, OBJECTIVES, PAD, objectiveOrder, withinCraneZone, withinObjective, withinPad, type ObjectiveId, type Route } from './rules';

export type Telemetry = { x: number; y: number; z: number; yaw: number; speed: number; battery: number; elapsed: number; camera: number; hover: boolean; craneActive: boolean; hold: number; target: ObjectiveId | 'pad'; warning: string };
type Props = { route: Route; onTelemetry: (data: Telemetry) => void; onObjective: (id: ObjectiveId) => void; onCrane: () => void; onEncounter: () => void; onLand: (battery: number, elapsed: number) => void };
const START = new THREE.Vector3(PAD.x, .7, PAD.z);
const MOVEMENT = ['w','a','s','d','q','e','arrowleft','arrowright','shift',' '];
const box = (scene: THREE.Scene, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, shadow = true) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material); mesh.position.set(x,y,z); mesh.castShadow = shadow; mesh.receiveShadow = shadow; scene.add(mesh); return mesh;
};
const cylinder = (scene: THREE.Scene, x: number, y: number, z: number, r: number, h: number, material: THREE.Material, sides = 12) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,sides), material); mesh.position.set(x,y,z); mesh.castShadow = true; scene.add(mesh); return mesh;
};
function ring(scene: THREE.Scene, x: number, y: number, z: number, r: number, color: number) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(r-.28,r,48), new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.9}));
  mesh.rotation.x=-Math.PI/2; mesh.position.set(x,y,z); scene.add(mesh); return mesh;
}
function makeDrone() {
  const craft = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({color:0x19313c,metalness:.55,roughness:.34});
  const light = new THREE.MeshStandardMaterial({color:0x86aab4,metalness:.4});
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15,.25,.82),dark); craft.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),new THREE.MeshBasicMaterial({color:0x71f0d3})); nose.position.set(0,-.1,-.5); craft.add(nose);
  for (const a of [-Math.PI/4,Math.PI/4]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(1.65,.08,.09),light); arm.rotation.y=a; craft.add(arm); }
  const rotors: THREE.Group[]=[];
  for (const x of [-.6,.6]) for (const z of [-.6,.6]) {
    const rotor=new THREE.Group(); rotor.position.set(x,.15,z);
    rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.08,8),dark));
    rotor.add(new THREE.Mesh(new THREE.BoxGeometry(.6,.02,.065),new THREE.MeshBasicMaterial({color:0xbcece4,transparent:true,opacity:.7})));
    craft.add(rotor); rotors.push(rotor);
  }
  for (const x of [-.33,.33]) { const skid=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.95),dark); skid.position.set(x,-.31,0); craft.add(skid); }
  return {craft,rotors};
}

export function FlightWorld({route,onTelemetry,onObjective,onCrane,onEncounter,onLand}:Props) {
  const mount=useRef<HTMLDivElement>(null);
  const callbacks=useRef({onTelemetry,onObjective,onCrane,onEncounter,onLand});
  callbacks.current={onTelemetry,onObjective,onCrane,onEncounter,onLand};
  useEffect(()=>{
    const host=mount.current; if(!host) return;
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0x8eb4bf); scene.fog=new THREE.Fog(0x8eb4bf,100,230);
    const camera=new THREE.PerspectiveCamera(62,1,.1,300);
    const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
    const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    resize(); const observer=new ResizeObserver(resize); observer.observe(host);
    scene.add(new THREE.HemisphereLight(0xdff4ff,0x485765,2.1));
    const sun=new THREE.DirectionalLight(0xffedcc,2.1);sun.position.set(-35,65,55);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;scene.add(sun);
    const groundMat=new THREE.MeshStandardMaterial({color:0x667869,roughness:1});
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(195,195),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
    const concrete=new THREE.MeshStandardMaterial({color:0x9eaaa5,roughness:1});
    const road=new THREE.Mesh(new THREE.PlaneGeometry(15,150),concrete);road.rotation.x=-Math.PI/2;road.position.set(0,.035,-1);scene.add(road);
    for(const x of [-27,27]) {const side=new THREE.Mesh(new THREE.PlaneGeometry(7,150),new THREE.MeshStandardMaterial({color:0x8c968a,roughness:1}));side.rotation.x=-Math.PI/2;side.position.set(x,.04,-1);scene.add(side);}
    const windowTexture=createWindowTexture(.1);windowTexture.repeat.set(2,2);
    const wallMat=new THREE.MeshStandardMaterial({color:0x8ca1aa,map:windowTexture,roughness:.85});
    const roofMat=new THREE.MeshStandardMaterial({color:0x536775,roughness:.9});
    const steel=new THREE.MeshStandardMaterial({color:0x657886,metalness:.35,roughness:.62});
    const amber=new THREE.MeshStandardMaterial({color:0xd8a345,metalness:.25,roughness:.7});
    const red=new THREE.MeshStandardMaterial({color:0xb34e48,roughness:.8});
    const blue=new THREE.MeshStandardMaterial({color:0x4f788b,roughness:.75});
    const solids: THREE.Box3[]=[];
    const building=(x:number,z:number,w:number,d:number,h:number)=>{
      box(scene,x,h/2,z,w,h,d,wallMat);box(scene,x,h+.22,z,w+.35,.44,d+.35,roofMat);
      solids.push(new THREE.Box3(new THREE.Vector3(x-w/2-.8,0,z-d/2-.8),new THREE.Vector3(x+w/2+.8,h+.8,z+d/2+.8)));
    };
    building(-57,36,18,30,15);building(50,29,22,27,24);building(-54,-23,17,27,20);building(56,-36,20,25,20);building(-5,-66,27,14,23);building(24,-68,17,12,16);
    // A low roof west of the pad and a raised deck to the east create altitude choices.
    building(-31,18,15,13,8);building(33,-13,15,16,12);
    for(const z of [46,36,26,16,6,-4,-14,-24,-34]) for(const x of [-39,39]) {
      box(scene,x,.75,z,.28,1.5,4,amber,false);
      box(scene,x,1.5,z,4,.16,.22,red,false);
    }
    // Site storage, scaffold, vehicle and tanks make the spaces legible without markers.
    for(const [x,z] of [[-37,47],[-31,44],[43,48],[47,44]] as const) box(scene,x,1.1,z,5,2.2,2.5,blue);
    for(const x of [-20,-13]) for(const z of [-34,-25,-16]) {box(scene,x,4,z,.24,8,.24,steel);}
    for(const y of [3,6,8]) box(scene,-16.5,y,-25,9,.15,19,steel);
    box(scene,20,1.2,32,5,2.4,10,amber);box(scene,20,2.8,29,2,1.6,2,blue);
    for(const z of [24,18,12]) cylinder(scene,51,1,z,1.4,2,steel);
    const padTexture=createHelipadTexture();
    const pad=new THREE.Mesh(new THREE.PlaneGeometry(11,11),new THREE.MeshStandardMaterial({map:padTexture}));pad.rotation.x=-Math.PI/2;pad.position.set(PAD.x,.08,PAD.z);scene.add(pad);ring(scene,PAD.x,.12,PAD.z,6.3,0xffcf63);
    // Distinctive observation spots are on a raised roof edge and beside the northern façade.
    const markers=Object.values(OBJECTIVES).map(p=>ring(scene,p.x,p.y-.4,p.z,6.1,0x6ce7cd));
    for(const p of Object.values(OBJECTIVES)) {
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,7,8),new THREE.MeshBasicMaterial({color:0x6ce7cd,transparent:true,opacity:.34}));beam.position.set(p.x,p.y+2.5,p.z);scene.add(beam);
    }
    // Crane rotates into the central road after the shift starts. The hanging load is a real collision shape.
    const mast=cylinder(scene,CRANE.x,12,CRANE.z,.7,24,amber,8);
    const jib=new THREE.Group();jib.position.set(CRANE.x,24,CRANE.z);scene.add(jib);
    const boom=new THREE.Mesh(new THREE.BoxGeometry(36,.65,.8),amber);boom.position.x=9;jib.add(boom);
    const counter=new THREE.Mesh(new THREE.BoxGeometry(6,1.4,1.4),steel);counter.position.x=-13;jib.add(counter);
    const cable=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,12,6),steel);cable.position.set(21,-6,0);jib.add(cable);
    const load=new THREE.Mesh(new THREE.BoxGeometry(5,1.6,3),red);load.position.set(21,-12,0);jib.add(load);
    const craneRing=ring(scene,CRANE.x,.15,CRANE.z,CRANE.radius,0xf7745e);craneRing.visible=false;
    for(let i=0;i<12;i++){const angle=i*Math.PI/6; const x=CRANE.x+Math.cos(angle)*CRANE.radius,z=CRANE.z+Math.sin(angle)*CRANE.radius;const cone=new THREE.Mesh(new THREE.ConeGeometry(.65,1.8,5),red);cone.position.set(x,.9,z);scene.add(cone);}
    const {craft,rotors}=makeDrone();scene.add(craft);
    const pos=START.clone(),velocity=new THREE.Vector3();let yaw=0, cameraMode=0, hover=true, battery=100, elapsed=0, craneActive=false, grounded=true, settled=0, encounters=0;
    let last=performance.now(), frame=0, report=0, warningUntil=0, warning='', orbitYaw=.65,orbitPitch=.4,dragging=false,mouseX=0,mouseY=0,activeIndex=0,objectiveHold=0,craneCalled=false;
    const order=objectiveOrder(route);const keys=new Set<string>();
    const announce=(message:string,time:number)=>{warning=message;warningUntil=time+4200;};
    const down=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase(); if(MOVEMENT.includes(k)){keys.add(k);e.preventDefault();}
      if(e.repeat)return;
      if(k==='c')cameraMode=(cameraMode+1)%3;
      if(k==='h')hover=!hover;
      if(k==='l'&&withinPad(pos.x,pos.y,pos.z)&&activeIndex===2&&velocity.length()<1.5){grounded=true;callbacks.current.onLand(battery,elapsed);}
    };
    const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    const command=(e:Event)=>{
      const value=(e as CustomEvent<string>).detail;
      if(value==='camera')cameraMode=(cameraMode+1)%3;
      else if(value==='hover')hover=!hover;
      else if(value==='land'&&withinPad(pos.x,pos.y,pos.z)&&activeIndex===2&&velocity.length()<1.5){grounded=true;callbacks.current.onLand(battery,elapsed);}
      else if(value==='launch'){grounded=false;pos.y=Math.max(pos.y,2.6);}
    };
    const button=(e:Event)=>{const {key,pressed}=(e as CustomEvent<{key:string;pressed:boolean}>).detail;if(pressed)keys.add(key);else keys.delete(key);};
    const pointerDown=(e:PointerEvent)=>{dragging=true;mouseX=e.clientX;mouseY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
    const pointerUp=()=>{dragging=false;};
    const pointerMove=(e:PointerEvent)=>{if(!dragging)return;orbitYaw+=(e.clientX-mouseX)*.006;orbitPitch=THREE.MathUtils.clamp(orbitPitch+(e.clientY-mouseY)*.004,-.15,1.1);mouseX=e.clientX;mouseY=e.clientY;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('d4b-flight-command',command);window.addEventListener('d4b-flight-button',button);
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointermove',pointerMove);
    const animate=(time:number)=>{
      frame=requestAnimationFrame(animate);const dt=Math.min(.05,Math.max(0,(time-last)/1000));last=time;elapsed+=dt;
      if(!craneActive&&(elapsed>27||pos.z<28)){craneActive=true;craneRing.visible=true;announce('Crane movement has begun. Hold and find a clear route.',time);if(!craneCalled){callbacks.current.onCrane();craneCalled=true;}}
      jib.rotation.y=craneActive?Math.sin(elapsed*.34)*.9-.2:-.95;
      load.rotation.z=craneActive?Math.sin(elapsed*1.8)*.06:0;
      craneRing.material.opacity=craneActive?.58+Math.sin(elapsed*3)*.25:0;
      if(!grounded){
        const forward=(keys.has('w')?1:0)-(keys.has('s')?1:0);
        const sideways=(keys.has('d')?1:0)-(keys.has('a')?1:0);
        const vertical=(keys.has('e')||keys.has(' ')?1:0)-(keys.has('q')?1:0);
        yaw+=((keys.has('arrowright')?1:0)-(keys.has('arrowleft')?1:0))*dt*1.25;
        const direction=new THREE.Vector3(Math.sin(yaw)*forward+Math.cos(yaw)*sideways,0,-Math.cos(yaw)*forward+Math.sin(yaw)*sideways);
        if(direction.lengthSq()>1)direction.normalize();
        const targetSpeed=keys.has('shift')?7.4:5.2;
        const smoothing=1-Math.exp(-dt*(hover?3.8:1.75));
        velocity.x=THREE.MathUtils.lerp(velocity.x,direction.x*targetSpeed,smoothing);
        velocity.z=THREE.MathUtils.lerp(velocity.z,direction.z*targetSpeed,smoothing);
        velocity.y=THREE.MathUtils.lerp(velocity.y,vertical*3.8+(hover?0:-.42),1-Math.exp(-dt*(hover?4.3:2.2)));
        const previous=pos.clone();pos.addScaledVector(velocity,dt);
        pos.x=THREE.MathUtils.clamp(pos.x,-89,89);pos.z=THREE.MathUtils.clamp(pos.z,-89,89);pos.y=THREE.MathUtils.clamp(pos.y,.7,34);
        if(pos.y<=.71&&vertical<=0)velocity.y=0;
        const inBuilding=solids.some(s=>s.containsPoint(pos));
        const inCrane=craneActive&&withinCraneZone(pos.x,pos.z)&&pos.y<28;
        const loadPoint=new THREE.Vector3();load.getWorldPosition(loadPoint);
        const nearLoad=craneActive&&pos.distanceTo(loadPoint)<4;
        if(inBuilding||inCrane||nearLoad){
          pos.copy(previous);velocity.multiplyScalar(-.18);
          if(time-warningUntil>600){encounters++;callbacks.current.onEncounter();announce(inCrane||nearLoad?'Active crane area. Hover, look around, and go around.':'Structure ahead. Gain clearance or route around.',time);}
        }
        battery=Math.max(0,battery-dt*(.19+(keys.has('shift')?.08:0)));
        if(battery<=0){velocity.multiplyScalar(.95);pos.y=Math.max(.7,pos.y-dt*.8);if(time>warningUntil)announce('Endurance depleted. Descend toward a clear area.',time);}
        if(activeIndex<2){
          const id=order[activeIndex];
          if(withinObjective(pos.x,pos.y,pos.z,id)&&velocity.length()<1.7){objectiveHold+=dt;if(objectiveHold>=3.2){activeIndex++;objectiveHold=0;markers[id==='roof'?0:1].material.opacity=.25;callbacks.current.onObjective(id);announce(activeIndex===2?'Inspections complete. Return to the launch pad.':`${OBJECTIVES[id].label} recorded. Continue to the next inspection.`,time);}}
          else objectiveHold=Math.max(0,objectiveHold-dt*1.5);
        }
      }
      craft.position.copy(pos);craft.rotation.y=yaw;craft.rotation.z=THREE.MathUtils.lerp(craft.rotation.z,-velocity.x*.035,.1);craft.rotation.x=THREE.MathUtils.lerp(craft.rotation.x,velocity.z*.027,.1);
      for(const rotor of rotors)rotor.rotation.y+=dt*19;
      if(cameraMode===0){const offset=new THREE.Vector3(Math.sin(yaw)*13,7,Math.cos(yaw)*13);camera.position.lerp(pos.clone().add(offset),.09);camera.lookAt(pos.x,pos.y,pos.z-5);craft.visible=true;}
      else if(cameraMode===1){camera.position.lerp(pos.clone().add(new THREE.Vector3(Math.sin(yaw)*.4,.15,-Math.cos(yaw)*.4)),.3);camera.lookAt(pos.x+Math.sin(yaw)*18,pos.y-.7,pos.z-Math.cos(yaw)*18);craft.visible=false;}
      else {const offset=new THREE.Vector3(Math.sin(orbitYaw)*Math.cos(orbitPitch)*21,Math.sin(orbitPitch)*21+6,Math.cos(orbitYaw)*Math.cos(orbitPitch)*21);camera.position.lerp(pos.clone().add(offset),.08);camera.lookAt(pos);craft.visible=true;}
      renderer.render(scene,camera);
      if(time-report>120){callbacks.current.onTelemetry({x:pos.x,y:pos.y,z:pos.z,yaw,speed:velocity.length(),battery,elapsed,camera:cameraMode,hover,craneActive,hold:objectiveHold/3.2,target:activeIndex<2?order[activeIndex]:'pad',warning:time<warningUntil?warning:''});report=time;}
      settled++;
    };
    frame=requestAnimationFrame(animate);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('d4b-flight-command',command);window.removeEventListener('d4b-flight-button',button);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointermove',pointerMove);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});windowTexture.dispose();padTexture.dispose();renderer.dispose();host.removeChild(renderer.domElement);};
  },[route]);
  return <div ref={mount} className="flight-world" role="img" aria-label="3D construction site flight view"/>;
}
