// Formulario rápido de gasto + límite de hoy (pantalla de inicio)
(() => {

    const UMBRAL_ALERTA = 80; // % a partir del cual se avisa que está cerca del límite

    const form = document.getElementById('formGastoRapido');
    if (!form) return;

    const hero = document.getElementById('heroHoy');
    const nombre = document.getElementById('qNombre');
    const categoria = document.getElementById('qCategoria');
    const total = document.getElementById('qTotal');
    const detalles = document.getElementById('qDetalles');
    const btnDetalles = document.getElementById('btnDetalles');
    const cantidad = document.getElementById('qCantidad');
    const precio = document.getElementById('qPrecio');
    const descripcion = document.getElementById('qDescripcion');
    const btnGuardar = document.getElementById('btnGuardar');

    cargarCategorias();
    cargarLimiteHoy();

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

    // ========== LÍMITE DE HOY ==========
    async function cargarLimiteHoy() {
        if (!hero) return;

        try {
            const [resLimites, resGastos] = await Promise.all([
                fetch('/limite_gasto'),
                fetch('/gasto')
            ]);
            if (!resLimites.ok) throw new Error('Error al listar');

            const limites = await resLimites.json();
            const gastos = resGastos.ok ? await resGastos.json() : [];

            const hoy = claveDia(new Date());
            const limiteHoy = limites.find(l => l.fecha === hoy);
            const gastadoHoy = gastos
                .filter(g => claveDia(g.fecha_hora) === hoy)
                .reduce((acc, g) => acc + Number(g.total), 0);

            pintarLimite(limiteHoy, gastadoHoy);
        } catch (error) {
            // Si falla, simplemente no se muestra la barra
            hero.innerHTML = '';
            console.error('No se pudo cargar el límite de hoy:', error);
        }
    }

    // Barra compacta del límite de hoy
    function pintarLimite(limiteHoy, gastadoHoy) {
        hero.innerHTML = '';

        const barra = document.createElement('section');
        barra.className = 'l-mini';
        barra.setAttribute('role', 'button');
        barra.setAttribute('tabindex', '0');
        barra.setAttribute('aria-label', 'Límite de hoy. Toca para ver el detalle');

        // Toda la barra abre el apartado de límites
        barra.addEventListener('click', irALimites);
        barra.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                irALimites();
            }
        });

        // No hay límite definido para hoy
        if (!limiteHoy) {
            barra.classList.add('l-sin');
            barra.innerHTML = `
                <div class="l-mini-fila">
                    <span class="l-mini-disp"></span>
                    <span class="l-mini-btn">Definir</span>
                </div>
            `;
            barra.querySelector('.l-mini-disp').textContent =
                `Sin límite hoy · Gastado ${dinero(gastadoHoy)}`;
            hero.appendChild(barra);
            return;
        }

        const tope = Number(limiteHoy.monto);
        const pct = tope > 0 ? (gastadoHoy / tope) * 100 : (gastadoHoy > 0 ? 100 : 0);

        let estado = 'ok';
        if (gastadoHoy > tope) estado = 'excedido';
        else if (pct >= UMBRAL_ALERTA) estado = 'alerta';

        const diferencia = tope - gastadoHoy;
        const texto = diferencia >= 0
            ? `Disponible ${dinero(diferencia)}`
            : `Te pasaste por ${dinero(-diferencia)}`;

        barra.classList.add('l-' + estado);
        barra.innerHTML = `
            <div class="l-mini-fila">
                <span class="l-mini-disp"><i class="l-mini-punto"></i><span class="l-mini-texto"></span></span>
                <span class="l-mini-det"></span>
            </div>
            <div class="l-mini-barra"><div class="l-mini-relleno"></div></div>
        `;
        barra.querySelector('.l-mini-texto').textContent = texto;
        barra.querySelector('.l-mini-det').textContent = `de ${dinero(tope)}`;
        barra.querySelector('.l-mini-relleno').style.width = Math.min(100, pct) + '%';
        hero.appendChild(barra);
    }

    // Abre el apartado de límite de gasto (cargarVista vive en menu.js)
    function irALimites() {
        if (typeof cargarVista === 'function') cargarVista('limite_gasto');
    }

    // ========== CATEGORÍAS ==========
    async function cargarCategorias() {
        try {
            const res = await fetch('/categoria');
            const categorias = await res.json();

            categorias.forEach(c => {
                const option = document.createElement('option');
                option.value = c.pk_categoria;
                option.textContent = c.nombre_categoria; // textContent evita inyección de HTML
                categoria.appendChild(option);
            });
        } catch (error) {
            console.error('No se pudieron cargar las categorías:', error);
        }
    }

    // ========== MOSTRAR / OCULTAR DETALLES ==========
    function cerrarDetalles() {
        detalles.classList.add('d-none');
        btnDetalles.setAttribute('aria-expanded', 'false');
        btnDetalles.querySelector('.txt').textContent = 'Agregar más detalles';
    }

    btnDetalles.addEventListener('click', () => {
        detalles.classList.toggle('d-none');
        const abierto = !detalles.classList.contains('d-none');
        btnDetalles.setAttribute('aria-expanded', abierto);
        btnDetalles.querySelector('.txt').textContent = abierto ? 'Ocultar detalles' : 'Agregar más detalles';
    });

    // ========== TOTAL AUTOMÁTICO (cantidad × precio) ==========
    function calcularTotal() {
        if (cantidad.value !== '' && precio.value !== '') {
            total.value = (Number(cantidad.value) * Number(precio.value)).toFixed(2);
        }
    }
    cantidad.addEventListener('input', calcularTotal);
    precio.addEventListener('input', calcularTotal);

    // ========== GUARDAR ==========
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            nombre_gasto: nombre.value,
            total: total.value,
            description: descripcion.value,
            cantidad: cantidad.value,
            precio: precio.value,
            fk_categoria: categoria.value
        };

        btnGuardar.disabled = true; // Evita envíos dobles

        try {
            const res = await fetch('/gasto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const err = await res.json();
                mostrarAlerta(err.error, 'error');
                return;
            }

            // Listo para capturar el siguiente gasto
            form.reset();
            cerrarDetalles();
            mostrarAlerta('Gasto guardado. Agrega el siguiente');
            nombre.focus(); // La alerta está arriba, el teclado no la tapa

            // Actualiza lo disponible del día con el gasto recién guardado
            cargarLimiteHoy();
        } catch (error) {
            mostrarAlerta('No se pudo guardar. Inténtalo de nuevo.', 'error');
        } finally {
            btnGuardar.disabled = false;
        }
    });

})();