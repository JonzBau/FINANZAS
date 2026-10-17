// Se envuelve en una función para que las variables no choquen con otras vistas
// cuando menu.js vuelve a cargar este script.
(() => {

    const LOTE = 10; // Registros que se muestran por cada "Cargar más"

    // Íconos (SVG) para los botones de acciones y la ventana de confirmación
    const ICO_EDITAR = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
    const ICO_PAUSA = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></svg>';
    const ICO_BASURA = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

    // Referencias a elementos del DOM (el HTML ya está insertado cuando carga este script)
    const form = document.getElementById('formCategoria');
    const lista = document.getElementById('listaCategorias');
    const vacio = document.getElementById('vacioCategorias');
    const vacioTitulo = document.getElementById('vacioTitulo');
    const vacioTexto = document.getElementById('vacioTexto');
    const btnMas = document.getElementById('btnMas');
    const restantes = document.getElementById('restantes');
    const contador = document.getElementById('contadorCategorias');
    const btnNueva = document.getElementById('btnNueva');
    const tituloFormulario = document.getElementById('tituloFormulario');
    const inputId = document.getElementById('pk_categoria');
    const inputNombre = document.getElementById('nombre_categoria');

    // Búsqueda
    const inputBuscar = document.getElementById('buscarCategoria');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');

    // Ventana de confirmación
    const modal = document.getElementById('modalConfirm');
    const mcIcono = document.getElementById('mcIcono');
    const mcTitulo = document.getElementById('mcTitulo');
    const mcTexto = document.getElementById('mcTexto');
    const mcCancelar = document.getElementById('mcCancelar');
    const mcAceptar = document.getElementById('mcAceptar');
    let resolverConfirmacion = null;

    let categorias = [];   // Todas las categorías activas
    let visibles = [];     // Las que cumplen la búsqueda actual
    let mostrados = 0;     // Cuántas ya se dibujaron
    let textoBusqueda = '';

    // Cargar la lista de categorías al iniciar
    listar();

    // ========== FORMATOS ==========
    // Minúsculas y sin acentos, para que "ocio" encuentre "Océo"
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

    // ========== NUEVA CATEGORÍA ==========
    if (btnNueva) {
        btnNueva.addEventListener('click', () => {
            inputId.value = '';
            inputNombre.value = '';
            tituloFormulario.textContent = 'Nueva categoría';
            mostrarFormulario();
            inputNombre.focus();
        });
    }

    // ========== SUBMIT DEL FORMULARIO ==========
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevenir recarga de página

            const id = inputId.value;
            const nombre_categoria = inputNombre.value.trim();
            const data = { nombre_categoria };

            // PUT si es actualización, POST si es creación
            const url = id ? `/categoria/${id}` : '/categoria';
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
                mostrarAlerta(id ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente');
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

    // ========== LISTAR CATEGORÍAS (consulta al servidor) ==========
    async function listar() {
        if (!lista) return;

        try {
            const res = await fetch('/categoria');
            if (!res.ok) throw new Error('Error al listar');
            categorias = await res.json();
        } catch (error) {
            mostrarAlerta('No se pudieron cargar las categorías.', 'error');
            return;
        }

        aplicarFiltros();
    }

    // ========== APLICAR BÚSQUEDA ==========
    function aplicarFiltros() {
        const q = normalizar(textoBusqueda.trim());

        visibles = categorias.filter(c =>
            !q || normalizar(c.nombre_categoria).includes(q));

        // Reiniciar la lista y mostrar el primer lote
        lista.innerHTML = '';
        mostrados = 0;
        renderLote();
    }

    // ========== DIBUJAR UN LOTE DE REGISTROS ==========
    function renderLote() {
        const fin = Math.min(mostrados + LOTE, visibles.length);

        for (let i = mostrados; i < fin; i++) {
            lista.appendChild(crearItem(visibles[i]));
        }
        mostrados = fin;

        // Contador y botón "Cargar más"
        const faltan = visibles.length - mostrados;
        contador.textContent = visibles.length
            ? `${visibles.length} ${visibles.length === 1 ? 'categoría' : 'categorías'}`
            : '';
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

        if (categorias.length === 0) {
            vacioTitulo.textContent = 'Aún no hay categorías.';
            vacioTexto.textContent = 'Toca "Nueva categoría" para crear la primera.';
        } else {
            vacioTitulo.textContent = 'Sin resultados';
            vacioTexto.textContent = `No hay categorías que coincidan con "${textoBusqueda.trim()}".`;
        }
    }

    // ========== TARJETA DE UNA CATEGORÍA ==========
    function crearItem(c) {
        const item = document.createElement('article');
        item.className = 'g-item';

        // Estructura fija; los datos se agregan después con textContent (evita XSS)
        item.innerHTML = `
            <div class="g-fila">
                <div class="g-avatar"></div>
                <div class="g-info">
                    <div class="g-nombre"></div>
                </div>
                <div class="g-der">
                    <button type="button" class="g-mas" aria-label="Más opciones" aria-expanded="false">&#8943;</button>
                </div>
            </div>
            <div class="g-acciones">
                <button type="button" class="g-accion g-editar">${ICO_EDITAR}<span>Editar</span></button>
                <button type="button" class="g-accion g-desactivar">${ICO_PAUSA}<span>Desactivar</span></button>
                <button type="button" class="g-accion g-eliminar">${ICO_BASURA}<span>Eliminar</span></button>
            </div>
        `;

        const inicial = (c.nombre_categoria || '?').trim().charAt(0).toUpperCase();
        item.querySelector('.g-avatar').textContent = inicial;
        item.querySelector('.g-nombre').textContent = c.nombre_categoria;

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

        item.querySelector('.g-editar').addEventListener('click', () => editar(c));
        item.querySelector('.g-desactivar').addEventListener('click', () => desactivar(c));
        item.querySelector('.g-eliminar').addEventListener('click', () => desaparecer(c));

        return item;
    }

    // ========== EDITAR CATEGORÍA ==========
    function editar(c) {
        tituloFormulario.textContent = 'Editar categoría';
        mostrarFormulario();

        // Llenar los campos con los datos de la categoría
        inputId.value = c.pk_categoria;
        inputNombre.value = c.nombre_categoria;

        window.scrollTo(0, 0);
        inputNombre.focus();
    }

    // ========== DESACTIVAR CATEGORÍA (SOFT DELETE) ==========
    async function desactivar(c) {
        const ok = await confirmar({
            titulo: '¿Desactivar esta categoría?',
            texto: `"${c.nombre_categoria}" dejará de aparecer en tus categorías.`,
            textoBoton: 'Desactivar',
            tipo: 'aviso'
        });
        if (!ok) return;

        try {
            // PATCH - Cambiar status a FALSE
            const res = await fetch(`/categoria/${c.pk_categoria}/desactivar`, { method: 'PATCH' });
            if (!res.ok) {
                const result = await res.json();
                mostrarAlerta(result.error, 'error');
                return;
            }
            await listar();
            mostrarAlerta('Categoría desactivada correctamente');
        } catch (error) {
            mostrarAlerta('No se pudo desactivar. Inténtalo de nuevo.', 'error');
        }
    }

    // ========== ELIMINAR CATEGORÍA (HARD DELETE) ==========
    async function desaparecer(c) {
        const ok = await confirmar({
            titulo: '¿Eliminar esta categoría?',
            texto: `"${c.nombre_categoria}" se borrará de forma permanente. Esta acción no se puede deshacer.`,
            textoBoton: 'Eliminar',
            tipo: 'peligro'
        });
        if (!ok) return;

        try {
            // DELETE - Eliminar de la base de datos
            const res = await fetch(`/categoria/${c.pk_categoria}`, { method: 'DELETE' });

            // Si tiene gastos asociados, el servidor responde 409 con el motivo
            if (!res.ok) {
                const result = await res.json();
                mostrarAlerta(result.error, 'error');
                return;
            }
            await listar();
            mostrarAlerta('Categoría eliminada correctamente');
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
        const formulario = document.getElementById('formCategoria');
        const f = document.getElementById('contenedorFormulario');
        const t = document.getElementById('contenedorTabla');
        const n = document.getElementById('btnNueva');
        const id = document.getElementById('pk_categoria');

        if (formulario) formulario.reset(); // Limpiar formulario
        if (id) id.value = '';              // Limpiar ID oculto
        if (f) f.classList.add('d-none');
        if (t) t.classList.remove('d-none');
        if (n) n.classList.remove('d-none');
    };

})();