// Se envuelve en una función para que las variables no choquen con otras vistas
// cuando menu.js vuelve a cargar este script.
(() => {

    const LOTE = 10;          // Registros que se muestran por cada "Cargar más"
    const UMBRAL_ALERTA = 80; // % a partir del cual se avisa que está cerca del límite

    // Íconos (SVG) para los botones de acciones y la ventana de confirmación
    const ICO_EDITAR = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
    const ICO_PAUSA = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></svg>';
    const ICO_BASURA = '<svg class="g-ico" viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
    const ICO_LIMITE = '<svg class="g-ico" style="width:22px;height:22px" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';

    // Referencias a elementos del DOM (el HTML ya está insertado cuando carga este script)
    const form = document.getElementById('formLimite');
    const lista = document.getElementById('listaLimites');
    const hero = document.getElementById('heroHoy');
    const vacio = document.getElementById('vacioLimites');
    const vacioTitulo = document.getElementById('vacioTitulo');
    const vacioTexto = document.getElementById('vacioTexto');
    const btnMas = document.getElementById('btnMas');
    const restantes = document.getElementById('restantes');
    const contador = document.getElementById('contadorLimites');
    const btnNueva = document.getElementById('btnNueva');
    const tituloFormulario = document.getElementById('tituloFormulario');
    const inputId = document.getElementById('pk_limite');
    const inputFecha = document.getElementById('fecha');
    const inputMonto = document.getElementById('monto');
    const inputComentario = document.getElementById('comentario');

    // Búsqueda
    const inputBuscar = document.getElementById('buscarLimite');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');

    // Ventana de confirmación
    const modal = document.getElementById('modalConfirm');
    const mcIcono = document.getElementById('mcIcono');
    const mcTitulo = document.getElementById('mcTitulo');
    const mcTexto = document.getElementById('mcTexto');
    const mcCancelar = document.getElementById('mcCancelar');
    const mcAceptar = document.getElementById('mcAceptar');
    let resolverConfirmacion = null;

    let limites = [];          // Todos los límites activos, del más reciente al más antiguo
    let gastadoPorDia = {};    // Suma de gastos por día 'YYYY-MM-DD'
    let visibles = [];         // Los que cumplen la búsqueda actual
    let mostrados = 0;         // Cuántos ya se dibujaron
    let textoBusqueda = '';

    // Cargar los límites y los gastos al iniciar
    listar();

    // ========== FORMATOS ==========
    const dinero = n => '$' + Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Clave del día 'YYYY-MM-DD' en la zona horaria del ordenador
    function claveDia(fecha) {
        const d = new Date(fecha);
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mes}-${dia}`;
    }

    // Clave de un día con desplazamiento (0 = hoy, -1 = ayer, 1 = mañana)
    function claveRelativa(dias) {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        return claveDia(d);
    }

    // La fecha llega como 'YYYY-MM-DD'; se arma localmente para evitar desfases
    function fechaLocal(clave) {
        const [anio, mes, dia] = clave.split('-').map(Number);
        return new Date(anio, mes - 1, dia);
    }

    // "Hoy", "Ayer", "Mañana" o la fecha completa, con el idioma del ordenador
    function etiquetaFecha(clave) {
        if (clave === claveRelativa(0)) return 'Hoy';
        if (clave === claveRelativa(-1)) return 'Ayer';
        if (clave === claveRelativa(1)) return 'Mañana';

        const d = fechaLocal(clave);
        const texto = d.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    // Minúsculas y sin acentos, para que "mañana" encuentre "manana"
    function normalizar(texto) {
        return String(texto)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    // ========== ESTADO DE UN LÍMITE (gastado vs. límite) ==========
    function calcularEstado(limite) {
        const tope = Number(limite.monto);
        const gastado = gastadoPorDia[limite.fecha] || 0;
        const pct = tope > 0 ? (gastado / tope) * 100 : (gastado > 0 ? 100 : 0);

        let estado = 'ok';
        let texto = 'Dentro del límite';

        if (gastado > tope) {
            estado = 'excedido';
            texto = 'Límite superado';
        } else if (pct >= UMBRAL_ALERTA) {
            estado = 'alerta';
            texto = 'Cerca del límite';
        } else if (limite.fecha > claveRelativa(0) && gastado === 0) {
            texto = 'Programado';
        }

        const diferencia = tope - gastado;
        const detalle = diferencia >= 0
            ? `Disponible ${dinero(diferencia)}`
            : `Te pasaste por ${dinero(-diferencia)}`;

        return { tope, gastado, pct: Math.min(100, pct), estado, texto, detalle };
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

    // ========== NUEVO LÍMITE ==========
    function abrirNuevo(fecha) {
        form.reset();
        inputId.value = '';
        inputFecha.value = fecha || claveRelativa(0); // Por defecto, hoy
        tituloFormulario.textContent = 'Nuevo límite';
        mostrarFormulario();
        inputMonto.focus();
    }

    if (btnNueva) btnNueva.addEventListener('click', () => abrirNuevo());

    // ========== SUBMIT DEL FORMULARIO ==========
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevenir recarga de página

            const id = inputId.value;
            const data = {
                fecha: inputFecha.value,
                monto: inputMonto.value,
                comentario: inputComentario.value
            };

            // PUT si es actualización, POST si es creación
            const url = id ? `/limite_gasto/${id}` : '/limite_gasto';
            const method = id ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                // Mostrar error del servidor (ej. fecha duplicada) sin perder lo escrito
                if (!res.ok) {
                    const err = await res.json();
                    mostrarAlerta(err.error, 'error');
                    return;
                }

                mostrarTabla();
                await listar();
                mostrarAlerta(id ? 'Límite actualizado correctamente' : 'Límite creado correctamente');
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

    // ========== LISTAR LÍMITES Y GASTOS (consulta al servidor) ==========
    async function listar() {
        if (!lista) return;

        try {
            const [resLimites, resGastos] = await Promise.all([
                fetch('/limite_gasto'),
                fetch('/gasto')
            ]);
            if (!resLimites.ok) throw new Error('Error al listar');
            limites = await resLimites.json();

            // Si fallan los gastos, los límites se muestran igual (con $0.00 gastado)
            const gastos = resGastos.ok ? await resGastos.json() : [];

            // Suma de gastos por día, con la zona horaria del ordenador
            gastadoPorDia = {};
            gastos.forEach(g => {
                const clave = claveDia(g.fecha_hora);
                gastadoPorDia[clave] = (gastadoPorDia[clave] || 0) + Number(g.total);
            });
        } catch (error) {
            mostrarAlerta('No se pudieron cargar los límites.', 'error');
            return;
        }

        // Más recientes primero (el backend ya lo ordena; esto es una segunda garantía)
        limites.sort((a, b) => b.fecha.localeCompare(a.fecha));

        pintarHero();
        aplicarFiltros();
    }

    // ========== TARJETA "LÍMITE DE HOY" ==========
    function pintarHero() {
        const hoy = claveRelativa(0);
        const limiteHoy = limites.find(l => l.fecha === hoy);

        hero.innerHTML = '';
        const card = document.createElement('section');
        card.className = 'l-hero';

        // No hay límite definido para hoy
        if (!limiteHoy) {
            card.innerHTML = `
                <div class="l-hero-etiqueta">Límite de hoy</div>
                <div class="l-hero-titulo">Aún no defines un límite para hoy</div>
                <div class="l-hero-sub"></div>
                <button type="button" class="l-hero-btn">Definir límite de hoy</button>
            `;
            const gastadoHoy = gastadoPorDia[hoy] || 0;
            card.querySelector('.l-hero-sub').textContent =
                `Llevas gastado ${dinero(gastadoHoy)} hoy.`;
            card.querySelector('.l-hero-btn').addEventListener('click', () => abrirNuevo(hoy));
            hero.appendChild(card);
            return;
        }

        const e = calcularEstado(limiteHoy);
        card.classList.add('l-' + e.estado);
        card.innerHTML = `
            <div class="l-hero-etiqueta">Límite de hoy</div>
            <div class="l-hero-titulo"></div>
            <div class="l-hero-sub"></div>
            <div class="l-barra"><div class="l-relleno"></div></div>
            <div class="l-hero-pie">
                <span class="l-hero-gastado"></span>
                <span class="l-hero-estado"></span>
            </div>
        `;
        card.querySelector('.l-hero-titulo').textContent = e.detalle;
        card.querySelector('.l-hero-sub').textContent = limiteHoy.comentario || '';
        card.querySelector('.l-relleno').style.width = e.pct + '%';
        card.querySelector('.l-hero-gastado').textContent =
            `Gastado ${dinero(e.gastado)} de ${dinero(e.tope)}`;
        card.querySelector('.l-hero-estado').textContent = e.texto;
        hero.appendChild(card);
    }

    // ========== APLICAR BÚSQUEDA ==========
    function aplicarFiltros() {
        const q = normalizar(textoBusqueda.trim());

        visibles = limites.filter(l => {
            if (!q) return true;
            const [anio, mes, dia] = l.fecha.split('-');
            const texto = normalizar(
                [etiquetaFecha(l.fecha), l.fecha, `${dia}/${mes}/${anio}`, l.comentario, l.monto]
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
            ? `${visibles.length} ${visibles.length === 1 ? 'límite' : 'límites'}`
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

        if (limites.length === 0) {
            vacioTitulo.textContent = 'Aún no tienes límites de gasto.';
            vacioTexto.textContent = 'Toca "Nuevo límite" para definir cuánto quieres gastar en un día.';
        } else {
            vacioTitulo.textContent = 'Sin resultados';
            vacioTexto.textContent = `No hay límites que coincidan con "${textoBusqueda.trim()}".`;
        }
    }

    // ========== TARJETA DE UN LÍMITE ==========
    function crearItem(l) {
        const e = calcularEstado(l);

        const item = document.createElement('article');
        item.className = 'g-item l-' + e.estado;

        // Estructura fija; los datos se agregan después con textContent (evita XSS)
        item.innerHTML = `
            <div class="g-fila">
                <div class="g-avatar">${ICO_LIMITE}</div>
                <div class="g-info">
                    <div class="g-nombre"></div>
                    <div class="g-meta">
                        <span class="g-cat"></span>
                    </div>
                </div>
                <div class="g-der">
                    <div class="g-total"></div>
                    <button type="button" class="g-mas" aria-label="Más opciones" aria-expanded="false">&#8943;</button>
                </div>
            </div>
            <div class="g-detalle"></div>
            <div class="l-progreso">
                <div class="l-barra" role="progressbar" aria-label="Gastado del límite"
                     aria-valuemin="0" aria-valuemax="100"><div class="l-relleno"></div></div>
                <div class="l-texto">
                    <span class="l-gastado"></span>
                    <span class="l-disponible"></span>
                </div>
            </div>
            <div class="g-acciones">
                <button type="button" class="g-accion g-editar">${ICO_EDITAR}<span>Editar</span></button>
                <button type="button" class="g-accion g-desactivar">${ICO_PAUSA}<span>Desactivar</span></button>
                <button type="button" class="g-accion g-eliminar">${ICO_BASURA}<span>Eliminar</span></button>
            </div>
        `;

        item.querySelector('.g-nombre').textContent = etiquetaFecha(l.fecha);
        item.querySelector('.g-cat').textContent = e.texto;
        item.querySelector('.g-total').textContent = dinero(l.monto);

        item.querySelector('.l-relleno').style.width = e.pct + '%';
        item.querySelector('.l-barra').setAttribute('aria-valuenow', Math.floor(e.pct));
        item.querySelector('.l-gastado').textContent = `Gastado ${dinero(e.gastado)}`;
        item.querySelector('.l-disponible').textContent = e.detalle;

        // Comentario (si no tiene, se quita el bloque)
        const detalle = item.querySelector('.g-detalle');
        if (l.comentario) detalle.textContent = l.comentario;
        else detalle.remove();

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

        item.querySelector('.g-editar').addEventListener('click', () => editar(l));
        item.querySelector('.g-desactivar').addEventListener('click', () => desactivar(l));
        item.querySelector('.g-eliminar').addEventListener('click', () => desaparecer(l));

        return item;
    }

    // ========== EDITAR LÍMITE ==========
    function editar(l) {
        tituloFormulario.textContent = 'Editar límite';
        mostrarFormulario();

        // Llenar los campos con los datos del límite
        inputId.value = l.pk_limite;
        inputFecha.value = l.fecha; // 'YYYY-MM-DD' es el formato que pide input date
        inputMonto.value = l.monto;
        inputComentario.value = l.comentario || '';

        window.scrollTo(0, 0);
        inputMonto.focus();
    }

    // ========== DESACTIVAR LÍMITE (SOFT DELETE) ==========
    async function desactivar(l) {
        const ok = await confirmar({
            titulo: '¿Desactivar este límite?',
            texto: `El límite de ${etiquetaFecha(l.fecha).toLowerCase()} (${dinero(l.monto)}) dejará de aparecer.`,
            textoBoton: 'Desactivar',
            tipo: 'aviso'
        });
        if (!ok) return;

        try {
            // PATCH - Cambiar status a FALSE
            const res = await fetch(`/limite_gasto/${l.pk_limite}/desactivar`, { method: 'PATCH' });
            if (!res.ok) {
                const result = await res.json();
                mostrarAlerta(result.error, 'error');
                return;
            }
            await listar();
            mostrarAlerta('Límite desactivado correctamente');
        } catch (error) {
            mostrarAlerta('No se pudo desactivar. Inténtalo de nuevo.', 'error');
        }
    }

    // ========== ELIMINAR LÍMITE (HARD DELETE) ==========
    async function desaparecer(l) {
        const ok = await confirmar({
            titulo: '¿Eliminar este límite?',
            texto: `El límite de ${etiquetaFecha(l.fecha).toLowerCase()} (${dinero(l.monto)}) se borrará de forma permanente. Esta acción no se puede deshacer.`,
            textoBoton: 'Eliminar',
            tipo: 'peligro'
        });
        if (!ok) return;

        try {
            // DELETE - Eliminar de la base de datos
            const res = await fetch(`/limite_gasto/${l.pk_limite}`, { method: 'DELETE' });

            if (!res.ok) {
                const result = await res.json();
                mostrarAlerta(result.error, 'error');
                return;
            }
            await listar();
            mostrarAlerta('Límite eliminado correctamente');
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
        const formulario = document.getElementById('formLimite');
        const f = document.getElementById('contenedorFormulario');
        const t = document.getElementById('contenedorTabla');
        const n = document.getElementById('btnNueva');
        const id = document.getElementById('pk_limite');

        if (formulario) formulario.reset(); // Limpiar formulario
        if (id) id.value = '';              // Limpiar ID oculto
        if (f) f.classList.add('d-none');
        if (t) t.classList.remove('d-none');
        if (n) n.classList.remove('d-none');
    };

})();