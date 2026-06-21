/* ClipMood — Three.js animated 3D hero (graceful fallback) */
(function () {
  function init(){
    var mount=document.getElementById("hero-canvas");
    if(!mount||typeof THREE==="undefined") return;
    if(window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    var w=mount.clientWidth||innerWidth, h=mount.clientHeight||innerHeight, r;
    try{ r=new THREE.WebGLRenderer({alpha:true,antialias:true}); }catch(e){ return; }
    r.setPixelRatio(Math.min(devicePixelRatio,2)); r.setSize(w,h); mount.appendChild(r.domElement);
    var sc=new THREE.Scene(), cam=new THREE.PerspectiveCamera(60,w/h,.1,100); cam.position.z=16;
    var P=0x7c3aed,K=0xa855f7;
    sc.add(new THREE.AmbientLight(0xffffff,.6));
    var l1=new THREE.PointLight(P,2,60); l1.position.set(-10,8,12); sc.add(l1);
    var l2=new THREE.PointLight(K,1.6,60); l2.position.set(12,-8,10); sc.add(l2);
    var shapes=[];
    function add(g,x,y,z){ var m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:P,emissive:P,emissiveIntensity:.25,wireframe:true,transparent:true,opacity:.5,metalness:.6,roughness:.4})); m.position.set(x,y,z); m.userData={rx:(Math.random()-.5)*.006,ry:(Math.random()-.5)*.006,fy:y,ph:Math.random()*6.28}; sc.add(m); shapes.push(m); }
    add(new THREE.IcosahedronGeometry(3,0),-7,1,0);
    add(new THREE.TorusKnotGeometry(1.6,.5,80,12),7,-1,-2);
    add(new THREE.OctahedronGeometry(2.2,0),4,4,-4);
    add(new THREE.DodecahedronGeometry(1.8,0),-5,-4,-3);
    var n=700,pos=new Float32Array(n*3); for(var i=0;i<n*3;i++) pos[i]=(Math.random()-.5)*50;
    var pg=new THREE.BufferGeometry(); pg.setAttribute("position",new THREE.BufferAttribute(pos,3));
    var pts=new THREE.Points(pg,new THREE.PointsMaterial({color:K,size:.08,transparent:true,opacity:.7})); sc.add(pts);
    var mx=0,my=0,tx=0,ty=0; addEventListener("mousemove",function(e){ tx=e.clientX/innerWidth-.5; ty=e.clientY/innerHeight-.5; },{passive:true});
    var t=0,raf; (function loop(){ raf=requestAnimationFrame(loop); t+=.01; mx+=(tx-mx)*.05; my+=(ty-my)*.05;
      shapes.forEach(function(m){ m.rotation.x+=m.userData.rx; m.rotation.y+=m.userData.ry; m.position.y=m.userData.fy+Math.sin(t+m.userData.ph)*.5; });
      pts.rotation.y+=.0006; cam.position.x+=(mx*4-cam.position.x)*.05; cam.position.y+=(-my*4-cam.position.y)*.05; cam.lookAt(0,0,0); r.render(sc,cam); })();
    addEventListener("resize",function(){ w=mount.clientWidth||innerWidth; h=mount.clientHeight||innerHeight; cam.aspect=w/h; cam.updateProjectionMatrix(); r.setSize(w,h); });
    document.addEventListener("visibilitychange",function(){ if(document.hidden) cancelAnimationFrame(raf); else loop(); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
