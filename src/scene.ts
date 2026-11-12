import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {organs, type Group} from './content';
import {SwallowDemo} from './swallow';
import {swallowState} from './swallow-motion';
interface Part {id:string;name:string;group:Group;positions:number;normals:number;indices:number;vertexCount:number;indexCount:number;bounds:[number[],number[]]}
export class AnatomyScene {
  renderer:T.WebGLRenderer; scene=new T.Scene(); camera=new T.PerspectiveCamera(32,1,.005,30); controls:OrbitControls;
  meshes:T.Mesh[]=[]; body?:T.Mesh; selected:Group='stomach'; isolate=false; labels=true; bodyVisible=true; journey=false; ready=false;
  private labelsEl:HTMLElement; private frame=0; private dirty=true; private targetCamera:T.Vector3|null=null; private targetLook:T.Vector3|null=null;
  private markers:{group:Group;point:T.Vector3;el:HTMLButtonElement}[]=[];
  private ray=new T.Raycaster(); private down={x:0,y:0}; private drift=false; private lastTime=0;
  private food:T.Group; private path:T.CatmullRomCurve3|null=null; private progress=0; private motion=true;
  private bodies:Record<string, T.Box3>={}; private resizeObserver:ResizeObserver;
  private swallowDemo?:SwallowDemo; private swallowing=false; private swallowPlaying=false; private swallowProgress=0; private swallowLabels:HTMLElement[]=[]; private reportedPhase=-1; private swallowReportTime=0;
  onSwallowChange?:(progress:number,playing:boolean)=>void;
  constructor(private host:HTMLElement,private onSelect:(g:Group)=>void,private onReady:(parts:number)=>void,private onError:(s:string)=>void) {
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    this.renderer.localClippingEnabled=true;
    const canvas=this.renderer.domElement;canvas.setAttribute('aria-label','消化系统三维模型：左键拖动平移，右键拖动旋转，滚轮缩放，左键单击器官查看；触屏单指旋转，双指缩放或平移');canvas.tabIndex=0;
    this.host.append(canvas);this.labelsEl=document.createElement('div');this.labelsEl.className='model-labels';host.append(this.labelsEl);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,1.28,0);this.camera.position.set(.13,1.3,1.7);
    this.controls.mouseButtons.LEFT=T.MOUSE.PAN;this.controls.mouseButtons.RIGHT=T.MOUSE.ROTATE;this.controls.mouseButtons.MIDDLE=T.MOUSE.DOLLY;
    this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.minDistance=.13;this.controls.maxDistance=4;
    this.controls.autoRotateSpeed=.7;this.controls.addEventListener('change',()=>this.dirty=true);
    // Keep drag sensitivity consistent when the lesson frame is scaled to fit.
    window.addEventListener('resize',()=>this.syncInputScale());
    this.controls.addEventListener('start',()=>{this.targetCamera=null;this.targetLook=null;});
    this.scene.add(new T.HemisphereLight(0xffffff,0x829484,2));
    const key=new T.DirectionalLight(0xfff5df,3.3);key.position.set(-2,3,4);this.scene.add(key);
    const fill=new T.DirectionalLight(0xecf5ff,2);fill.position.set(3,2,1);this.scene.add(fill);
    const rim=new T.DirectionalLight(0xffffff,2.6);rim.position.set(0,2,-3);this.scene.add(rim);
    this.food=new T.Group();
    const glow=new T.Mesh(new T.SphereGeometry(.034,24,16),new T.MeshBasicMaterial({color:0xffb300,transparent:true,opacity:.09,depthTest:false,depthWrite:false,toneMapped:false}));
    const halo=new T.Mesh(new T.SphereGeometry(.021,24,16),new T.MeshBasicMaterial({color:0xffc928,transparent:true,opacity:.18,depthTest:false,depthWrite:false,toneMapped:false}));
    const core=new T.Mesh(new T.SphereGeometry(.011,24,16),new T.MeshBasicMaterial({color:0xffc35b,transparent:true,opacity:.9,depthTest:false,depthWrite:false,toneMapped:false}));
    const lamp=new T.PointLight(0xffbd35,.18,.12,.8);
    this.food.add(glow,halo,core,lamp);this.food.renderOrder=20;this.food.visible=false;this.scene.add(this.food);
    canvas.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY};this.drift=false;});
    canvas.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>6)this.drift=true;});
    canvas.addEventListener('pointerup',e=>{if(this.swallowing||this.drift||e.button!==0)return;const r=canvas.getBoundingClientRect();this.ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hit=this.ray.intersectObjects(this.meshes.filter(m=>m.visible));if(hit.length)this.onSelect(hit[0].object.userData.group);});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.animate(0);this.load();
  }
  private async load(){
    try{
      const base=import.meta.env.BASE_URL;
      const embedded=(globalThis as typeof globalThis & {__DIGESTIVE_ATLAS__?:{manifest:{parts:Part[]};buffer:ArrayBuffer}}).__DIGESTIVE_ATLAS__;
      const [manifestResponse,bufferResponse]=embedded
        ? [{ok:true,json:async()=>embedded.manifest},{ok:true,arrayBuffer:async()=>embedded.buffer}]
        : await Promise.all([fetch(`${base}models/digestive.json`),fetch(`${base}models/digestive.bin`)]);
      if(!manifestResponse.ok||!bufferResponse.ok)throw new Error('模型文件加载失败，请重新加载页面。');
      const manifest:{parts:Part[]}=await manifestResponse.json(),buffer=await bufferResponse.arrayBuffer();
      for(const p of manifest.parts){
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3),3));geo.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));geo.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));geo.computeBoundingSphere();
        const body=p.group==='body';const color=body?'#b3b8a4':p.name.includes('tooth')?'#ded6b9':organs[p.group as keyof typeof organs].color;const material=new T.MeshStandardMaterial({color,roughness:.57,metalness:.015,side:T.DoubleSide,transparent:body,opacity:body?.085:1,depthWrite:!body,clippingPlanes:body?[new T.Plane(new T.Vector3(0,1,0),-.79)]:[]});
        const mesh=new T.Mesh(geo,material);mesh.userData={group:p.group,id:p.id,name:p.name};this.scene.add(mesh);
        if(p.name==='Trachea'){material.clippingPlanes=[new T.Plane(new T.Vector3(0,1,0),-1.435)];}
        if(body){this.body=mesh;mesh.renderOrder=10;}else{this.meshes.push(mesh);const box=new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1]));if(!this.bodies[p.group])this.bodies[p.group]=new T.Box3();this.bodies[p.group].union(box);}
      }
      this.bodies.airway.min.y=1.435;
      this.swallowDemo=new SwallowDemo(this.scene,this.meshes);
      for(const marker of this.swallowDemo.markers){const label=document.createElement('div');label.className='swallow-label';label.textContent=marker.name;label.style.borderColor=marker.color;label.hidden=true;this.labelsEl.append(label);this.swallowLabels.push(label);}
      const labels:{group:Group;point:number[];side:string}[]=[{group:'mouth',point:[.024,1.535,.067],side:'right'},{group:'thyroid',point:[.019,1.482,.016],side:'right'},{group:'epiglottis',point:[-.008,1.508,.013],side:'left'},{group:'esophagus',point:[-.008,1.365,.015],side:'left'},{group:'liver',point:[-.083,1.21,.07],side:'left'},{group:'stomach',point:[.082,1.173,.075],side:'right'},{group:'pancreas',point:[.045,1.114,.045],side:'right'},{group:'small',point:[.04,1.035,.078],side:'right'},{group:'colon',point:[-.093,1.02,.055],side:'left'},{group:'rectum',point:[.008,.883,-.02],side:'left'}];
      for(const l of labels){const el=document.createElement('button');el.className=`organ-label ${l.side}`;el.innerHTML=`<span class="label-dot"></span><span>${organs[l.group as keyof typeof organs].name}</span>`;el.setAttribute('aria-label',`观察${organs[l.group as keyof typeof organs].name}`);el.onclick=()=>this.onSelect(l.group);this.labelsEl.append(el);this.markers.push({group:l.group,point:new T.Vector3().fromArray(l.point),el});}
      this.ready=true;this.select(this.selected);if(this.swallowing)this.setSwallow(true);this.onReady(this.meshes.length);this.dirty=true;
    }catch(e){this.onError(e instanceof Error?e.message:'三维模型加载失败。');}
  }
  private syncInputScale(){const canvas=this.renderer.domElement,visibleHeight=canvas.getBoundingClientRect().height;if(visibleHeight>0){this.controls.rotateSpeed=canvas.clientHeight/visibleHeight;this.controls.panSpeed=canvas.clientHeight/visibleHeight;}}
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.syncInputScale();this.dirty=true;}
  select(group:Group){this.selected=group;this.progress=0;
    for(const m of this.meshes){const g=m.userData.group as Group,mat=m.material as T.MeshStandardMaterial;const active=g===group||(group==='duodenum'&&['gallbladder','pancreas'].includes(g));m.visible=!this.swallowing&&(!this.isolate||active);mat.emissive.set(active?'#6f2810':'#000000');mat.emissiveIntensity=active?.14:0;const throatDim=(group==='epiglottis'||group==='airway')&&g==='thyroid';const dim=throatDim||(group==='stomach'&&g==='liver')||(['duodenum','pancreas','gallbladder'].includes(group)&&['liver','stomach','colon'].includes(g));mat.transparent=dim;mat.opacity=dim?(throatDim?.22:.16):1;mat.depthWrite=!dim;}
    if(this.body)this.body.visible=this.bodyVisible&&!this.isolate&&!this.swallowing;
    this.markers.forEach(l=>{l.el.classList.toggle('selected',l.group===group);l.el.hidden=!this.labels||this.isolate||this.swallowing;});
    if(this.isolate)this.focus();this.updatePath();this.dirty=true;
  }
  private updatePath(){
    const paths:Partial<Record<Group,number[][]>>={
      mouth:[[0,1.54,.074],[0,1.53,.046],[0,1.512,.02]],
      esophagus:[[0,1.513,.015],[-.007,1.43,-.025],[-.015,1.32,-.028],[.003,1.235,.008]],
      stomach:[[.003,1.235,.012],[.055,1.216,.038],[.073,1.175,.055],[.025,1.148,.054],[-.02,1.138,.047]],
      duodenum:[[-.02,1.138,.047],[-.05,1.122,.035],[-.05,1.084,.028],[.005,1.081,.031],[.021,1.107,.03]],
      small:[[.018,1.085,.06],[.071,1.057,.063],[.015,1.032,.073],[-.04,1.06,.067],[-.05,1.003,.063],[.03,.976,.065],[.052,.929,.042],[-.047,.967,.022]],
      colon:[[-.066,.975,.032],[-.108,1.027,.029],[-.09,1.108,.056],[0,1.106,.073],[.095,1.108,.034],[.106,.975,-.005],[.055,.92,-.04],[.008,.939,-.048]],
      rectum:[[.008,.942,-.049],[.014,.906,-.064],[.005,.871,-.058],[.004,.841,-.036]]};
    const points=paths[this.selected];this.path=points?new T.CatmullRomCurve3(points.map(p=>new T.Vector3().fromArray(p))):null;
    this.food.visible=!this.swallowing&&this.journey&&!!this.path;
  }
  setJourney(value:boolean){this.journey=value;this.updatePath();this.dirty=true;}
  setMotion(value:boolean){this.motion=value;this.dirty=true;}
  setIsolate(value:boolean){this.isolate=value;this.select(this.selected);if(!value)this.view('front');}
  setLabels(value:boolean){this.labels=value;this.markers.forEach(l=>l.el.hidden=!value||this.isolate||this.swallowing);this.swallowLabels.forEach(el=>el.hidden=!value||!this.swallowing);this.dirty=true;}
  setBody(value:boolean){this.bodyVisible=value;if(this.body)this.body.visible=value&&!this.isolate&&!this.swallowing;this.dirty=true;}
  setRotate(value:boolean){this.controls.autoRotate=value;this.dirty=true;}
  zoom(factor:number){this.targetCamera=null;this.targetLook=null;this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();this.dirty=true;}
  view(view:'front'|'side'|'back'|'overview'){
    if(this.swallowing){this.focusSwallow(view);return;}
    const target=new T.Vector3(0,view==='overview'?1.265:1.28,0),distance=this.camera.aspect<.85?2.05:1.72;
    const dir=view==='side'?new T.Vector3(1,.02,0):view==='back'?new T.Vector3(0,.02,-1):new T.Vector3(.03,.01,1);
    this.targetLook=target;this.targetCamera=target.clone().addScaledVector(dir,distance);this.dirty=true;
  }
  focus(){if(this.swallowing){this.focusSwallow();return;}let box=this.bodies[this.selected];if(!box)return;const throat=['thyroid','epiglottis','airway'].includes(this.selected);if(throat&&!this.isolate)box=box.clone().union(this.bodies.thyroid).union(this.bodies.epiglottis);const c=box.getCenter(new T.Vector3()),s=box.getSize(new T.Vector3());const d=Math.max(s.y,s.x/this.camera.aspect,s.z)*2.6+.04;this.targetLook=c;this.targetCamera=c.clone().add((throat?new T.Vector3(.8,.18,1):new T.Vector3(.13,.07,1)).normalize().multiplyScalar(d));this.dirty=true;}
  setSwallow(value:boolean){const previous=this.swallowing;this.swallowing=value;this.swallowPlaying=false;this.controls.autoRotate=false;this.swallowDemo?.setVisible(value);this.swallowLabels.forEach(el=>el.hidden=!value||!this.labels);this.select(this.selected);if(value){this.swallowProgress=0;this.swallowDemo?.update(0);this.focusSwallow();}else if(previous)this.view('front');this.onSwallowChange?.(this.swallowProgress,false);this.dirty=true;}
  seekSwallow(value:number){this.swallowProgress=Math.max(0,Math.min(1,value));this.swallowPlaying=false;this.swallowDemo?.update(this.swallowProgress);this.reportedPhase=swallowState(this.swallowProgress).phase;this.onSwallowChange?.(this.swallowProgress,false);this.dirty=true;}
  playSwallow(){if(this.swallowProgress>=.995)this.swallowProgress=0;this.swallowPlaying=!this.swallowPlaying;this.onSwallowChange?.(this.swallowProgress,this.swallowPlaying);this.dirty=true;}
  private focusSwallow(view='side'){const target=new T.Vector3(0,1.485,-.002),dir=view==='front'?new T.Vector3(.08,.22,1):view==='back'?new T.Vector3(.08,.2,-1):new T.Vector3(1,.22,.34);const distance=this.camera.aspect<1?.24:.21;this.targetLook=target;this.targetCamera=target.clone().addScaledVector(dir.normalize(),distance);this.dirty=true;}
  private animate=(time:number)=>{this.frame=requestAnimationFrame(this.animate);const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;
    if(this.targetCamera&&this.targetLook){this.camera.position.lerp(this.targetCamera,.12);this.controls.target.lerp(this.targetLook,.12);this.dirty=true;if(this.camera.position.distanceTo(this.targetCamera)<.0001){this.targetCamera=null;this.targetLook=null;}}
    if(this.journey&&this.path){if(this.motion)this.progress=(this.progress+dt*.1)%1;this.food.position.copy(this.path.getPoint(this.progress));const pulse=1+.17*Math.sin(time*.012);this.food.scale.setScalar(pulse);if(this.motion)this.dirty=true;}
    if(this.swallowing&&this.swallowPlaying){this.swallowProgress=Math.min(1,this.swallowProgress+dt/16);this.swallowDemo?.update(this.swallowProgress);if(this.swallowProgress===1)this.swallowPlaying=false;const phase=swallowState(this.swallowProgress).phase;if(time-this.swallowReportTime>100||phase!==this.reportedPhase||!this.swallowPlaying){this.reportedPhase=phase;this.swallowReportTime=time;this.onSwallowChange?.(this.swallowProgress,this.swallowPlaying);}this.dirty=true;}
    this.controls.update();if(this.controls.autoRotate)this.dirty=true;
    if(this.dirty){this.renderer.render(this.scene,this.camera);const large=document.body.classList.contains('large-type');for(const label of this.markers){const p=label.point.clone().project(this.camera);label.el.style.left=`${(p.x*.5+.5)*this.host.clientWidth}px`;label.el.style.top=`${(-p.y*.5+.5)*this.host.clientHeight}px`;label.el.style.opacity=p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1||large&&label.group!==this.selected?'0':'1';}if(this.swallowing)this.swallowDemo?.markers.forEach((marker,i)=>{const p=marker.point.clone().project(this.camera),el=this.swallowLabels[i];const x=(p.x*.5+.5)*this.host.clientWidth,y=(-p.y*.5+.5)*this.host.clientHeight;const dx=[-205,38,44,-260][i],dy=[-22,0,-12,45][i];el.style.left=`${Math.max(8,Math.min(this.host.clientWidth-el.offsetWidth-8,x+dx))}px`;el.style.top=`${Math.max(80,Math.min(this.host.clientHeight-28,y+dy))}px`;});this.dirty=false;}
  };
}
