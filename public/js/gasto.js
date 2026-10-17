// Se envuelve en una función para que las variables no choquen con otras vistas
// cuando menu.js vuelve a cargar este script.
(() => {

    const LOTE = 10; // Registros que se muestran por cada "Cargar más"

    // Íconos (SVG) para los botones de acciones y la ventana de confirmación
    const ICO_EDITAR = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
    const ICO_PAUSA = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></svg>';
    const ICO_BASURA = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

    // Referencias a elementos del DOM (el HTML ya está insertado cuando carga este script)
    const form = document.getElementById('formGasto');
    const lista = document.getElementById('listaGastos');
    const vacio = document.getElementById('vacioGastos');
    const vacioTitulo = document.getElementById('vacioTitulo');
    const vacioTexto = document.getElementById('vacioTexto');
    const btnVerHoy = document.getElementById('btnVerHoy');
    const btnMas = document.getElementById('btnMas');
    const restantes = document.getElementById('restantes');
    const contador = document.getElementById('contadorGastos');
    const selectCategoria = document.getElementById('fk_categoria');
    const inputCantidad = document.getElementById('cantidad');
    const inputPrecio = document.getElementById('precio');
    const inputTotal = document.getElementById('total');

    // Búsqueda y filtros
    const inputBuscar = document.getElementById('buscarGasto');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
    const chipHoy = document.querySelector('.g-chip[data-filtro="hoy"]');
    const inputFecha = document.getElementById('filtroFecha');
    const wrapFecha = document.getElementById('wrapFecha');

    // Ventana de confirmación
    const modal = document.getElementById('modalConfirm');
    const mcIcono = document.getElementById('mcIcono');
    const mcTitulo = document.getElementById('mcTitulo');
    const mcTexto = document.getElementById('mcTexto');
    const mcCancelar = document.getElementById('mcCancelar');
    const mcAceptar = document.getElementById('mcAceptar');
    let resolverConfirmacion = null;

    let gastos = [];        // Todos los gastos activos, del más reciente al más antiguo
    let visibles = [];      // Gastos que cumplen el filtro y la búsqueda actuales
    let mostrados = 0;      // Cuántos ya se dibujaron
    let totalesDia = {};    // Total de gasto por día (sobre los gastos visibles)
    let ultimaClave = null; // Último día dibujado (para no repetir el encabezado)

    let filtro = 'hoy';     // 'hoy' | 'fecha'
    let fechaElegida = '';  // 'YYYY-MM-DD' cuando filtro === 'fecha'
    let textoBusqueda = '';

    // Cargar categorías para el select de edición y luego la lista de gastos
    cargarCategorias();
    listar();

    // El selector de día no permite fechas futuras
    if (inputFecha) inputFecha.max = claveDia(new Date());

    // ========== FORMATOS ==========
    const dinero = n => '$' + Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Clave del día 'YYYY-MM-DD' en la zona horaria del ordenador
    // (mismo formato que devuelve <input type="date">)
    function claveDia(fecha) {
        const d = new Date(fecha);
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mes}-${dia}`;
    }

    // "Hoy", "Ayer" o la fecha completa, con el idioma del ordenador
    function etiquetaDia(fecha) {
        const d = new Date(fecha);
        const hoy = new Date();
        const ayer = new Date();
        ayer.setDate(hoy.getDate() - 1);

        if (claveDia(d) === claveDia(hoy)) return 'Hoy';
        if (claveDia(d) === claveDia(ayer)) return 'Ayer';

        const texto = d.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: d.getFullYear() !== hoy.getFullYear() ? 'numeric' : undefined
        });
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    // Minúsculas y sin acentos, para que "cafe" encuentre "Café"
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
        // Escape cancela (el listener vive en el modal, así no se acumula al recargar la vista)
        modal.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarConfirmacion(false); });
    }

    // ========== TOTAL AUTOMÁTICO (cantidad × precio) en el formulario de edición ==========
    function calcularTotal() {
        if (inputCantidad.value !== '' && inputPrecio.value !== '') {
            inputTotal.value = (Number(inputCantidad.value) * Number(inputPrecio.value)).toFixed(2);
        }
    }
    if (inputCantidad) inputCantidad.addEventListener('input', calcularTotal);
    if (inputPrecio) inputPrecio.addEventListener('input', calcularTotal);

    // ========== CARGAR CATEGORÍAS EN EL SELECT ==========
    async function cargarCategorias() {
        if (!selectCategoria) return;

        try {
            const res = await fetch('/categoria');
            const categorias = await res.json();

            categorias.forEach(c => {
                const option = document.createElement('option');
                option.value = c.pk_categoria;
                option.textContent = c.nombre_categoria; // textContent evita inyección de HTML
                selectCategoria.appendChild(option);
            });
        } catch (error) {
            console.error('No se pudieron cargar las categorías:', error);
        }
    }

    // ========== SUBMIT DEL FORMULARIO (edición) ==========
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevenir recarga de página

            const id = document.getElementById('pk_gasto').value;
            const data = {
                nombre_gasto: document.getElementById('nombre_gasto').value,
                total: inputTotal.value,
                description: document.getElementById('description').value,
                cantidad: inputCantidad.value,
                precio: inputPrecio.value,
                fk_categoria: selectCategoria.value
            };

            // PUT si es actualización, POST si es creación
            const url = id ? `/gasto/${id}` : '/gasto';
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
                mostrarAlerta(id ? 'Gasto actualizado correctamente' : 'Gasto registrado correctamente');
            } catch (error) {
                mostrarAlerta('No se pudo guardar. Inténtalo de nuevo.', 'error');
            }
        });
    }

    // ========== BÚSQUEDA Y FILTRO POR DÍA ==========

    // Resalta el filtro activo
    function actualizarChips() {
        if (chipHoy) chipHoy.classList.toggle('activo', filtro === 'hoy');
        if (wrapFecha) wrapFecha.classList.toggle('activo', filtro === 'fecha');
    }

    // Vuelve al filtro "Hoy"
    function irAHoy() {
        filtro = 'hoy';
        fechaElegida = '';
        if (inputFecha) inputFecha.value = '';
        actualizarChips();
        aplicarFiltros();
    }

    if (chipHoy) chipHoy.addEventListener('click', irAHoy);

    // Selector de un día cualquiera
    if (inputFecha) {
        inputFecha.addEventListener('input', () => {
            // Si borra la fecha, o elige el día de hoy, se usa el filtro "Hoy"
            if (!inputFecha.value || inputFecha.value === claveDia(new Date())) {
                irAHoy();
                return;
            }
            filtro = 'fecha';
            fechaElegida = inputFecha.value;
            actualizarChips();
            aplicarFiltros();
        });
    }

    // Barra de búsqueda
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

    // "Ver hoy" desde el aviso de sin resultados
    if (btnVerHoy) btnVerHoy.addEventListener('click', irAHoy);

    // ========== LISTAR GASTOS (consulta al servidor) ==========
    async function listar() {
        if (!lista) return;

        try {
            const res = await fetch('/gasto');
            if (!res.ok) throw new Error('Error al listar');
            gastos = await res.json();
        } catch (error) {
            mostrarAlerta('No se pudieron cargar los registros.', 'error');
            return;
        }

        // Más recientes primero (el backend ya lo ordena; esto es una segunda garantía)
        gastos.sort((a, b) =>
            new Date(b.fecha_hora) - new Date(a.fecha_hora) || b.pk_gasto - a.pk_gasto);

        aplicarFiltros();
    }

    // ========== APLICAR FILTRO DE DÍA + BÚSQUEDA ==========
    function aplicarFiltros() {
        const q = normalizar(textoBusqueda.trim());
        const hoy = claveDia(new Date());

        visibles = gastos.filter(g => {
            const clave = claveDia(g.fecha_hora);

            // Filtro por día
            if (filtro === 'hoy' && clave !== hoy) return false;
            if (filtro === 'fecha' && clave !== fechaElegida) return false;

            // Búsqueda por nombre, categoría, descripción o monto
            if (q) {
                const texto = normalizar(
                    [g.nombre_gasto, g.nombre_categoria, g.description, g.total]
                        .filter(v => v !== null && v !== undefined)
                        .join(' ')
                );
                if (!texto.includes(q)) return false;
            }
            return true;
        });

        // Suma de cada día (sobre los gastos que se están mostrando)
        totalesDia = {};
        visibles.forEach(g => {
            const clave = claveDia(g.fecha_hora);
            totalesDia[clave] = (totalesDia[clave] || 0) + Number(g.total);
        });

        // Reiniciar la lista y mostrar el primer lote
        lista.innerHTML = '';
        mostrados = 0;
        ultimaClave = null;
        renderLote();
    }

    // ========== DIBUJAR UN LOTE DE REGISTROS ==========
    function renderLote() {
        const fin = Math.min(mostrados + LOTE, visibles.length);

        for (let i = mostrados; i < fin; i++) {
            const g = visibles[i];
            const clave = claveDia(g.fecha_hora);

            // Encabezado del día cuando cambia la fecha
            if (clave !== ultimaClave) {
                lista.appendChild(crearEncabezadoDia(g.fecha_hora, totalesDia[clave]));
                ultimaClave = clave;
            }
            lista.appendChild(crearItem(g));
        }
        mostrados = fin;

        // Contador y botón "Cargar más"
        const faltan = visibles.length - mostrados;
        contador.textContent = visibles.length
            ? `${visibles.length} ${visibles.length === 1 ? 'registro' : 'registros'}`
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
        btnVerHoy.classList.add('d-none');

        // Todavía no hay ningún gasto en el sistema
        if (gastos.length === 0) {
            vacioTitulo.textContent = 'Aún no hay gastos registrados.';
            vacioTexto.textContent = 'Usa la opción Nuevo del menú para agregar el primero.';
            return;
        }

        // Hay gastos, pero ninguno coincide con el día o la búsqueda
        const textoDia = filtro === 'hoy' ? 'hoy' : 'ese día';
        const busqueda = textoBusqueda.trim();

        if (busqueda) {
            vacioTitulo.textContent = 'Sin resultados';
            vacioTexto.textContent = `No hay gastos que coincidan con "${busqueda}" ${textoDia}.`;
        } else {
            vacioTitulo.textContent = `No hay gastos ${textoDia}.`;
            vacioTexto.textContent = filtro === 'hoy'
                ? 'Registra uno desde Nuevo o consulta otro día en el calendario.'
                : 'Prueba con otra fecha o vuelve a Hoy.';
        }

        // Si está viendo otro día, ofrecer regresar a Hoy
        if (filtro === 'fecha') btnVerHoy.classList.remove('d-none');
    }

    // ========== ENCABEZADO DE DÍA (con la suma del día) ==========
    function crearEncabezadoDia(fecha, total) {
        const div = document.createElement('div');
        div.className = 'g-dia';
        div.innerHTML = '<span class="g-dia-nombre"></span><span class="g-dia-total"></span>';
        div.querySelector('.g-dia-nombre').textContent = etiquetaDia(fecha);
        div.querySelector('.g-dia-total').textContent = dinero(total);
        return div;
    }

    // ========== TARJETA DE UN GASTO ==========
    function crearItem(g) {
        const item = document.createElement('article');
        item.className = 'g-item';

        // Estructura fija; los datos se agregan después con textContent (evita XSS)
        item.innerHTML = `
            <div class="g-fila">
                <div class="g-avatar"></div>
                <div class="g-info">
                    <div class="g-nombre"></div>
                    <div class="g-meta">
                        <span class="g-cat"></span>
                        <span class="g-hora"></span>
                    </div>
                </div>
                <div class="g-der">
                    <div class="g-total"></div>
                    <button type="button" class="g-mas" aria-label="Más opciones" aria-expanded="false">&#8943;</button>
                </div>
            </div>
            <div class="g-detalle"></div>
            <div class="g-acciones">
                <button type="button" class="g-accion g-editar">${ICO_EDITAR}<span>Editar</span></button>
                <button type="button" class="g-accion g-desactivar">${ICO_PAUSA}<span>Desactivar</span></button>
                <button type="button" class="g-accion g-eliminar">${ICO_BASURA}<span>Eliminar</span></button>
            </div>
        `;

        const inicial = (g.nombre_gasto || '?').trim().charAt(0).toUpperCase();
        item.querySelector('.g-avatar').textContent = inicial;
        item.querySelector('.g-nombre').textContent = g.nombre_gasto;
        item.querySelector('.g-total').textContent = dinero(g.total);
        item.querySelector('.g-hora').textContent =
            new Date(g.fecha_hora).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        // Categoría (si no tiene, se quita la etiqueta)
        const cat = item.querySelector('.g-cat');
        if (g.nombre_categoria) cat.textContent = g.nombre_categoria;
        else cat.remove();

        // Detalle opcional: cantidad × precio y descripción
        const detalle = item.querySelector('.g-detalle');
        const partes = [];
        if (g.cantidad !== null && g.precio !== null) {
            const cant = Number(g.cantidad).toLocaleString(undefined, { maximumFractionDigits: 2 });
            partes.push(`${cant} × ${dinero(g.precio)}`);
        }
        if (g.description) partes.push(g.description);

        if (partes.length) {
            partes.forEach(texto => {
                const p = document.createElement('div');
                p.textContent = texto;
                detalle.appendChild(p);
            });
        } else {
            detalle.remove();
        }

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

        item.querySelector('.g-editar').addEventListener('click', () => editar(g));
        item.querySelector('.g-desactivar').addEventListener('click', () => desactivar(g));
        item.querySelector('.g-eliminar').addEventListener('click', () => desaparecer(g));

        return item;
    }

    // ========== EDITAR GASTO ==========
    function editar(g) {
        mostrarFormulario();

        document.getElementById('pk_gasto').value = g.pk_gasto;
        document.getElementById('nombre_gasto').value = g.nombre_gasto;
        selectCategoria.value = g.fk_categoria ?? '';
        inputCantidad.value = g.cantidad ?? '';
        inputPrecio.value = g.precio ?? '';
        inputTotal.value = g.total;
        document.getElementById('description').value = g.description || '';

        window.scrollTo(0, 0);
    }

    // ========== DESACTIVAR GASTO (SOFT DELETE) ==========
    async function desactivar(g) {
        const ok = await confirmar({
            titulo: '¿Desactivar este gasto?',
            texto: `"${g.nombre_gasto}" dejará de aparecer en tus registros.`,
            textoBoton: 'Desactivar',
            tipo: 'aviso'
        });
        if (!ok) return;

        try {
            // PATCH - Cambiar status a FALSE
            const res = await fetch(`/gasto/${g.pk_gasto}/desactivar`, { method: 'PATCH' });
            if (!res.ok) {
                const result = await res.json();
                mostrarAlerta(result.error, 'error');
                return;
            }
            await listar();
            mostrarAlerta('Gasto desactivado correctamente');
        } catch (error) {
            mostrarAlerta('No se pudo desactivar. Inténtalo de nuevo.', 'error');
        }
    }

    // ========== ELIMINAR GASTO (HARD DELETE) ==========
    async function desaparecer(g) {
        const ok = await confirmar({
            titulo: '¿Eliminar este gasto?',
            texto: `"${g.nombre_gasto}" se borrará de forma permanente. Esta acción no se puede deshacer.`,
            textoBoton: 'Eliminar',
            tipo: 'peligro'
        });
        if (!ok) return;

        try {
            // DELETE - Eliminar de la base de datos
            const res = await fetch(`/gasto/${g.pk_gasto}`, { method: 'DELETE' });

            if (!res.ok) {
                const result = await res.json();
                mostrarAlerta(result.error, 'error');
                return;
            }
            await listar();
            mostrarAlerta('Gasto eliminado correctamente');
        } catch (error) {
            mostrarAlerta('No se pudo eliminar. Inténtalo de nuevo.', 'error');
        }
    }

    // ========== FUNCIONES GLOBALES DE UI ==========

    // Mostrar el formulario (edición) y ocultar el listado
    window.mostrarFormulario = function () {
        const f = document.getElementById('contenedorFormulario');
        const t = document.getElementById('contenedorTabla');

        if (f) f.classList.remove('d-none');
        if (t) t.classList.add('d-none');
    };

    // Mostrar el listado y ocultar el formulario
    window.mostrarTabla = function () {
        const formulario = document.getElementById('formGasto');
        const f = document.getElementById('contenedorFormulario');
        const t = document.getElementById('contenedorTabla');
        const id = document.getElementById('pk_gasto');

        if (formulario) formulario.reset(); // Limpiar formulario
        if (id) id.value = '';              // Limpiar ID oculto
        if (f) f.classList.add('d-none');
        if (t) t.classList.remove('d-none');
    };

})();