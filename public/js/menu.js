// Al abrir la página se muestra el formulario rápido de gasto
window.addEventListener('load', () => cargarVista('inicio'));

async function cargarVista(vista) {
    const contenedor = document.getElementById('contenido');

    try {
        const res = await fetch(`/views/${vista}.html`);
        if (!res.ok) throw new Error('Vista no encontrada');
        contenedor.innerHTML = await res.text();
    } catch (error) {
        contenedor.innerHTML =
            '<div class="alert alert-warning container mt-4">No se pudo cargar la vista.</div>';
        return;
    }

    marcarActivo(vista);
    cerrarAlerta(); // Evita que una alerta de otra vista se quede visible

    // Quitar el script de la vista anterior y cargar el de la actual
    document
        .querySelectorAll('script[data-modulo]')
        .forEach(s => s.remove());

    const script = document.createElement('script');
    script.src = `/js/${vista}.js`;
    script.dataset.modulo = vista;
    document.body.appendChild(script);

    window.scrollTo(0, 0);
}

// Resalta el botón de la vista actual en el menú
function marcarActivo(vista) {
    document.querySelectorAll('#menu button').forEach(b => {
        const activo = b.dataset.vista === vista;
        b.classList.toggle('active', activo);
        if (activo) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
    });
}

// ========== ALERTA GLOBAL ==========
// tipo: 'exito' | 'error'. Aparece arriba; el éxito se cierra solo, el error espera.
let timerAlerta;

function mostrarAlerta(mensaje, tipo = 'exito') {
    let el = document.getElementById('alertaGlobal');

    // Se crea una sola vez
    if (!el) {
        el = document.createElement('div');
        el.id = 'alertaGlobal';
        el.className = 'alerta-toast';
        el.setAttribute('role', 'alert');
        el.innerHTML = `
            <span class="alerta-icono"></span>
            <span class="alerta-texto"></span>
            <button type="button" class="alerta-cerrar" aria-label="Cerrar">&times;</button>
        `;
        document.body.appendChild(el);

        el.querySelector('.alerta-cerrar').addEventListener('click', cerrarAlerta);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarAlerta(); });
    }

    const esError = tipo === 'error';
    el.classList.toggle('error', esError);
    el.querySelector('.alerta-icono').textContent = esError ? '!' : '✓';
    el.querySelector('.alerta-texto').textContent = mensaje; // textContent evita inyección de HTML

    // Reinicia la animación si ya estaba visible
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');

    clearTimeout(timerAlerta);
    timerAlerta = setTimeout(cerrarAlerta, esError ? 5000 : 3000);
}

function cerrarAlerta() {
    clearTimeout(timerAlerta);
    const el = document.getElementById('alertaGlobal');
    if (el) el.classList.remove('show');
}