var container;
var camera, scene, renderer, control, orbit;
var mouseX = 0, mouseY = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var object;
var raycaster, pointer;
var pickables = [];
var hovered = null;
var selected = null;
var hasPointer = false;
var HOVER_COLOR = 0x3399ff;
var SELECT_COLOR = 0xffaa00;
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
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
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

  var GLB_MODEL_URL = 'models/sakura-park.glb';
  var OBJ_MODEL_URL = 'models/sakura-park.obj';
  var MTL_MODEL_URL = 'models/sakura-park.mtl';

  var loading = document.getElementsByClassName('loading')[0];
  var progressBar = document.getElementsByClassName('progressBar')[0];
  var loadingTitle = loading ? loading.querySelector('.loading-title') : null;
  var loadingError = loading ? loading.querySelector('.loading-error') : null;

  // progress.appendChild(progressBar);

  // document.body.appendChild(progress);
  function setLoadingMessage( message ) {
    if (loadingTitle) {
      loadingTitle.textContent = message;
    }
  }

  function clearError() {
    if (!loadingError) {
      return;
    }
    loadingError.textContent = '';
    loadingError.classList.remove('is-visible');
  }

  function showError( message ) {
    setLoadingMessage( 'Failed to load' );
    if (!loadingError) {
      return;
    }
    loadingError.textContent = message;
    loadingError.classList.add('is-visible');
  }

  function hideLoading() {
    if (!loading || loading.classList.contains('is-hidden')) {
      return;
    }
    loading.classList.add('is-hidden');
    window.setTimeout(function(){
      if (loading && loading.parentNode) {
        loading.parentNode.removeChild(loading);
      }
    }, 700);
  }

  function showFileWarning() {
    if (!loading) {
      return;
    }
    var warning = document.createElement('p');
    warning.className = 'loading-warning';
    warning.textContent = 'Model loading is blocked on file://. Run a local server (python3 -m http.server) and open http://localhost:8000/index.html';
    loading.appendChild(warning);
  }

  function hideProgress() {
    if (progressBar && progressBar.parentNode) {
      progressBar.parentNode.style.display = 'none';
    }
  }

  function resetProgress() {
    if (!progressBar) {
      return;
    }
    progressBar.style.width = '0%';
    if (progressBar.parentNode && window.location.protocol !== 'file:') {
      progressBar.parentNode.style.display = 'block';
    }
  }

  if (window.location.protocol === 'file:') {
    showFileWarning();
    hideProgress();
  }
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
  function registerPickables( root ) {
    pickables.length = 0;
    hovered = null;
    selected = null;
    if (!root) {
      return;
    }
    root.traverse(function(child){
      if (child.isMesh) {
        pickables.push(child);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  function addModelToScene( root ) {
    if (!root) {
      showError( getLoadErrorMessage() );
      return;
    }
    object = root;
    scene.add( object );
    registerPickables( object );
    hideLoading();
  }

  function getLoadErrorMessage() {
    if (window.location.protocol === 'file:') {
      return 'Failed to load model on file://. Run a local server (python3 -m http.server).';
    }
    return 'Failed to load model. Check the console for details.';
  }

  function setProgress( percent ) {
    if (!progressBar) {
      return;
    }
    var clamped = Math.max( 0, Math.min( 100, percent ) );
    progressBar.style.width = Math.round( clamped ) + '%';
  }

  function onProgress( xhr ) {
    if ( xhr && xhr.lengthComputable ) {
      var percentComplete = xhr.loaded / xhr.total * 100;
      console.log( 'model ' + Math.round( percentComplete ) + '% downloaded' );
      setProgress( percentComplete );
    }
  }

  function onFinalError( error ) {
    console.error( 'Model load failed', error );
    showError( getLoadErrorMessage() );
  }

  function loadObjModel( isFallback ) {
    setLoadingMessage( isFallback ? 'Loading OBJ fallback...' : 'Loading OBJ...' );
    clearError();
    resetProgress();

    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.load( MTL_MODEL_URL, function(materials){
      materials.preload();

      var objloader = new THREE.OBJLoader();
      objloader.setMaterials(materials);
      // objloader.setPath('models/');

      objloader.load( OBJ_MODEL_URL, function ( obj ) {
        obj.castShadow = true;
        addModelToScene( obj );
        // control.attach( obj );
        // scene.add( control );
      }, onProgress, onFinalError );
    }, undefined, onFinalError );
  }

  function loadGltfModel() {
    if (!THREE.GLTFLoader) {
      loadObjModel( true );
      return;
    }
    setLoadingMessage( 'Loading GLB...' );
    clearError();
    resetProgress();

    var gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load( GLB_MODEL_URL, function ( gltf ) {
      var root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      addModelToScene( root );
    }, onProgress, function ( error ) {
      console.warn( 'GLB load failed, falling back to OBJ.', error );
      loadObjModel( true );
    });
  }

  loadGltfModel();

  //
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );
  renderer.shadowMapEnabled = true;
  renderer.shadowMapType = THREE.PCFSoftShadowMap;
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minDistance = 10;
  controls.maxDistance = 80;
  controls.maxPolarAngle = Math.PI / 2;

  renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
  renderer.domElement.addEventListener( 'click', onDocumentClick, false );
  renderer.domElement.addEventListener( 'mouseleave', onPointerLeave, false );
  //
  controls.update();
  controls.addEventListener('change', render);
  controls.addEventListener('change', updateHover);
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
  updatePointerFromEvent( event );
  updateHover();
}

function onDocumentClick( event ) {
  updatePointerFromEvent( event );
  if (!raycaster || pickables.length === 0) {
    return;
  }
  raycaster.setFromCamera( pointer, camera );
  var intersects = raycaster.intersectObjects( pickables, false );
  var nextSelected = intersects.length ? intersects[0].object : null;

  if (selected && selected !== nextSelected) {
    clearHighlight( selected );
  }
  selected = nextSelected;
  if (selected) {
    applyHighlight( selected, 'select' );
  }
  updateHover();
}

function onPointerLeave() {
  hasPointer = false;
  if (hovered && hovered !== selected) {
    clearHighlight( hovered );
  }
  hovered = null;
}

function updatePointerFromEvent( event ) {
  var rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
  pointer.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;
  hasPointer = true;
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

function updateHover() {
  if (!hasPointer || !raycaster || !pointer || pickables.length === 0) {
    return;
  }
  raycaster.setFromCamera( pointer, camera );
  var intersects = raycaster.intersectObjects( pickables, false );
  var nextHovered = intersects.length ? intersects[0].object : null;

  if (nextHovered === hovered) {
    return;
  }
  if (hovered && hovered !== selected) {
    clearHighlight( hovered );
  }
  hovered = nextHovered;
  if (hovered && hovered !== selected) {
    applyHighlight( hovered, 'hover' );
  }
}

function getMaterials( mesh ) {
  if (!mesh || !mesh.material) {
    return [];
  }
  return Array.isArray( mesh.material ) ? mesh.material : [ mesh.material ];
}

function cloneMaterial( material ) {
  if (Array.isArray( material )) {
    return material.map(function(mat){
      return mat.clone();
    });
  }
  return material.clone();
}

function ensureUniqueMaterial( mesh ) {
  if (mesh.userData._uniqueMaterial) {
    return;
  }
  if (mesh.material) {
    mesh.material = cloneMaterial( mesh.material );
    mesh.userData._uniqueMaterial = true;
  }
}

function cacheOriginalMaterial( mesh ) {
  if (mesh.userData._origMaterialState) {
    return;
  }
  ensureUniqueMaterial( mesh );
  var materials = getMaterials( mesh );
  mesh.userData._origMaterialState = materials.map(function(mat){
    return {
      emissive: mat.emissive ? mat.emissive.getHex() : null,
      color: mat.color ? mat.color.getHex() : null
    };
  });
}

function applyHighlight( mesh, mode ) {
  var colorHex = mode === 'select' ? SELECT_COLOR : HOVER_COLOR;
  cacheOriginalMaterial( mesh );
  var materials = getMaterials( mesh );
  materials.forEach(function(mat){
    if (mat.emissive) {
      mat.emissive.setHex( colorHex );
    } else if (mat.color) {
      mat.color.setHex( colorHex );
    }
  });
}

function clearHighlight( mesh ) {
  var materials = getMaterials( mesh );
  var state = mesh.userData._origMaterialState;
  if (!state) {
    return;
  }
  materials.forEach(function(mat, index){
    var saved = state[index] || {};
    if (mat.emissive && saved.emissive !== null) {
      mat.emissive.setHex( saved.emissive );
    }
    if (mat.color && saved.color !== null) {
      mat.color.setHex( saved.color );
    }
  });
}
