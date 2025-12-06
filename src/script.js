import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSG } from 'three-csg-ts';
import GUI from 'lil-gui';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import jsPDF from 'jspdf';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';



// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

//Lil-gui
const gui = new GUI();

//Texture loader
const textureLoader = new THREE.TextureLoader()
const matcapTexture1 = textureLoader.load('./textures/0005.png')
const matcapTexture2 = textureLoader.load('./textures/2.png')
const matcapTexture3 = textureLoader.load('./textures/3.png')
const matcapTexture4 = textureLoader.load('./textures/4.png')
matcapTexture1.colorSpace = THREE.SRGBColorSpace

//EventListeners Resize event
window.addEventListener('resize', () =>
{
    console.log('resize')
    //Update window
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    //Update camera
    const aspect = sizes.width / sizes.height
    const d = 200 // dezelfde als bij init
    camera.left   = -d * aspect
    camera.right  =  d * aspect
    camera.top    =  d
    camera.bottom = -d
    camera.updateProjectionMatrix()
    
    //Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})


// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();
// scene.background = new THREE.Color('grey')

//grid
const size = 1000000;
const divisions = 100000;
const gridHelper = new THREE.GridHelper( size, divisions );
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.05;
scene.add( gridHelper );

// Parameters
const params = {
  w: 3,
  h: 30,
  l: 100,
  b: 100,
  s: 25,
  e: 25,
  r: 1,
  g: 5
};

// Mesh & label
let finalMesh           = null;
let blackBoxMesh          = null;


// Rebuild
function rebuild() {
    if (finalMesh)          scene.remove(finalMesh);
    if (blackBoxMesh)          scene.remove(blackBoxMesh);

//parameters
    const { w, h, l, b, s, e, r, g } = params;
    const r1 = w + r;

    // Clamp vorm
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, s - r1);
    shape.quadraticCurveTo(0, s, r1, s);
    shape.lineTo(h - r, s);
    shape.quadraticCurveTo(h, s, h, s + r);
    shape.lineTo(h, b + s - r);
    shape.quadraticCurveTo(h, b + s, h - r, b + s);
    shape.lineTo(r1, b + s);
    shape.quadraticCurveTo(0, b + s, 0, b + s + r1);
    shape.lineTo(0, b + s + s);
    shape.lineTo(w, b + s + s);
    shape.lineTo(w, b + w + s + r);
    shape.quadraticCurveTo(w, b + w + s, w + r, b + w + s);
    shape.lineTo(h + w - r1, b + w + s);
    shape.quadraticCurveTo(h + w, b + w + s, h + w, b + w + s - r1);
    shape.lineTo(h + w, s + r1 - w);
    shape.quadraticCurveTo(h + w, s - w, h + w - r1, s - w);
    shape.lineTo(w + r, s - w);
    shape.quadraticCurveTo(w, s - w, w, s - r - w);
    shape.lineTo(w, 0);
    shape.closePath();

// clamp materiaal + mesh
    const extrude = new THREE.ExtrudeGeometry(shape, { depth: e, bevelEnabled: false });
    const material = new THREE.MeshMatcapMaterial()
    material.matcap = matcapTexture1
    

    // Holes
    const holeGeo = new THREE.CylinderGeometry(g / 2, g / 2, 128, 20);
    const hole1 = new THREE.Mesh(holeGeo);
    hole1.position.set(0, (s - w) / 2, e / 2);
    hole1.rotation.z = Math.PI / 2;
    hole1.updateMatrix(true);

    const hole2 = new THREE.Mesh(holeGeo);
    hole2.position.set(0, (s + w) / 2 + b + s, e / 2);
    hole2.rotation.z = Math.PI / 2;
    hole2.updateMatrix(true);

    const baseMesh = new THREE.Mesh(extrude, material);
    baseMesh.updateMatrix(true);

    const holes = CSG.union(hole1, hole2);
    holes.updateMatrix(true);

    const result = CSG.subtract(baseMesh, holes);
    result.geometry.deleteAttribute('normal');

    const merged = mergeVertices(result.geometry, 1e-5);
    merged.computeVertexNormals();

    finalMesh = new THREE.Mesh(merged, material);
    scene.add(finalMesh);

    // black box
   const blackbox = new RoundedBoxGeometry(h, b, l, 4, 1);
    // 4 = segments per edge, 0.1 = radius van de afronding

    const material1 = new THREE.MeshBasicMaterial();
    blackBoxMesh = new THREE.Mesh(blackbox, material1);
    blackBoxMesh.position.x = h * 0.5;
    scene.add(blackBoxMesh);

}




// GUI

//STL
const exporter = new STLExporter();
gui.add({ exportSTL: () => {
    if (!finalMesh) return;
    const stl = exporter.parse(finalMesh);
    const blob = new Blob([stl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Clamp_W${params.b}_H${params.h}_HS${params.g}_E${params.e}_WT${params.w}_F${params.s}.stl`;
    a.click();
    URL.revokeObjectURL(url);
}}, 'exportSTL').name('Export.stl');

// OBJ

const objExporter = new OBJExporter();

gui.add({
  exportOBJ: () => {
    if (!finalMesh) return;
    const obj = objExporter.parse(finalMesh);
    const blob = new Blob([obj], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Clamp_W${params.b}_H${params.h}_HS${params.g}_E${params.e}_WT${params.w}_F${params.s}.obj`;
    a.click();
    URL.revokeObjectURL(url);

  }
}, 'exportOBJ').name('Export.obj');

// PDF
gui.add({
  exportPDF: () => {
    const canvas = renderer.domElement;
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('scene.pdf');
  }
}, 'exportPDF').name('Export PDF');


//Parameters
gui.add(params, 'b', 1, 500).name('Width box').onChange(rebuild);
gui.add(params, 'h', 1, 500).name('Height box').onChange(rebuild);
gui.add(params, 'l', 1, 500).name('Length box').onChange(rebuild);
gui.add(params, 'g', 1, (params.s-10)).name('Hole size').onChange(rebuild);
gui.add(params, 'e', 1, 500).name('Extrusion size').onChange(rebuild);
gui.add(params, 'w', 1, 20).name('Wall thickness').onChange(rebuild);
gui.add(params, 's', 20, 100).name('Flange size').onChange(rebuild);

// views


rebuild();


// Camera
const aspect = sizes.width / sizes.height;
const d = 200; // halve zichtbare breedte/hoogte, pas aan naar wens

const camera = new THREE.OrthographicCamera(
  -d * aspect, // left
   d * aspect, // right
   d,          // top
  -d,          // bottom
   1,          // near
  1000         // far
);
camera.position.set(250, 100, 250);
camera.lookAt(finalMesh.position);
camera.updateProjectionMatrix();
scene.add(camera);

// views

// Renderer
const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    antialias: true,
    preserveDrawingBuffer: true 
});
renderer.setSize(sizes.width, sizes.height);

//Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;


// Render loop
function tick() {

    // Mesh center houden
    finalMesh.position.y = -(params.s*2+params.b)/2
    finalMesh.position.z = -(params.e)/2

    //Standaard update
    controls.update();
    renderer.render(scene, camera);  
    requestAnimationFrame(tick);
}
tick();

