import * as T from 'three';
import {swallowState} from './swallow-motion';

// Reuses the atlas meshes. Transparent lumen and opening shapes fill gaps in
// the source anatomy and are explicitly presented as teaching illustrations.
export class SwallowDemo {
  readonly root=new T.Group();
  private larynx=new T.Group();
  private flap=new T.Group();
  private gate:T.Mesh;
  private inlet:T.Mesh;
  private bolus:T.Mesh;
  private air:T.Mesh[]=[];
  private epiglottis?:T.Mesh;
  private pivot=new T.Vector3(-.0007,1.4868,.014);
  private foodPath=new T.CatmullRomCurve3([
    new T.Vector3(-.013,1.527,.023),new T.Vector3(-.016,1.518,.004),
    new T.Vector3(-.017,1.506,-.013),new T.Vector3(-.013,1.49,-.019),
    new T.Vector3(-.005,1.472,-.011),new T.Vector3(.002,1.443,-.007)
  ]);
  readonly markers:{name:string;point:T.Vector3;color:string}[]=[
    {name:'会厌',point:new T.Vector3(.005,1.515,.014),color:'#b77a64'},
    {name:'喉入口（示意）',point:new T.Vector3(.011,1.492,.004),color:'#578fa1'},
    {name:'气管上段 · 前方',point:new T.Vector3(.011,1.451,-.005),color:'#578fa1'},
    {name:'食管 · 后方',point:new T.Vector3(-.009,1.442,-.011),color:'#b77a64'}
  ];
  constructor(scene:T.Scene,meshes:T.Mesh[]){
    scene.add(this.root);this.root.name='吞咽教学示意';this.root.visible=false;this.root.add(this.larynx);this.larynx.add(this.flap);this.flap.position.copy(this.pivot);
    const neck=['thyroid','epiglottis','airway','esophagus'];
    for(const original of meshes){
      const group=original.userData.group;if(!neck.includes(group))continue;
      const mesh=new T.Mesh(original.geometry, (original.material as T.MeshStandardMaterial).clone());
      const material=mesh.material as T.MeshStandardMaterial;material.emissive.set(0);material.emissiveIntensity=0;
      if(group==='epiglottis'){
        mesh.geometry=original.geometry.clone();mesh.geometry.translate(-this.pivot.x,-this.pivot.y,-this.pivot.z);
        mesh.position.set(0,0,0);material.color.set('#bf7d63');this.epiglottis=mesh;this.flap.add(mesh);
      }else if(group==='esophagus'){
        material.transparent=true;material.opacity=.52;material.depthWrite=false;
        material.clippingPlanes=[new T.Plane(new T.Vector3(0,1,0),-1.432),new T.Plane(new T.Vector3(0,-1,0),1.481)];
        this.root.add(mesh);
      }else{
        if(group==='thyroid'){material.transparent=true;material.opacity=.14;material.depthWrite=false;}
        if(/vocal ligament/i.test(original.userData.name)){material.color.set('#f0dfbd');}
        this.larynx.add(mesh);
      }
    }
    const lumenPath=new T.CatmullRomCurve3([new T.Vector3(-.0007,1.493,.003),new T.Vector3(-.0007,1.485,.002),new T.Vector3(-.0007,1.473,0)]);
    const lumen=new T.Mesh(new T.TubeGeometry(lumenPath,20,.0078,28,false),new T.MeshStandardMaterial({color:'#79b7ca',transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}));this.larynx.add(lumen);
    this.inlet=new T.Mesh(new T.TorusGeometry(.0087,.00065,10,48),new T.MeshBasicMaterial({color:'#4c9bb5',toneMapped:false}));this.inlet.rotation.x=Math.PI/2;this.inlet.scale.y=1.18;this.inlet.position.set(-.0007,1.493,.003);this.larynx.add(this.inlet);
    // A closing aperture below the inlet represents laryngeal/voice-fold
    // closure, separately from the rotating epiglottis above it.
    this.gate=new T.Mesh(new T.CircleGeometry(.0074,40),new T.MeshStandardMaterial({color:'#c38e83',side:T.DoubleSide,transparent:true,opacity:.72}));this.gate.rotation.x=-Math.PI/2;this.gate.position.set(-.0007,1.483,.006);this.larynx.add(this.gate);
    const connectorPath=new T.CatmullRomCurve3([new T.Vector3(-.009,1.507,-.016),new T.Vector3(-.006,1.486,-.014),new T.Vector3(-.001,1.467,-.007)]);
    const connector=new T.Mesh(new T.TubeGeometry(connectorPath,24,.007,24,false),new T.MeshStandardMaterial({color:'#ca9b84',transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}));this.root.add(connector);
    this.bolus=new T.Mesh(new T.SphereGeometry(.0039,22,18),new T.MeshBasicMaterial({color:'#e8a83c',toneMapped:false,depthTest:false}));this.bolus.scale.set(.95,1.4,1);this.bolus.renderOrder=30;this.root.add(this.bolus);
    for(let i=0;i<6;i++){const dot=new T.Mesh(new T.SphereGeometry(.0011,10,8),new T.MeshBasicMaterial({color:'#62aec5',transparent:true,opacity:.72,toneMapped:false,depthTest:false}));dot.renderOrder=20;this.air.push(dot);this.root.add(dot);}
    this.update(0);
  }
  setVisible(value:boolean){this.root.visible=value;}
  update(progress:number){
    const state=swallowState(progress);this.larynx.position.set(0,state.lift,state.forward);this.flap.rotation.x=state.angle;this.flap.position.y=this.pivot.y+.009*state.closure;
    this.gate.scale.set(1,Math.max(.02,state.closure),1);this.gate.visible=state.closure>.05;
    (this.inlet.material as T.MeshBasicMaterial).color.set(state.closure>.8?'#b48377':'#4c9bb5');
    this.bolus.position.copy(this.foodPath.getPoint(state.foodTravel));this.bolus.visible=state.foodVisible;
    this.air.forEach((dot,i)=>{dot.visible=state.airOpen;const t=(progress*9+i/6)%1;dot.position.set(-.0007,1.506-t*.066,.003-t*.01);});
    const tip=new T.Vector3(.005,1.513,.014).sub(this.pivot).applyAxisAngle(new T.Vector3(1,0,0),state.angle).add(this.flap.position).add(this.larynx.position);this.markers[0].point.copy(tip);
    this.markers[1].point.set(.011,1.493+state.lift,.003+state.forward);
  }
}
