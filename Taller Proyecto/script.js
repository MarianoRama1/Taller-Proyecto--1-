/* =================
   Estilo Clásico - JS (final)
 
   ================= */
'use strict';

// ===== Utiles de DOM
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ===== Estado Admin en LocalStorage
const LS_ADMIN = 'adminLogged';
const isAdmin  = () => localStorage.getItem(LS_ADMIN) === 'true';
const setAdmin = (v) => v ? localStorage.setItem(LS_ADMIN, 'true') : localStorage.removeItem(LS_ADMIN);

// ===== Datos (coherentes con la web)
const BARBEROS = [
  { id: 'lucas',    nombre: 'Lucas' },
  { id: 'martin',   nombre: 'Martín' },
  { id: 'pedro',    nombre: 'Pedro' },
  { id: 'santiago', nombre: 'Santiago' },
  { id: 'tomas',    nombre: 'Tomás' },
  { id: 'gonzalo',  nombre: 'Gonzalo' },
];

const SERVICIOS = [
  { id: 'corte',        nombre: 'Corte',         duracion: 30 },
  { id: 'barba',        nombre: 'Barba',         duracion: 30 },
  { id: 'colorimetria', nombre: 'Colorimetría',  duracion: 30 },
  { id: 'lavado',       nombre: 'Lavado',        duracion: 30 },
  { id: 'vip',          nombre: 'VIP',           duracion: 30 },
  { id: 'peinado',      nombre: 'Peinado',       duracion: 30 },
];

// ===== Config horarios
const HORA_INICIO   = 9;   // 09:00
const HORA_FIN      = 19;  // exclusivo (llega hasta 18:30)
const INTERVALO_MIN = 30;

// ===== Helpers generales
function guardarLS(clave, valor){ localStorage.setItem(clave, JSON.stringify(valor)); }
function leerLS(clave, porDefecto){ try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; } catch { return porDefecto; } }
const idToNombreBarbero  = (id) => BARBEROS.find(b => b.id === id)?.nombre ?? id;
const idToNombreServicio = (id) => SERVICIOS.find(s => s.id === id)?.nombre ?? id;

function todayLocalISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function nowLocalHM(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function generarSlots(){
  const slots = [];
  for(let h=HORA_INICIO; h < HORA_FIN; h++){
    for(let m=0; m<60; m+=INTERVALO_MIN){
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    }
  }
  return slots;
}

function obtenerReservas(){ return leerLS('reservas', []); }

function horariosDisponibles(barberoId, fechaISO){
  const hoy = todayLocalISO();
  if (fechaISO < hoy) return [];

  const reservas = obtenerReservas();
  const ocupados = new Set(
    reservas.filter(r => r.barbero === barberoId && r.fecha === fechaISO).map(r => r.hora)
  );

  let posibles = generarSlots();
  if (fechaISO === hoy) {
    const ahora = nowLocalHM();
    posibles = posibles.filter(h => h >= ahora); // no permitir horas que ya pasaron hoy
  }
  return posibles.filter(h => !ocupados.has(h));
}

// ===== Elementos del formulario
const selBarbero = $('#barbero');
const selServicio = $('#servicio');
const selFecha   = $('#fecha');
const selHora    = $('#hora');
const msg        = $('#mensaje-reserva');

function poblarBarberos(){
  if (!selBarbero) return;
  selBarbero.innerHTML = '<option value="" disabled selected>Seleccionar</option>' +
    BARBEROS.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('');
}
function poblarServicios(){
  if (!selServicio) return;
  selServicio.innerHTML = '<option value="" disabled selected>Seleccionar</option>' +
    SERVICIOS.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
}

function poblarHoras(){
  if (!selHora) return;
  const b = selBarbero?.value;
  const f = selFecha?.value;
  selHora.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
  if (!b || !f) return;

  const libres = horariosDisponibles(b, f);
  if (libres.length === 0){
    selHora.innerHTML = `<option value="" disabled selected>No hay horarios disponibles</option>`;
    return;
  }
  selHora.innerHTML += libres.map(h => `<option value="${h}">${h} hs</option>`).join('');
}

selBarbero?.addEventListener('change', poblarHoras);
selFecha  ?.addEventListener('change', poblarHoras);
selServicio?.addEventListener('change', poblarHoras);

// ===== Validación y envío de reserva
function validarEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

$('#formReserva')?.addEventListener('submit', (ev) => {
  ev.preventDefault();
  if (!msg) return;

  const data = {
    barbero: selBarbero?.value,
    servicio: selServicio?.value,
    fecha: selFecha?.value,
    hora: selHora?.value,
    nombre: $('#nombre')?.value?.trim() || '',
    apellido: $('#apellido')?.value?.trim() || '',
    celular: $('#celular')?.value?.trim() || '',
    correo: $('#correo')?.value?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  if (!data.barbero || !data.servicio || !data.fecha || !data.hora || !data.nombre || !data.apellido || !data.celular || !data.correo){
    msg.textContent = 'Completá todos los campos.';
    msg.style.color = '#ffb3b3';
    return;
  }
  if (!validarEmail(data.correo)){
    msg.textContent = 'Correo inválido.';
    msg.style.color = '#ffb3b3';
    return;
  }

  const hoyISO = todayLocalISO();
  if (data.fecha < hoyISO){
    msg.textContent = 'No se puede reservar en el pasado.';
    msg.style.color = '#ffb3b3';
    return;
  }
  if (data.fecha === hoyISO && data.hora < nowLocalHM()){
    msg.textContent = 'Ese horario ya pasó. Elegí otro.';
    msg.style.color = '#ffb3b3';
    return;
  }

  const reservas = obtenerReservas();
  const duplicada = reservas.some(r => r.barbero === data.barbero && r.fecha === data.fecha && r.hora === data.hora);
  if (duplicada){
    msg.textContent = 'Ese horario ya fue reservado. Elegí otro, por favor.';
    msg.style.color = '#ffb3b3';
    poblarHoras();
    return;
  }

  reservas.push(data);
  guardarLS('reservas', reservas);

  msg.textContent = '¡Reserva confirmada!';
  msg.style.color = '#a7f3d0';

  $('#formReserva')?.reset();
  selHora.innerHTML = `<option value="" disabled selected>Seleccionar</option>`;
});

// ===== Navegación SPA
const sections = $$('.seccion');
const toggle   = $('.nav-toggle');
const navRight = $('.nav-right');

function showSection(hash){
  const target = document.querySelector(hash);
  if (!target) return;
  sections.forEach(s => s.classList.remove('activa'));
  target.classList.add('activa');
}
function guardRoute(hash){
  if (hash === '#admin' && !isAdmin()) return '#login';
  return hash;
}
function go(hash){
  const guarded = guardRoute(hash);
  showSection(guarded);
  history.pushState(null, '', guarded);
  if (guarded === '#admin') initAdmin();
  if (guarded === '#reserva') { poblarBarberos(); poblarServicios(); poblarHoras(); }
  if (navRight?.classList.contains('open')){
    navRight.classList.remove('open');
    toggle?.setAttribute('aria-expanded','false');
  }
}
function updateNavAdmin(){
  const navAdmin = $('#nav-admin');
  if (navAdmin) navAdmin.style.display = isAdmin() ? 'inline-block' : 'none';
}

// ===== Admin (listado + export CSV)
function poblarFiltroBarbero(){
  const sel = $('#filtroBarbero');
  if (!sel) return;
  sel.innerHTML = '<option value="">Todos</option>' + BARBEROS.map(b=>`<option value="${b.id}">${b.nombre}</option>`).join('');
}
function renderReservasAdmin(){
  const cuerpo = $('#tablaReservas tbody');
  if (!cuerpo) return;
  cuerpo.innerHTML = '';

  const fFecha = $('#filtroFecha')?.value || '';
  const fBarb  = $('#filtroBarbero')?.value || '';

  const filas = obtenerReservas()
    .filter(r => !fFecha || r.fecha === fFecha)
    .filter(r => !fBarb  || r.barbero === fBarb)
    .sort((a,b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));

  const btn = $('#btnExportar');
  if (btn) btn.disabled = filas.length === 0;

  if (!filas.length){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8">Sin reservas para los filtros seleccionados.</td>`;
    cuerpo.appendChild(tr);
    return;
  }

  filas.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idToNombreBarbero(r.barbero)}</td>
      <td>${idToNombreServicio(r.servicio)}</td>
      <td>${r.fecha}</td>
      <td>${r.hora}</td>
      <td>${r.nombre}</td>
      <td>${r.apellido}</td>
      <td>${r.celular}</td>
      <td>${r.correo}</td>`;
    cuerpo.appendChild(tr);
  });
}
function exportarCSV(){
  const fFecha = $('#filtroFecha')?.value || '';
  const fBarb  = $('#filtroBarbero')?.value || '';

  const encabezado = ['Barbero','Servicio','Fecha','Hora','Nombre','Apellido','Celular','Correo'];
  const filas = obtenerReservas()
    .filter(r => !fFecha || r.fecha === fFecha)
    .filter(r => !fBarb  || r.barbero === fBarb)
    .sort((a,b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`))
    .map(r => [
      idToNombreBarbero(r.barbero),
      idToNombreServicio(r.servicio),
      r.fecha,
      r.hora,
      r.nombre,
      r.apellido,
      r.celular,
      r.correo,
    ]);

  if (!filas.length){
    alert('No hay datos para exportar con los filtros actuales.');
    return;
  }

  const csv = [encabezado, ...filas]
    .map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const nombre = `reservas_${new Date().toISOString().slice(0,10)}`
    + (fBarb ? `_barbero-${fBarb}` : '')
    + (fFecha ? `_fecha-${fFecha}` : '') + '.csv';

  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nombre });
  a.click();
  URL.revokeObjectURL(a.href);
}
function initAdmin(){
  poblarFiltroBarbero();
  renderReservasAdmin();
  $('#filtroFecha')  ?.addEventListener('change', renderReservasAdmin);
  $('#filtroBarbero')?.addEventListener('change', renderReservasAdmin);
  $('#btnExportar')  ?.addEventListener('click', exportarCSV);
}

// ===== Login
const formLogin = $('#formLogin');
const loginError = $('#login-error');
formLogin?.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = $('#usuario')?.value.trim();
  const pass = $('#clave')  ?.value.trim();
  const ok = (user === 'admin' && pass === '1234');
  if (!ok){
    if (loginError) loginError.style.display = 'block';
    return;
  }
  if (loginError) loginError.style.display = 'none';
  setAdmin(true);
  updateNavAdmin();
  // Redirección directa al listado de reservas
  go('#admin'); // dispara initAdmin()
});

// ===== Arranque
window.addEventListener('DOMContentLoaded', () => {
  // Año en footer
  const y = $('#anio');
  if (y) y.textContent = new Date().getFullYear();

  // Galería (zoom simple)
  const galeriaImgs = $$('.grid-galeria img');
  if (galeriaImgs.length){
    const modal = document.createElement('div');
    modal.id = 'modalGaleria';
    Object.assign(modal.style, {display:'none',position:'fixed',inset:'0',width:'100%',height:'100%',background:'rgba(0,0,0,.8)',justifyContent:'center',alignItems:'center',zIndex:'9999'});
    const imgModal = document.createElement('img');
    Object.assign(imgModal.style, {maxWidth:'90%',maxHeight:'90%',borderRadius:'10px',boxShadow:'0 0 20px rgba(255,255,255,.3)'});
    modal.appendChild(imgModal);
    document.body.appendChild(modal);
    galeriaImgs.forEach(img => { img.style.cursor='pointer'; img.addEventListener('click',()=>{ imgModal.src=img.src; modal.style.display='flex'; }); });
    modal.addEventListener('click',()=> modal.style.display='none');
  }

  // Toggle menú mobile
  const toggle = $('.nav-toggle');
  const navRight = $('.nav-right');
  if (toggle && navRight){
    toggle.addEventListener('click', () => {
      const open = navRight.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Interceptar navegación interna
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute('href'));
  });

  updateNavAdmin();

  // Celular: solo dígitos (teclado numérico + saneo en tipeo/pegado)
const cel = $('#celular');
if (cel) {
  // Mejora de UX en mobile
  cel.setAttribute('inputmode','numeric');
  cel.setAttribute('pattern','\\d*');

  // Bloquea caracteres no numéricos en teclados que lo permiten
  cel.addEventListener('beforeinput', (e) => {
    if (e.data && /\D/.test(e.data)) e.preventDefault();
  });

  // Limpia cualquier cosa que no sea dígito (incluye pegar)
  cel.addEventListener('input', () => {
    cel.value = cel.value.replace(/\D/g,'');
  });

  // Manejo fino de pegado (respeta selección)
  cel.addEventListener('paste', (e) => {
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text') || '';
    const clean = t.replace(/\D/g,'');
    const start = cel.selectionStart, end = cel.selectionEnd;
    cel.value = cel.value.slice(0,start) + clean + cel.value.slice(end);
    cel.dispatchEvent(new Event('input')); // dispara validaciones si tenés
  });
}

  // Pre-cargar selects y bloquear pasado en fecha
  poblarBarberos();
  poblarServicios();
  if (selFecha){
    selFecha.min = todayLocalISO();
    selFecha.addEventListener('input', () => {
      if (selFecha.value && selFecha.value < selFecha.min){ selFecha.value = selFecha.min; }
      poblarHoras();
    });
  }

  // Forzar Inicio al cargar (ignora hash anterior)
  history.replaceState(null, '', '#landing');
  go('#landing');
});

window.addEventListener('popstate', () => {
  const h = location.hash && document.querySelector(location.hash) ? guardRoute(location.hash) : '#landing';
  showSection(h);
  if (h === '#admin')   initAdmin();
  if (h === '#reserva'){ poblarBarberos(); poblarServicios(); poblarHoras(); }
});
