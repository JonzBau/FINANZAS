// Se envuelve en una función para que las variables no choquen con otras vistas
// cuando menu.js vuelve a cargar este script.
(() => {

    const LOTE = 10; // Registros que se muestran por cada "Cargar más"

    // Íconos (SVG) para los botones de acciones, el ahorro y la ventana de confirmación
    const ICO_EDITAR = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
    const ICO_PAUSA = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></svg>';
    const ICO_BASURA = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
    const ICO_META = '<svg class="g-ico" style="width:22px;height:22px" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';

    // Referencias a elementos del DOM (el HTML ya está insertado cuando carga este script)
    const form = document.getElementById('formAhorro');
    const lista = document.getElementById('listaAhorros');
    const vacio = document.getElementById('vacioAhorros');
    const vacioTitulo = document.getElementById('vacioTitulo');
    const vacioTexto = document.getElementById('vacioTexto');
    const btnMas = document.getElementById('btnMas');
    const restantes = document.getElementById('restantes');
    const contador = document.getElementById('contadorAhorros');
    const totalResumen = document.getElementById('totalAhorros');
    const btnNueva = document.getElementById('btnNueva');
    const tituloFormulario = document.getElementById('tituloFormulario');
    const inputId = document.getElementById('pk_ahorro');
    const inputNombre = document.getElementById('nombre_ahorro');
    const inputMonto = document.getElementById('monto');
    const inputAhorrado = document.getElementById('ahorrado');
    const inputDescripcion = document.getElementById('descripcion');

    // Búsqueda
    const inputBuscar = document.getElementById('buscarAhorro');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');

    // Ventana de confirmación
    const modal = document.getElementById('modalConfirm');
    const mcIcono = document.getElementById('mcIcono');
    const mcTitulo = document.getElementById('mcTitulo');
    const mcTexto = document.getElementById('mcTexto');
    const mcCancelar = document.getElementById('mcCancelar');
    const mcAceptar = document.getElementById('mcAceptar');
    let resolverConfirmacion = null;

    let ahorros = [];      // Todos los ahorros activos, del más reciente al más antiguo
    let visibles = [];     // Los que cumplen la búsqueda actual
    let mostrados = 0;     // Cuántos ya se dibujaron
    let textoBusqueda = '';

    // Cargar la lista de ahorros al iniciar
    listar();

    // ========== FORMATOS ==========
    const dinero = n => '$' + Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Minúsculas y sin acentos, para que "camara" encuentre "Cámara"
    function normalizar(texto) {
        return String(texto)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    // ========== VENTANA DE CONFIRMACIÓN ==========
    // Devuelve una promesa: true si el usuario confirma, false si cancela
    function confirmar({ titulo, texto, textoBoton, tipo }) {
        return new Promise(resolve => {
            resolverConfirmacion = resolve;

            modal.dataset.tipo = tipo; // 'aviso' (ámbar) | 'peligro' (rojo)
            mcIcono.innerHTML = tipo === 'peligro' ? ICO_BASURA : ICO_PAUSA;
            mcTitulo.textContent = titulo;
            mcTexto.textContent = texto; // textContent evita inyección de HTML
            mcAceptar.textContent = textoBoton;

            modal.classList.add('show');
            mcCancelar.focus();
        });
    }

    function cerrarConfirmacion(resultado) {
        modal.classList.remove('show');
        if (resolverConfirmacion) {
            resolverConfirmacion(resultado);
            resolverConfirmacion = null;
        }
    }

    if (modal) {
        mcCancelar.addEventListener('click', () => cerrarConfirmacion(false));
        mcAceptar.addEventListener('click', () => cerrarConfirmacion(true));
        // Tocar el fondo oscuro cancela
        modal.addEventListener('click', e => { if (e.target === modal) cerrarConfirmacion(false); });
        // Escape cancela
        modal.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarConfirmacion(false); });
    }

    // ========== NUEVO AHORRO ==========
    if (btnNueva) {
        btnNueva.addEventListener('click', () => {
            form.reset();
            inputId.value = '';
            tituloFormulario.textContent = 'Nuevo ahorro';
            mostrarFormulario();
            inputNombre.focus();
        });
    }

    // ========== SUBMIT DEL FORMULARIO ==========
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevenir recarga de página

            const id = inputId.value;
            const data = {
                nombre_ahorro: inputNombre.value,
                monto: inputMonto.value,
                ahorrado: inputAhorrado.value,
                descripcion: inputDescripcion.value
            };

            // PUT si es actualización, POST si es creación
            const url = id ? `/ahorro/${id}` : '/ahorro';
            const method = id ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                // Mostrar error del servidor sin perder lo que escribió el usuario
                if (!res.ok) {
                    const err = await res.json();
                    mostrarAlerta(err.error, 'error');
                    return;
                }

                mostrarTabla();
                await listar();
                mostrarAlerta(id ? 'Ahorro actualizado correctamente' : 'Ahorro creado correctamente');
            } catch (error) {
                mostrarAlerta('No se pudo guardar. Inténtalo de nuevo.', 'error');
            }
        });
    }

    // ========== BÚSQUEDA ==========
    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => {
            textoBusqueda = inputBuscar.value;
            btnLimpiar.classList.toggle('d-none', textoBusqueda === '');
            aplicarFiltros();
        });
    }
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            inputBuscar.value = '';
            textoBusqueda = '';
            btnLimpiar.classList.add('d-none');
            aplicarFiltros();
            inputBuscar.focus();
        });
    }

    // ========== LISTAR AHORROS (consulta al servidor) ==========
    async function listar() {
        if (!lista) return;

        try {
            const res = await fetch('/ahorro');
            if (!res.ok) throw new Error('Error al listar');
            ahorros = await res.json();
        } catch (error) {
            mostrarAlerta('No se pudieron cargar los ahorros.', 'error');
            return;
        }

        // Más recientes primero
        ahorros.sort((a, b) =>
            new Date(b.fecha_hora) - new Date(a.fecha_hora) || b.pk_ahorro - a.pk_ahorro);

        aplicarFiltros();
    }

    // ========== APLICAR BÚSQUEDA ==========
    function aplicarFiltros() {
        const q = normalizar(textoBusqueda.trim());

        visibles = ahorros.filter(a => {
            if (!q) return true;
            const texto = normalizar(
                [a.nombre_ahorro, a.descripcion, a.monto]
                    .filter(v => v !== null && v !== undefined)
                    .join(' ')
            );
            return texto.includes(q);
        });

        // Reiniciar la lista y mostrar el primer lote
        lista.innerHTML = '';
        mostrados = 0;
        renderLote();
    }

    // ========== RESUMEN: cantidad de ahorros y total ahorrado ==========
    function actualizarResumen() {
        const sumaObjetivo = visibles.reduce((acc, a) => acc + Number(a.monto), 0);
        const sumaAhorrado = visibles.reduce((acc, a) => acc + Number(a.ahorrado || 0), 0);

        contador.textContent = visibles.length
            ? `${visibles.length} ${visibles.length === 1 ? 'ahorro' : 'ahorros'}`
            : 'Mis ahorros';
        totalResumen.textContent = visibles.length
            ? `Ahorrado ${dinero(sumaAhorrado)} de ${dinero(sumaObjetivo)}`
            : '';
    }

    // ========== DIBUJAR UN LOTE DE REGISTROS ==========
    function renderLote() {
        const fin = Math.min(mostrados + LOTE, visibles.length);

        for (let i = mostrados; i < fin; i++) {
            lista.appendChild(crearItem(visibles[i]));
        }
        mostrados = fin;

        actualizarResumen();

        // Botón "Cargar más"
        const faltan = visibles.length - mostrados;
        btnMas.classList.toggle('d-none', faltan <= 0);
        restantes.textContent = faltan > 0 ? `(${faltan})` : '';

        actualizarVacio();
    }

    if (btnMas) btnMas.addEventListener('click', renderLote);

    // ========== AVISO CUANDO NO HAY REGISTROS PARA MOSTRAR ==========
    function actualizarVacio() {
        if (visibles.length > 0) {
            vacio.classList.add('d-none');
            return;
        }

        vacio.classList.remove('d-none');

        if (ahorros.length === 0) {
            vacioTitulo.textContent = 'Aún no tienes ahorros.';
            vacioTexto.textContent = 'Toca "Nuevo ahorro" para crear el primero.';
        } else {
            vacioTitulo.textContent = 'Sin resultados';
            vacioTexto.textContent = `No hay ahorros que coincidan con "${textoBusqueda.trim()}".`;
        }
    }

    // ========== PROGRESO: barra, porcentaje y lo que falta ==========
    function pintarProgreso(item, a) {
        const objetivo = Number(a.monto);
        const ahorrado = Number(a.ahorrado || 0);
        const pct = objetivo > 0 ? Math.min(100, (ahorrado / objetivo) * 100) : 0;
        const completo = objetivo > 0 && ahorrado >= objetivo;

        item.classList.toggle('completo', completo);
        item.querySelector('.g-total').textContent = dinero(ahorrado);
        item.querySelector('.a-relleno').style.width = pct + '%';
        item.querySelector('.a-barra').setAttribute('aria-valuenow', Math.floor(pct));
        item.querySelector('.a-pct').textContent = `${Math.floor(pct)}% de ${dinero(objetivo)}`;
        item.querySelector('.a-falta').textContent = completo
            ? '¡Ahorro completado!'
            : `Faltan ${dinero(Math.max(objetivo - ahorrado, 0))}`;
    }

    // ========== TARJETA DE UN AHORRO ==========
    function crearItem(a) {
        const item = document.createElement('article');
        item.className = 'g-item';

        // Estructura fija; los datos se agregan después con textContent (evita XSS)
        item.innerHTML = `
            <div class="g-fila">
                <div class="g-avatar">${ICO_META}</div>
                <div class="g-info">
                    <div class="g-nombre"></div>
                    <div class="g-meta">
                        <span class="g-cat">Ahorro</span>
                        <span class="g-hora"></span>
                    </div>
                </div>
                <div class="g-der">
                    <div class="g-total"></div>
                    <button type="button" class="g-mas" aria-label="Más opciones" aria-expanded="false">&#8943;</button>
                </div>
            </div>
            <div class="g-detalle"></div>

            <div class="a-progreso">
                <div class="a-barra" role="progressbar" aria-label="Progreso del ahorro"
                     aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                    <div class="a-relleno"></div>
                </div>
                <div class="a-texto">
                    <span class="a-pct"></span>
                    <span class="a-falta"></span>
                </div>
            </div>

            <form class="a-abono">
                <label class="a-input">
                    <span>$</span>
                    <input type="number" inputmode="decimal" step="0.01" min="0.01" max="99999999.99"
                           placeholder="Cantidad a abonar" aria-label="Cantidad a abonar">
                </label>
                <button type="submit" class="a-btn">+ Abonar</button>
            </form>

            <div class="g-acciones">
                <button type="button" class="g-accion g-editar">${ICO_EDITAR}<span>Editar</span></button>
                <button type="button" class="g-accion g-desactivar">${ICO_PAUSA}<span>Desactivar</span></button>
                <button type="button" class="g-accion g-eliminar">${ICO_BASURA}<span>Eliminar</span></button>
            </div>
        `;

        item.querySelector('.g-nombre').textContent = a.nombre_ahorro;

        // Fecha de creación en la zona horaria y el idioma del ordenador
        item.querySelector('.g-hora').textContent = 'Creado ' +
            new Date(a.fecha_hora).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

        // Descripción (si no tiene, se quita el bloque)
        const detalle = item.querySelector('.g-detalle');
        if (a.descripcion) detalle.textContent = a.descripcion;
        else detalle.remove();

        pintarProgreso(item, a);

        // ----- Abonar -----
        const formAbono = item.querySelector('.a-abono');
        const inputAbono = formAbono.querySelector('input');
        const btnAbono = formAbono.querySelector('.a-btn');

        formAbono.addEventListener('submit', async (e) => {
            e.preventDefault();

            const cantidad = Number(inputAbono.value);
            if (!inputAbono.value || isNaN(cantidad) || cantidad <= 0) {
                mostrarAlerta('Escribe una cantidad mayor a 0', 'error');
                inputAbono.focus();
                return;
            }

            const yaEstabaCompleto = item.classList.contains('completo');
            btnAbono.disabled = true; // Evita envíos dobles

            try {
                // PATCH - Sumar el abono al monto ahorrado
                const res = await fetch(`/ahorro/${a.pk_ahorro}/abonar`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cantidad: inputAbono.value })
                });
                const result = await res.json();

                if (!res.ok) {
                    mostrarAlerta(result.error, 'error');
                    return;
                }

                // Se actualiza en pantalla sin recargar toda la lista
                a.ahorrado = result.ahorrado;
                pintarProgreso(item, a);
                actualizarResumen();
                formAbono.reset();

                const completo = item.classList.contains('completo');
                mostrarAlerta(completo && !yaEstabaCompleto
                    ? `¡Felicidades! Completaste tu ahorro "${a.nombre_ahorro}"`
                    : `Abono de ${dinero(cantidad)} agregado`);
            } catch (error) {
                mostrarAlerta('No se pudo agregar el abono. Inténtalo de nuevo.', 'error');
            } finally {
                btnAbono.disabled = false;
            }
        });

        // Desplegar / ocultar las acciones (solo una tarjeta abierta a la vez)
        const btnMasOpciones = item.querySelector('.g-mas');
        btnMasOpciones.addEventListener('click', () => {
            const abrir = !item.classList.contains('abierto');
            lista.querySelectorAll('.g-item.abierto').forEach(o => {
                o.classList.remove('abierto');
                o.querySelector('.g-mas').setAttribute('aria-expanded', 'false');
            });
            if (abrir) {
                item.classList.add('abierto');
                btnMasOpciones.setAttribute('aria-expanded', 'true');
            }
        });

        item.querySelector('.g-editar').addEventListener('click', () => editar(a));
        item.querySelector('.g-desactivar').addEventListener('click', () => desactivar(a));
        item.querySelector('.g-eliminar').addEventListener('click', () => desaparecer(a));

        return item;
    }

    // ========== EDITAR AHORRO ==========
    function editar(a) {
        tituloFormulario.textContent = 'Editar ahorro';
        mostrarFormulario();

        // Llenar los campos con los datos del ahorro
        inputId.value = a.pk_ahorro;
        inputNombre.value = a.nombre_ahorro;
        inputMonto.value = a.monto;
        inputAhorrado.value = a.ahorrado ?? 0;
        inputDescripcion.value = a.descripcion || '';

        window.scrollTo(0, 0);
        inputNombre.focus();
    }

    // ========== DESACTIVAR AHORRO (SOFT DELETE) ==========
    async function desactivar(a) {
        const ok = await confirmar({
            titulo: '¿Desactivar este ahorro?',
            texto: `"${a.nombre_ahorro}" dejará de aparecer en tus ahorros.`,
            textoBoton: 'Desactivar',
            tipo: 'aviso'
        });
        if (!ok) return;

        try {
            // PATCH - Cambiar status a FALSE
            const res = await fetch(`/ahorro/${a.pk_ahorro}/desactivar`, { method: 'PATCH' });
            if (!res.ok) {
                const result = await res.json();
                mostrarAlerta(result.error, 'error');
                return;
            }
            await listar();
            mostrarAlerta('Ahorro desactivado correctamente');
        } catch (error) {
            mostrarAlerta('No se pudo desactivar. Inténtalo de nuevo.', 'error');
        }
    }

    // ========== ELIMINAR AHORRO (HARD DELETE) ==========
    async function desaparecer(a) {
        const ok = await confirmar({
            titulo: '¿Eliminar este ahorro?',
            texto: `"${a.nombre_ahorro}" se borrará de forma permanente. Esta acción no se puede deshacer.`,
            textoBoton: 'Eliminar',
            tipo: 'peligro'
        });
        if (!ok) return;

        try {
            // DELETE - Eliminar de la base de datos
            const res = await fetch(`/ahorro/${a.pk_ahorro}`, { method: 'DELETE' });

            if (!res.ok) {
                const result = await res.json();
                mostrarAlerta(result.error, 'error');
                return;
            }
            await listar();
            mostrarAlerta('Ahorro eliminado correctamente');
        } catch (error) {
            mostrarAlerta('No se pudo eliminar. Inténtalo de nuevo.', 'error');
        }
    }

    // ========== FUNCIONES GLOBALES DE UI ==========

    // Mostrar el formulario y ocultar el listado
    window.mostrarFormulario = function () {
        const f = document.getElementById('contenedorFormulario');
        const t = document.getElementById('contenedorTabla');
        const n = document.getElementById('btnNueva');

        if (f) f.classList.remove('d-none');
        if (t) t.classList.add('d-none');
        if (n) n.classList.add('d-none');
    };

    // Mostrar el listado y ocultar el formulario
    window.mostrarTabla = function () {
        const formulario = document.getElementById('formAhorro');
        const f = document.getElementById('contenedorFormulario');
        const t = document.getElementById('contenedorTabla');
        const n = document.getElementById('btnNueva');
        const id = document.getElementById('pk_ahorro');

        if (formulario) formulario.reset(); // Limpiar formulario
        if (id) id.value = '';              // Limpiar ID oculto
        if (f) f.classList.add('d-none');
        if (t) t.classList.remove('d-none');
        if (n) n.classList.remove('d-none');
    };

})();