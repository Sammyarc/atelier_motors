const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
// Keep camera travel tied to elapsed time, including on slower WebGL devices.
window.gsap?.ticker.lagSmoothing(0);
const ui = { car:'ferrari', view:'exterior', angle:'hero', color:'#b52e22', colorName:'Rosso', night:false, busy:true };
let showroom, cars, toastTimer;

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  clearTimeout(toastTimer);
  window.Velocity?.(toast,'stop',true);
  if (window.Velocity && !motionPreference.matches) window.Velocity(toast,{opacity:1},{duration:180});
  else toast.style.opacity = 1;
  toastTimer = setTimeout(() => {
    if (window.Velocity && !motionPreference.matches) window.Velocity(toast,{opacity:0},{duration:250});
    else toast.style.opacity = 0;
  },3200);
}

function animateUI(elements) {
  if (!window.Velocity || motionPreference.matches) return;
  elements.forEach((element,index) => {
    window.Velocity(element,'stop',true);
    window.Velocity(element,{opacity:[1,.25],translateY:[0,8]},{duration:420,delay:index*45,easing:'easeOutQuad'});
  });
}

function pressed(elements, predicate) {
  elements.forEach(element => {
    const selected = predicate(element);
    element.classList.toggle('selected',selected);
    element.setAttribute('aria-pressed',String(selected));
  });
}

function updateDetails() {
  const car = cars[ui.car];
  $('#car-name').replaceChildren(document.createTextNode(car.title.split(' ')[0]),document.createElement('br'),document.createTextNode(' ' + car.title.split(' ').slice(1).join(' ')));
  $('#car-description').replaceChildren(...car.description.split('\n').flatMap((line,index) => index ? [document.createElement('br'),document.createTextNode(' ' + line)] : [document.createTextNode(line)]));
  $('#car-index').textContent = car.index;
  $('#backdrop-brand').textContent = car.brand;
  $('#backdrop-name').textContent = car.display;
  $('#detail-name').textContent = car.title;
  $('#detail-description').textContent = car.story;
  $('#detail-specs').replaceChildren(...car.facts.map(([label,value]) => {
    const row = document.createElement('div'), term = document.createElement('dt'), detail = document.createElement('dd');
    term.textContent = label;detail.textContent = value;row.append(term,detail);return row;
  }));
  pressed($$('[data-car]'),button => button.dataset.car === ui.car);
}

function updateViewUI() {
  pressed($$('[data-view]'),button => button.dataset.view === ui.view);
  pressed($$('[data-angle]'),button => button.dataset.angle === ui.angle);
  $('#showroom').classList.toggle('interior',ui.view === 'interior');
  const labels = ui.view === 'interior' ? ['Driver','Dashboard','Passenger','Seats'] : ['Signature','Front','Side','Rear'];
  $$('[data-angle]').forEach((button,index) => button.textContent = labels[index]);
  $('#camera-label').textContent = ui.view === 'interior' ? 'INSIDE THE DESIGN' : 'FIND YOUR ANGLE';
  $('#gesture-hint').textContent = ui.view === 'interior' ? 'Drag to look around · Scroll to adjust your view' : 'Drag to explore · Scroll to get closer';
  $('#rotate-button').disabled = ui.busy || ui.view === 'interior' || motionPreference.matches;
  $('#rotate-button').title = motionPreference.matches ? 'Auto rotation is off for reduced motion' : '';
}

function setBusy(busy,progress) {
  ui.busy = busy;
  $('#showroom').setAttribute('aria-busy',String(busy));
  $('#scene-loading').hidden = !busy;
  $('#load-progress').style.width = `${Math.max(5,progress*100)}%`;
  $('#loading-label').textContent = progress >= 1 ? 'Finishing the details…' : 'Preparing your showroom…';
  $$('.swatch,[data-car],[data-view],[data-angle],#light-button,#reset-button,#snapshot-button,#zoom-in,#zoom-out,#detail-interior').forEach(button => button.disabled = busy);
  updateViewUI();
}

function showError(message) {
  $('#scene-loading').hidden = true;
  $('#scene-error').hidden = false;
  $('#error-message').textContent = message;
  $('#showroom').setAttribute('aria-busy','false');
  $$('.swatch,[data-car],[data-view],[data-angle],#rotate-button,#light-button,#reset-button,#snapshot-button,#zoom-in,#zoom-out,#detail-interior').forEach(button => button.disabled = true);
}

async function selectCar(id) {
  if (ui.busy || id === ui.car) return;
  try {
    const loaded = await showroom.loadCar(id);
    if (!loaded) return;
    ui.car = id;ui.view = 'exterior';ui.angle = 'hero';
    updateDetails();updateViewUI();
    animateUI([$('#car-name'),$('#car-description'),$('#backdrop-name')]);
    $('#announcement').textContent = `${cars[id].title} ready. Exterior view.`;
  } catch (error) {
    console.error('Car loading failed',error);
    notify('This car could not load. Please try again.');
  }
}

function setView(view) {
  if (!showroom || ui.busy) return;
  ui.view = view;ui.angle = 'hero';
  updateViewUI();
  showroom.resize();
  showroom.setView(view);
  $('#announcement').textContent = view === 'interior' ? 'Inside the cabin. Drag or use arrow keys to look around.' : 'Exterior view. Drag to orbit the car.';
}

function resetView() {
  if (!showroom || ui.busy) return;
  ui.angle = 'hero';
  showroom.setView(ui.view);
  updateViewUI();
  notify('Back to your starting perspective.');
}

$$('[data-dialog]').forEach(button => button.addEventListener('click',() => {
  const dialog = document.getElementById(button.dataset.dialog);
  dialog.showModal();
  animateUI([dialog]);
}));
$$('.close-dialog').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click',event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
}));
$('#collection-open').addEventListener('click',() => {
  $('#collection').scrollIntoView({behavior:motionPreference.matches ? 'instant' : 'smooth',block:'nearest'});
  $('[data-car].selected').focus({preventScroll:true});
  animateUI($$('.car-card'));
});
$('#retry-load').addEventListener('click',() => location.reload());
$$('[data-car]').forEach(button => button.addEventListener('click',() => selectCar(button.dataset.car)));
$$('[data-view]').forEach(button => button.addEventListener('click',() => setView(button.dataset.view)));
$$('[data-angle]').forEach(button => button.addEventListener('click',() => {
  if (!showroom || ui.busy) return;
  ui.angle = button.dataset.angle;
  showroom.setAngle(ui.angle);updateViewUI();
}));
$$('.swatch').forEach(button => button.addEventListener('click',() => {
  if (!showroom || ui.busy) return;
  ui.color = button.dataset.color;ui.colorName = button.dataset.name;
  showroom.setColor(ui.color);
  pressed($$('.swatch'),element => element === button);
  const finish = document.createElement('span');finish.textContent = ' · Gloss finish';
  $('#finish-name').replaceChildren(document.createTextNode(ui.colorName),finish);
  $('#announcement').textContent = `${ui.colorName} exterior finish selected.`;
  animateUI([$('#finish-name')]);
}));
$('#rotate-button').addEventListener('click',() => {if(showroom && !ui.busy) showroom.setRotate(!showroom.rotating);});
$('#light-button').addEventListener('click',() => {
  if (!showroom || ui.busy) return;
  ui.night = !ui.night;showroom.setNight(ui.night);
  $('#showroom').classList.toggle('night',ui.night);
  $('#light-button').setAttribute('aria-pressed',String(ui.night));
  $('#light-label').textContent = ui.night ? 'Night studio' : 'Daylight';
  $('#announcement').textContent = ui.night ? 'Night studio lighting.' : 'Daylight studio lighting.';
});
$('#reset-button').addEventListener('click',resetView);
$('#zoom-in').addEventListener('click',() => showroom?.zoom(1));
$('#zoom-out').addEventListener('click',() => showroom?.zoom(-1));
$('#detail-interior').addEventListener('click',() => {$('#details-dialog').close();setView('interior');});
$('#fullscreen-button').addEventListener('click',async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('#showroom').requestFullscreen) await $('#showroom').requestFullscreen();
    else notify('Fullscreen is not available in this browser.');
  } catch {notify('Fullscreen is not available in this browser.');}
});
document.addEventListener('fullscreenchange',() => {
  $('#fullscreen-button').setAttribute('aria-label',document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  showroom?.resize();
});
$('#snapshot-button').addEventListener('click',async () => {
  if (!showroom || ui.busy) return;
  try {
    const blob = await showroom.snapshot();
    if (!blob) throw new Error('Empty snapshot');
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;link.download = `atelier-${ui.car}-${ui.colorName.toLowerCase()}-${ui.view}.png`;
    document.body.append(link);link.click();link.remove();
    setTimeout(() => URL.revokeObjectURL(url),10000);
    notify('Your perspective, saved.');
  } catch {notify('Couldn’t save that image. Please try again.');}
});
motionPreference.addEventListener('change',event => {
  if (!showroom) return;
  showroom.reducedMotion = event.matches;
  if (event.matches) {
    showroom.tweens.forEach(tween => tween.progress(1));
    showroom.tweens.clear();
    showroom.setRotate(false);
    $$('.edge-panel,.scene-heading,.model-title,dialog,.car-card').forEach(element => {window.Velocity?.(element,'finish');});
  }
  updateViewUI();
});

setBusy(true,0);
try {
  const module = await import('./showroom.js');
  cars = module.CARS;
  updateDetails();
  showroom = new module.Showroom($('#scene-canvas'),{
    onLoading:setBusy,
    onRotate:value => $('#rotate-button').setAttribute('aria-pressed',String(value)),
    onInteraction:() => {ui.angle = '';updateViewUI();},
    onReset:resetView,
    onFatal:showError
  });
  await showroom.loadCar(ui.car);
  animateUI([$('.scene-heading'),$('.vehicle-info'),$('.view-controls')]);
  $('#announcement').textContent = 'Ferrari 458 Italia ready to explore.';
  // Read-only diagnostics are opt-in for local visual verification.
  if (new URLSearchParams(location.search).has('debug')) window.__atelier = { showroom, ui };
} catch (error) {
  console.error('Showroom initialization failed',error);
  showError(location.protocol === 'file:' ? 'Open Day-04 through a local web server, such as your editor’s Live Server or npm start.' : 'This experience needs WebGL 2 and the local model files. Please reload, or try a browser with hardware acceleration enabled.');
}
