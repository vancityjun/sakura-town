var container;
var camera, scene, renderer, control, orbit;
var mouseX = 0, mouseY = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var object;
init();
animate();
function init() {
  container = document.createElement( 'div' );
  document.body.appendChild( container );
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
  // camera.position.z = 100;
  camera.position.set(0, 20, 20);
  // camera.lookAt(0, 200, 0);
  // scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xaaddff );
  scene.fog = new THREE.Fog(0xaaddff, 70, 100);
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  // scene.add(new THREE.GridHelper(200, 20));

  dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
				dirLight.color.setHSL( 0.1, 1, 0.95 );
				dirLight.position.set( - 1, 1.75, 1 );
				dirLight.position.multiplyScalar( 30 );
				scene.add( dirLight );
				dirLight.castShadow = true;
				dirLight.shadow.mapSize.width = 2048;
				dirLight.shadow.mapSize.height = 2048;
				var d = 50;
				dirLight.shadow.camera.left = - d;
				dirLight.shadow.camera.right = d;
				dirLight.shadow.camera.top = d;
				dirLight.shadow.camera.bottom = - d;
				dirLight.shadow.camera.far = 3500;
				dirLight.shadow.bias = - 0.0001;
				// dirLightHeper = new THREE.DirectionalLightHelper( dirLight, 10 );
				// scene.add( dirLightHeper );

  var ambientLight = new THREE.AmbientLight( 0xcccccc, 0.4 );
  scene.add( ambientLight );
  // var pointLight = new THREE.PointLight( 0xffffff, 0.8 );
  // camera.add( pointLight );
  scene.add( camera );

  // manager
  function loadModel() {
    // object.traverse( function ( child ) {
    //   if ( child.isMesh ) child.material.map = texture;
    // } );
    // object.position.y = - 30;
    scene.add( object );

    // var el = document.getElementById("element-id");
    // el.addEventListener("click", addObj, false);
    // function addObj(){
    //   var geometry =
    // }
  }

  var loading = document.getElementsByClassName('loading');
  var progressBar = document.getElementsByClassName('progressBar')[0];

  // progress.appendChild(progressBar);

  // document.body.appendChild(progress);

  var manager = new THREE.LoadingManager( loadModel );
  manager.onProgress = function ( item, loaded, total ) {
    console.log( item, loaded, total );
    // progressBar.style.width = (loaded / total * 100) + '%';
  };
  // texture
  // var textureLoader = new THREE.TextureLoader( manager );
  // var texture = new textureLoader.load( 'images/shiba-face-02.png' );
  // var material = new THREE.MeshBasicMaterial({map: texture});
  // var texture = textureLoader.load( 'images/road.png' );
  /*textureLoader.load('images/road.png', function(texture){
    var material = new THREE.MeshBasicMaterial({
      map: texture
    });
  }, undefined,
  function(err){
    console.error('An error happened.');
  }
);*/
  // model
  function onProgress( xhr ) {
    if ( xhr.lengthComputable ) {
      var percentComplete = xhr.loaded / xhr.total * 100;
      console.log( 'model ' + Math.round( percentComplete, 2 ) + '% downloaded' );
      progressBar.style.width = Math.round( percentComplete, 2 ) + '%';

      if (progressBar.style.width == '100%'){
        // loading.style.display = 'none';
        $('.loading').fadeOut(600);
      }
    }
  }

  function onError( xhr ) {}

  var mtlLoader = new THREE.MTLLoader();
  // mtlLoader.setBaseUrl('models/');
  mtlLoader.load('models/sakura-park.mtl', function(materials){
    materials.preload();
    var objloader = new THREE.OBJLoader( manager );
    objloader.setMaterials(materials);
    // objloader.setPath('models/');
    objloader.load( 'models/sakura-park.obj', function ( obj ) {
      object = obj;
      // control.attach( obj );
      // scene.add( control );
    }, onProgress, onError );
  });
  var loader = new THREE.JSONLoader();

  //
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minDistance = 10;
  controls.maxDistance = 80;
  controls.maxPolarAngle = Math.PI / 2;

  document.addEventListener( 'mousemove', onDocumentMouseMove, false );
  //
  controls.update();
  controls.addEventListener('change', render);
  // coltrols transform
  /*
  control = new THREE.TransformControls( camera, renderer.domElement );
  control.addEventListener('change', render );
  control.addEventListener( 'dragging-changed', function( event ){
    controls.enabled = ! event.value;
  });
  window.addEventListener( 'resize', onWindowResize, false );
  window.addEventListener( 'keydown', function (event){
    switch (event.keyCode ) {
      case 81: // Q
      control.setSpace( control.space === "local" ? "world" : "local");
      break;

      case 17: // ctrl
      control.setTranslationSnap( 10 );
      control.setRotationSnap( THREE.Math.degToRad(15));
      break;

      case 87: // w
      control.setMode("translate");
      break;
      case 69: // e
      control.setMode("rotate");
      break;
      case 82: // r
      control.setMode("scale");
      break;

      case 187:
      case 107: // +, =, num+
      control.serSize(control.size + 0.1 );
      break;
      case 189:
      case 109: // +, =, num+
      control.serSize(control.size - 0.1, 0.1 );
      break;

      case 32: //spacebar
      control.enabled = ! control.enabled;
      break;
    }
  });
  window.addEventListener('keyup', function (event){
    switch ( event.keyCode ){
      case 17: // control
        control.setTranslationSnap(null);
        control.setRotationSnap(null);
        break;
    }
  });
  */
};

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}
function onDocumentMouseMove( event ) {
  mouseX = ( event.clientX - windowHalfX ) / 2;
  mouseY = ( event.clientY - windowHalfY ) / 2;
}
//
function animate() {
  requestAnimationFrame( animate );
  render();
}
function render() {
  // camera.position.x += ( mouseX - camera.position.x ) * .05;
  // camera.position.y += ( - mouseY - camera.position.y ) * .05;
  camera.lookAt( scene.position );
  renderer.render( scene, camera );
};
