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
var selectedPoint = null;
var hasPointer = false;
var HOVER_COLOR = 0x3399ff;
var SELECT_COLOR = 0xffaa00;
var transformMode = 'translate';
var transformStartState = null;
var undoStack = [];
var redoStack = [];
var MAX_HISTORY = 50;
var interactionEnabled = true;
var needsRender = true;
var stats;
var annotations = [];
var activeAnnotationId = null;
var annotationCounter = 0;
var pinLayer, commentList, commentEmpty, commentText, commentInput, commentClearBtn, addCommentBtn, selectionStatus;
var transformTranslateBtn, transformRotateBtn, transformUndoBtn, transformRedoBtn;
var toggleInteractionBtn;
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
    setSelectedObject( null );
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
  initStats();
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minDistance = 10;
  controls.maxDistance = 80;
  controls.maxPolarAngle = Math.PI / 2;

  renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
  renderer.domElement.addEventListener( 'click', onDocumentClick, false );
  renderer.domElement.addEventListener( 'mouseleave', onPointerLeave, false );
  //
  controls.update();
  controls.addEventListener('change', onControlsChange);
  window.addEventListener( 'resize', onWindowResize, false );
  initTransformControls();
  initAnnotationUI();
  initInteractionToggle();
};

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
  requestRender();
}
function onDocumentMouseMove( event ) {
  if (!interactionEnabled) {
    return;
  }
  mouseX = ( event.clientX - windowHalfX ) / 2;
  mouseY = ( event.clientY - windowHalfY ) / 2;
  updatePointerFromEvent( event );
  if (updateHover()) {
    requestRender();
  }
}

function onDocumentClick( event ) {
  if (!interactionEnabled) {
    return;
  }
  updatePointerFromEvent( event );
  if (!raycaster || pickables.length === 0) {
    return;
  }
  raycaster.setFromCamera( pointer, camera );
  var intersects = raycaster.intersectObjects( pickables, false );
  var nextSelected = intersects.length ? intersects[0].object : null;
  var nextPoint = intersects.length ? intersects[0].point.clone() : null;
  setSelectedObject( nextSelected, nextPoint );
  updateHover();
  requestRender();
}

function onPointerLeave() {
  hasPointer = false;
  if (hovered && hovered !== selected) {
    clearHighlight( hovered );
  }
  hovered = null;
  requestRender();
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
  if (needsRender) {
    render();
    needsRender = false;
  }
}
function render() {
  // camera.position.x += ( mouseX - camera.position.x ) * .05;
  // camera.position.y += ( - mouseY - camera.position.y ) * .05;
  camera.lookAt( scene.position );
  if (stats) {
    stats.begin();
  }
  updateAnnotationPins();
  renderer.render( scene, camera );
  if (stats) {
    stats.end();
  }
};

function requestRender() {
  needsRender = true;
}

function initStats() {
  if (typeof Stats === 'undefined') {
    return;
  }
  stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.position = 'fixed';
  stats.dom.style.left = 'auto';
  stats.dom.style.right = '12px';
  stats.dom.style.top = 'auto';
  stats.dom.style.bottom = '12px';
  stats.dom.style.zIndex = '6';
  stats.dom.style.pointerEvents = 'none';
  document.body.appendChild( stats.dom );
}

function onControlsChange() {
  updateHover();
  requestRender();
}

function initInteractionToggle() {
  toggleInteractionBtn = document.getElementById('toggle-interaction');
  if (!toggleInteractionBtn) {
    return;
  }
  toggleInteractionBtn.addEventListener('click', function(){
    setInteractionEnabled( !interactionEnabled );
  }, false);
  updateInteractionUI();
}

function setInteractionEnabled( enabled ) {
  interactionEnabled = !!enabled;
  if (!interactionEnabled) {
    if (hovered) {
      clearHighlight( hovered );
    }
    hovered = null;
    setSelectedObject( null );
  }
  updateInteractionUI();
  requestRender();
}

function updateInteractionUI() {
  if (!toggleInteractionBtn) {
    return;
  }
  toggleInteractionBtn.textContent = interactionEnabled ? 'Selection: On' : 'Selection: Off';
  toggleInteractionBtn.classList.toggle('is-active', interactionEnabled);
}

function initTransformControls() {
  if (!THREE.TransformControls) {
    return;
  }
  control = new THREE.TransformControls( camera, renderer.domElement );
  control.setMode( transformMode );
  control.addEventListener( 'change', requestRender );
  control.addEventListener( 'dragging-changed', function( event ){
    controls.enabled = ! event.value;
  });
  control.addEventListener( 'mouseDown', onTransformStart );
  control.addEventListener( 'mouseUp', onTransformEnd );
  control.visible = false;
  scene.add( control );
  initTransformUI();
  window.addEventListener( 'keydown', onTransformKeydown, false );
}

function initTransformUI() {
  transformTranslateBtn = document.getElementById('transform-translate');
  transformRotateBtn = document.getElementById('transform-rotate');
  transformUndoBtn = document.getElementById('transform-undo');
  transformRedoBtn = document.getElementById('transform-redo');

  if (transformTranslateBtn) {
    transformTranslateBtn.addEventListener('click', function(){
      setTransformMode('translate');
    }, false);
  }
  if (transformRotateBtn) {
    transformRotateBtn.addEventListener('click', function(){
      setTransformMode('rotate');
    }, false);
  }
  if (transformUndoBtn) {
    transformUndoBtn.addEventListener('click', function(){
      undoTransform();
    }, false);
  }
  if (transformRedoBtn) {
    transformRedoBtn.addEventListener('click', function(){
      redoTransform();
    }, false);
  }
  updateTransformUI();
}

function setTransformMode( mode ) {
  transformMode = mode;
  if (control) {
    control.setMode( mode );
  }
  updateTransformUI();
}

function updateTransformUI() {
  var canInteract = interactionEnabled;
  var hasSelection = canInteract && !!selected;
  if (transformTranslateBtn) {
    transformTranslateBtn.disabled = !hasSelection;
    transformTranslateBtn.classList.toggle('is-active', transformMode === 'translate');
  }
  if (transformRotateBtn) {
    transformRotateBtn.disabled = !hasSelection;
    transformRotateBtn.classList.toggle('is-active', transformMode === 'rotate');
  }
  if (transformUndoBtn) {
    transformUndoBtn.disabled = !canInteract || undoStack.length === 0;
  }
  if (transformRedoBtn) {
    transformRedoBtn.disabled = !canInteract || redoStack.length === 0;
  }
}

function updateTransformSelection() {
  if (!control) {
    updateTransformUI();
    return;
  }
  if (!interactionEnabled) {
    control.detach();
    control.visible = false;
    updateTransformUI();
    return;
  }
  if (selected) {
    control.attach( selected );
    control.visible = true;
  } else {
    control.detach();
    control.visible = false;
  }
  updateTransformUI();
  requestRender();
}

function onTransformStart() {
  if (!control || !control.object) {
    return;
  }
  transformStartState = getTransformState( control.object );
}

function onTransformEnd() {
  if (!control || !control.object || !transformStartState) {
    return;
  }
  var endState = getTransformState( control.object );
  if (!transformStateEquals( transformStartState, endState )) {
    undoStack.push({
      object: control.object,
      before: transformStartState,
      after: endState
    });
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    redoStack.length = 0;
  }
  transformStartState = null;
  updateTransformUI();
}

function undoTransform() {
  if (!interactionEnabled || undoStack.length === 0) {
    return;
  }
  var action = undoStack.pop();
  applyTransformState( action.object, action.before );
  redoStack.push( action );
  setSelectedObject( action.object );
  updateTransformUI();
  requestRender();
}

function redoTransform() {
  if (!interactionEnabled || redoStack.length === 0) {
    return;
  }
  var action = redoStack.pop();
  applyTransformState( action.object, action.after );
  undoStack.push( action );
  setSelectedObject( action.object );
  updateTransformUI();
  requestRender();
}

function onTransformKeydown( event ) {
  if (!interactionEnabled) {
    return;
  }
  if (isEditableElement( event.target )) {
    return;
  }
  var key = event.key.toLowerCase();
  var isCmdOrCtrl = event.metaKey || event.ctrlKey;
  if (isCmdOrCtrl && key === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redoTransform();
    } else {
      undoTransform();
    }
    return;
  }
  if (isCmdOrCtrl && key === 'y') {
    event.preventDefault();
    redoTransform();
    return;
  }
  if (key === 'w') {
    setTransformMode('translate');
  }
  if (key === 'e') {
    setTransformMode('rotate');
  }
}

function isEditableElement( element ) {
  if (!element) {
    return false;
  }
  var tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable;
}

function getTransformState( target ) {
  return {
    position: target.position.clone(),
    quaternion: target.quaternion.clone(),
    scale: target.scale.clone()
  };
}

function applyTransformState( target, state ) {
  target.position.copy( state.position );
  target.quaternion.copy( state.quaternion );
  target.scale.copy( state.scale );
  target.updateMatrixWorld();
}

function transformStateEquals( first, second ) {
  return first.position.equals( second.position ) &&
    first.quaternion.equals( second.quaternion ) &&
    first.scale.equals( second.scale );
}

function ensureCenteredPivot( mesh ) {
  if (!mesh || !mesh.isMesh || !mesh.geometry || mesh.userData._pivotCentered) {
    return;
  }
  var geometry = mesh.geometry;
  if (geometry && geometry.computeBoundingBox) {
    geometry.computeBoundingBox();
  }
  if (!geometry || !geometry.boundingBox) {
    mesh.userData._pivotCentered = true;
    return;
  }
  var center = new THREE.Vector3();
  geometry.boundingBox.getCenter( center );
  if (center.lengthSq() === 0) {
    mesh.userData._pivotCentered = true;
    return;
  }
  mesh.geometry = geometry.clone();
  mesh.geometry.translate( -center.x, -center.y, -center.z );
  var offset = center.clone();
  offset.multiply( mesh.scale );
  offset.applyQuaternion( mesh.quaternion );
  mesh.position.add( offset );
  mesh.updateMatrixWorld();
  mesh.userData._pivotCentered = true;
}

function setSelectedObject( target, point ) {
  if (selected && selected !== target) {
    clearHighlight( selected );
  }
  selected = target || null;
  selectedPoint = point ? point.clone() : null;
  if (selected) {
    ensureCenteredPivot( selected );
    applyHighlight( selected, 'select' );
  }
  updateSelectionUI();
  requestRender();
}

function initAnnotationUI() {
  pinLayer = document.getElementById('pin-layer');
  commentList = document.getElementById('comment-list');
  commentEmpty = document.getElementById('comment-empty');
  commentText = document.getElementById('comment-text');
  commentInput = document.getElementById('comment-input');
  commentClearBtn = document.getElementById('comment-clear');
  addCommentBtn = document.getElementById('add-comment');
  selectionStatus = document.getElementById('selection-status');

  if (addCommentBtn) {
    addCommentBtn.addEventListener('click', onAddCommentClick, false);
  }
  if (commentInput) {
    commentInput.addEventListener('input', updateAddCommentState, false);
    commentInput.addEventListener('keydown', onCommentKeydown, false);
  }
  if (commentClearBtn) {
    commentClearBtn.addEventListener('click', onCommentClearClick, false);
  }
  updateSelectionUI();
  updateCommentPanel();
}

function updateSelectionUI() {
  if (selectionStatus) {
    if (!interactionEnabled) {
      selectionStatus.textContent = 'Selection disabled';
    } else if (selected) {
      var label = selected.name;
      if (!label && selected.parent && selected.parent.name) {
        label = selected.parent.name;
      }
      selectionStatus.textContent = 'Selected: ' + (label || 'Mesh');
    } else {
      selectionStatus.textContent = 'No selection';
    }
  }
  if (commentInput) {
    commentInput.disabled = !selected;
  }
  updateAddCommentState();
  updateTransformSelection();
}

function onAddCommentClick() {
  if (!selected) {
    setCommentDetail('Select a mesh before adding a comment.');
    return;
  }
  if (!commentInput) {
    return;
  }
  var comment = commentInput.value.trim();
  if (!comment) {
    setCommentDetail('Enter a comment before adding a pin.');
    commentInput.focus();
    updateAddCommentState();
    return;
  }
  var position = selectedPoint ? selectedPoint.clone() : selected.getWorldPosition(new THREE.Vector3());
  var annotation = {
    id: annotationCounter++,
    position: position,
    comment: comment,
    pinEl: null,
    listEl: null
  };
  annotations.push( annotation );
  createPin( annotation );
  createListItem( annotation );
  selectAnnotation( annotation.id );
  updateCommentPanel();
  commentInput.value = '';
  updateAddCommentState();
}

function updateAddCommentState() {
  if (!addCommentBtn) {
    return;
  }
  var hasText = commentInput ? commentInput.value.trim().length > 0 : false;
  addCommentBtn.disabled = !selected || !hasText;
}

function onCommentKeydown( event ) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    onAddCommentClick();
  }
}

function onCommentClearClick() {
  if (commentInput) {
    commentInput.value = '';
    commentInput.focus();
  }
  updateAddCommentState();
}

function createPin( annotation ) {
  if (!pinLayer) {
    return;
  }
  var pin = document.createElement('button');
  pin.type = 'button';
  pin.className = 'pin';
  pin.setAttribute('aria-label', 'Comment pin');
  pin.addEventListener('click', function(event){
    event.stopPropagation();
    selectAnnotation( annotation.id );
  }, false);
  pinLayer.appendChild( pin );
  annotation.pinEl = pin;
}

function createListItem( annotation ) {
  if (!commentList) {
    return;
  }
  var item = document.createElement('li');
  item.className = 'comment-item';
  item.textContent = annotation.comment;
  item.addEventListener('click', function(){
    selectAnnotation( annotation.id );
  }, false);
  commentList.appendChild( item );
  annotation.listEl = item;
}

function selectAnnotation( id ) {
  var active = null;
  for (var i = 0; i < annotations.length; i++) {
    if (annotations[i].id === id) {
      active = annotations[i];
      break;
    }
  }
  activeAnnotationId = active ? active.id : null;
  if (commentText) {
    commentText.textContent = active ? active.comment : 'Select a pin to see details.';
  }
  for (var j = 0; j < annotations.length; j++) {
    var annotation = annotations[j];
    var isActive = annotation.id === activeAnnotationId;
    if (annotation.pinEl) {
      annotation.pinEl.classList.toggle('is-active', isActive);
    }
    if (annotation.listEl) {
      annotation.listEl.classList.toggle('is-active', isActive);
    }
  }
}

function setCommentDetail( message ) {
  if (commentText) {
    commentText.textContent = message;
  }
}

function updateCommentPanel() {
  if (!commentEmpty) {
    return;
  }
  if (annotations.length === 0) {
    commentEmpty.style.display = 'block';
  } else {
    commentEmpty.style.display = 'none';
  }
}

function updateAnnotationPins() {
  if (!pinLayer || annotations.length === 0 || !renderer || !camera) {
    return;
  }
  var rect = renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return;
  }
  var projected = new THREE.Vector3();
  for (var i = 0; i < annotations.length; i++) {
    var annotation = annotations[i];
    if (!annotation.pinEl) {
      continue;
    }
    projected.copy( annotation.position ).project( camera );
    var inView = projected.z >= -1 && projected.z <= 1 && Math.abs( projected.x ) <= 1 && Math.abs( projected.y ) <= 1;
    if (!inView) {
      annotation.pinEl.style.display = 'none';
      continue;
    }
    var x = ( projected.x * 0.5 + 0.5 ) * rect.width + rect.left;
    var y = ( - projected.y * 0.5 + 0.5 ) * rect.height + rect.top;
    var scale = annotation.id === activeAnnotationId ? 1.15 : 1;
    annotation.pinEl.style.display = 'block';
    annotation.pinEl.style.transform = 'translate(-50%, -50%) translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
  }
}

function updateHover() {
  if (!interactionEnabled || !hasPointer || !raycaster || !pointer || pickables.length === 0) {
    return false;
  }
  raycaster.setFromCamera( pointer, camera );
  var intersects = raycaster.intersectObjects( pickables, false );
  var nextHovered = intersects.length ? intersects[0].object : null;

  if (nextHovered === hovered) {
    return false;
  }
  if (hovered && hovered !== selected) {
    clearHighlight( hovered );
  }
  hovered = nextHovered;
  if (hovered && hovered !== selected) {
    applyHighlight( hovered, 'hover' );
  }
  return true;
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
