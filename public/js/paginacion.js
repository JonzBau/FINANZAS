window.initPaginacion = function ({
    tbodyId,
    filasPorPagina = 10
}) {
    const tablaBody = document.getElementById(tbodyId);
    if (!tablaBody) return;

    let filas = Array.from(tablaBody.querySelectorAll("tr"));
    let totalFilas = filas.length;
    let paginaActual = 1;
    let totalPaginas = Math.ceil(totalFilas / filasPorPagina);

    const btnPrimero = document.getElementById("btn-primero");
    const btnAnterior = document.getElementById("btn-anterior");
    const btnSiguiente = document.getElementById("btn-siguiente");
    const btnUltimo = document.getElementById("btn-ultimo");
    const paginaInfo = document.getElementById("pagina-info");
    const paginaInput = document.getElementById("pagina-input");
    const registroInfo = document.getElementById("registro-info");

    function mostrarPagina(pagina) {
        let inicio = (pagina - 1) * filasPorPagina;
        let fin = inicio + filasPorPagina;

        filas.forEach((fila, index) => {
            fila.style.display = (index >= inicio && index < fin) ? "" : "none";
        });

        paginaInfo.textContent = `Página ${pagina} de ${totalPaginas}`;
        paginaInput.value = pagina;

        btnAnterior.disabled = pagina === 1;
        btnPrimero.disabled = pagina === 1;
        btnSiguiente.disabled = pagina === totalPaginas;
        btnUltimo.disabled = pagina === totalPaginas;

        registroInfo.textContent = `${inicio + 1} - ${Math.min(fin, totalFilas)} de ${totalFilas} registros`;
    }

    mostrarPagina(paginaActual);

    btnPrimero.onclick = () => mostrarPagina(paginaActual = 1);
    btnUltimo.onclick = () => mostrarPagina(paginaActual = totalPaginas);
    btnAnterior.onclick = () => paginaActual > 1 && mostrarPagina(--paginaActual);
    btnSiguiente.onclick = () => paginaActual < totalPaginas && mostrarPagina(++paginaActual);

    paginaInput.onchange = () => {
        let n = parseInt(paginaInput.value);
        if (n >= 1 && n <= totalPaginas) {
            paginaActual = n;
            mostrarPagina(paginaActual);
        } else {
            paginaInput.value = paginaActual;
        }
    };
};
