let itemEditando = null;

const unidadesDisponiveis = ["Campinas", "Mocca", "Barueri", "Joinvile", "Santos"];
let unidadeSelecionada = localStorage.getItem("unidadeSelecionada") || "Campinas";
const supabaseConfig = window.SUPABASE_CONFIG || {};
let bancoOnlineAtivo = false;
let salvamentoOnlineTimer = null;

function obterSupabaseConfigurado(){

    return Boolean(
        supabaseConfig.url &&
        supabaseConfig.anonKey &&
        supabaseConfig.url.includes("supabase")
    );

}

function obterSupabaseEndpoint(){

    return `${supabaseConfig.url.replace(/\/$/,"")}/rest/v1/app_state`;

}

function obterCabecalhosSupabase(prefer){

    const cabecalhos = {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
        "Content-Type": "application/json"
    };

    if(prefer){
        cabecalhos.Prefer = prefer;
    }

    return cabecalhos;

}

function montarEstadoAtual(){

    return {
        contratos: contratos,
        movimentacoes: movimentacoes,
        itens: itens
    };

}

function aplicarEstado(dados){

    contratos = (dados.contratos || []).map(function(contrato){
        return normalizarContrato(contrato);
    });

    movimentacoes = dados.movimentacoes || [];
    itens = dados.itens || [];

}

async function carregarDadosOnline(){

    if(!obterSupabaseConfigurado()) return false;

    const stateId = supabaseConfig.stateId || "controle-glp";
    const url = `${obterSupabaseEndpoint()}?id=eq.${encodeURIComponent(stateId)}&select=payload`;

    const resposta = await fetch(url, {
        headers: obterCabecalhosSupabase()
    });

    if(!resposta.ok){
        throw new Error("Falha ao carregar dados online.");
    }

    const registros = await resposta.json();

    if(registros.length === 0){
        return false;
    }

    aplicarEstado(registros[0].payload || {});
    bancoOnlineAtivo = true;
    return true;

}

async function salvarDadosOnline(){

    if(!obterSupabaseConfigurado()) return;

    const stateId = supabaseConfig.stateId || "controle-glp";

    const resposta = await fetch(`${obterSupabaseEndpoint()}?on_conflict=id`, {
        method: "POST",
        headers: obterCabecalhosSupabase("resolution=merge-duplicates"),
        body: JSON.stringify({
            id: stateId,
            payload: montarEstadoAtual(),
            updated_at: new Date().toISOString()
        })
    });

    if(!resposta.ok){
        throw new Error("Falha ao salvar dados online.");
    }

    bancoOnlineAtivo = true;

}

function agendarSalvamentoOnline(){

    if(!obterSupabaseConfigurado()) return;

    clearTimeout(salvamentoOnlineTimer);

    salvamentoOnlineTimer = setTimeout(function(){
        salvarDadosOnline().catch(function(){
            mostrarToast("Dados salvos localmente. Falha ao sincronizar online.", "aviso");
        });
    }, 350);

}

function obterUnidadeAtual(){
    return unidadeSelecionada;
}

function obterUnidadeRegistro(registro){
    return registro.unidade || obterUnidadeAtual() || "Campinas";
}

function pertenceUnidadeAtual(registro){
    return obterUnidadeRegistro(registro) === obterUnidadeAtual();
}

function obterContratosUnidade(){
    return contratos.filter(pertenceUnidadeAtual);
}

function obterMovimentacoesUnidade(){
    return movimentacoes.filter(pertenceUnidadeAtual);
}

function obterItensUnidade(){
    return itens.filter(pertenceUnidadeAtual);
}

function obterContratoAtivo(){
    return obterContratosUnidade().find(function(c){
        return String(c.status).toLowerCase() === "ativo";
    });
}

function atualizarTopoUnidade(){

    const unidadeTopo = document.getElementById("unidadeAtualTopo");

    if(unidadeTopo){
        unidadeTopo.textContent = obterUnidadeAtual() || "Selecionar unidade";
    }

}

function atualizarIdentidadeTopo(pagina){

    const iconeTopo = document.getElementById("iconeSistemaTopo");
    const tituloTopo = document.getElementById("tituloSistemaTopo");

    if(!iconeTopo || !tituloTopo) return;

    iconeTopo.className = "fa-solid fa-fire-flame-simple";
    tituloTopo.textContent = "Controle GLP";
    document.title = "Controle GLP";

}

function marcarUnidadeSelecionada(){

    document.querySelectorAll(".card-unidade").forEach(function(card){
        card.classList.toggle("unidade-selecionada", card.dataset.unidade === obterUnidadeAtual());
    });

}

function migrarRegistrosSemUnidade(unidade){

    contratos = contratos.map(function(contrato){
        return {
            ...contrato,
            unidade: contrato.unidade || unidade
        };
    });

    movimentacoes = movimentacoes.map(function(mov){
        return {
            ...mov,
            unidade: mov.unidade || unidade
        };
    });

    itens = itens.map(function(item){
        return {
            ...item,
            unidade: item.unidade || unidade
        };
    });

}

function selecionarUnidade(unidade){

    if(!unidadesDisponiveis.includes(unidade)){
        mostrarToast("Unidade inválida.", "erro");
        return;
    }

    unidadeSelecionada = unidade;
    localStorage.setItem("unidadeSelecionada", unidade);

    migrarRegistrosSemUnidade(unidade);
    salvarDados();
    atualizarTopoUnidade();
    carregarPagina("inicio");

}

function marcarMenuAtivo(pagina){

    const mapaMenu = {
        inicio: "btnInicio",
        contratos: "btnContratos",
        movimentacoes: "btnMovimentacoes",
        itens: "btnItens",
        relatorios: "btnRelatorios"
    };

    document.querySelectorAll("aside button").forEach(function(botao){
        botao.classList.remove("ativo-menu");
    });

    const botaoAtivo = document.getElementById(mapaMenu[pagina]);

    if(botaoAtivo){
        botaoAtivo.classList.add("ativo-menu");
    }

}

function definirFormularioAberto(idFormulario, aberto){

    const formulario = document.getElementById(idFormulario);

    if(!formulario) return;

    formulario.classList.toggle("aberto", aberto);

    const botao = formulario.querySelector("[data-form-toggle]");

    if(botao){
        botao.setAttribute("aria-expanded", aberto ? "true" : "false");
    }

}

function alternarFormularioCadastro(idFormulario){

    const formulario = document.getElementById(idFormulario);

    if(!formulario) return;

    definirFormularioAberto(idFormulario, !formulario.classList.contains("aberto"));

}

function prepararTabelasResponsivas(raiz = document){

    raiz.querySelectorAll("table:not(.instrucao-tabela)").forEach(tabela => {

        if(tabela.parentElement?.classList.contains("tabela-responsiva")) return;

        const contenedor = document.createElement("div");
        contenedor.className = "tabela-responsiva";
        contenedor.setAttribute("role", "region");
        contenedor.setAttribute("aria-label", "Tabela com rolagem horizontal");
        contenedor.tabIndex = 0;

        tabela.parentNode.insertBefore(contenedor, tabela);
        contenedor.appendChild(tabela);

    });

}

function carregarPagina(pagina){

    atualizarIdentidadeTopo(pagina);
    atualizarTopoUnidade();

    fetch("paginas/" + pagina + ".html")
        .then(resposta => resposta.text())
        .then(html => {

            const conteudo = document.getElementById("conteudo");
            conteudo.innerHTML = html;
            prepararTabelasResponsivas(conteudo);
            marcarMenuAtivo(pagina);

            if(pagina === "inicio"){
                atualizarDashboard();
            }

            if(pagina === "contratos"){
                atualizarTabela();
            }

            if(pagina === "movimentacoes"){


            preencherDataHoje();
            atualizarTabelaMovimentacoes();
            carregarContratoAtivoMovimentacao();
            carregarItensMovimentacao();
            atualizarGraficoMensal();
            
}
            if(pagina === "itens"){
                atualizarTabelaItens();
            }

            if(pagina === "relatorios"){

            carregarFiltrosRelatorio();

            }

        });

}

// Abre o início quando o sistema inicia

// Botões

document.getElementById("btnRelatorios").onclick = function(){

    carregarPagina("relatorios");

}

document.getElementById("btnInicio").onclick = function(){

    carregarPagina("inicio");

}

document.getElementById("btnContratos").onclick = function(){

    carregarPagina("contratos");

}

let contratos = [];
let movimentacoes = [];
let itens = [];

let movimentacaoEditando = null;
let graficoMensal = null;
let ultimoRelatorio = [];
const CLIENTE_PADRAO = "Clia Campinas";

inicializarApp();

function normalizarContrato(contrato){

    return {
        ...contrato,
        cliente: CLIENTE_PADRAO,
        fornecedor: contrato.fornecedor || "Ultragas",
        unidade: contrato.unidade || obterUnidadeAtual() || ""
    };

}

function obterClienteContrato(numeroContrato){

    const contrato = contratos.find(function(c){
        return c.numero === numeroContrato && pertenceUnidadeAtual(c);
    });

    return contrato ? normalizarContrato(contrato).cliente : CLIENTE_PADRAO;

}

document.getElementById("btnMovimentacoes").onclick = function(){

    carregarPagina("movimentacoes");

    setTimeout(function(){
        carregarContratosMovimentacao();
    }, 100);

}

document.getElementById("btnItens").onclick = function(){

    carregarPagina("itens");

}

document.addEventListener("click", function(e){

    const botaoFormulario = e.target.closest("[data-form-toggle]");

    if(botaoFormulario){
        alternarFormularioCadastro(botaoFormulario.dataset.formToggle);
    }

});

document.addEventListener("click", function(e){

    const botao = e.target.closest("#btnSalvarContrato");

    if(botao){

        salvarContrato();

    }

});

document.addEventListener("click", function(e){

    const botao = e.target.closest("#btnCancelarItem");

    if(botao){

        cancelarEdicaoItem();

    }

});

document.addEventListener("click", function(e){

    const botao = e.target.closest("#btnSalvarItem");

    if(botao){

        salvarItem();

    }

});

document.addEventListener("click", function(e){

    const botao = e.target.closest("#btnGerarRelatorio");

    if(botao){
        gerarRelatorio();
    }

})

function salvarContrato(){

    const numero = document.getElementById("txtContrato").value.trim();
    const valor = document.getElementById("txtValor").value.trim();
    const fornecedor = document.getElementById("txtFornecedor").value.trim();
    const inicio = document.getElementById("txtInicio").value;
    const fim = document.getElementById("txtFim").value;

    if(numero === "" || valor === "" || fornecedor === "" || inicio === "" || fim === ""){
        mostrarToast("Preencha todos os campos!", "erro");
        return;
    }

    const existe = contratos.some(function(c){
        return c.numero === numero && pertenceUnidadeAtual(c);
    });

    if(existe){
        mostrarToast("Este contrato já está cadastrado.", "erro");
        return;
    }

    contratos.forEach(function(c){
        if(pertenceUnidadeAtual(c)){
            c.status = "Encerrado";
        }
    });

    const contrato = {
        numero: numero,
        cliente: CLIENTE_PADRAO,
        fornecedor: fornecedor,
        unidade: obterUnidadeAtual(),
        valor: valor,
        inicio: inicio,
        fim: fim,
        status: "Ativo"
    };

    contratos.push(contrato);

    salvarDados();
    atualizarTabela();
    limparFormulario();

    mostrarToast("Contrato salvo com sucesso!", "sucesso");

}

function atualizarTabela(){

    const tabela = document.getElementById("listaContratos");

    tabela.innerHTML = "";

    const contratosUnidade = contratos
        .map(function(contrato, indice){
            return {
                contrato: contrato,
                indice: indice
            };
        })
        .filter(function(item){
            return pertenceUnidadeAtual(item.contrato);
        });

    if(contratosUnidade.length === 0){

        tabela.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;color:#888">
                    Nenhum contrato cadastrado.
                </td>
            </tr>
        `;

        return;

    }

    contratosUnidade.forEach(function(item){

        const dadosContrato = normalizarContrato(item.contrato);

        tabela.innerHTML += `

        <tr>

            <td>${dadosContrato.numero}</td>

            <td class="contrato-cliente">${dadosContrato.cliente}</td>

            <td>${dadosContrato.fornecedor}</td>

            <td>${dadosContrato.inicio}</td>

            <td>${dadosContrato.fim}</td>

            <td>${dadosContrato.valor}</td>

            <td>
            <span class="${dadosContrato.status === "Ativo" ? "statusAtivo" : "statusEncerrado"}">
            ${dadosContrato.status}
            </span>
            </td>

    <td>

    <button class="btnExcluir" onclick="excluirContrato(${item.indice})">

     <i class="fa-solid fa-trash"></i>

    </button>

    </td>

        </tr>

        `;

    });

}

function abrirConfirmacaoExclusao(titulo, mensagem, detalhe){

    const overlay = document.getElementById("confirmacaoOverlay");
    const btnCancelar = document.getElementById("btnConfirmacaoCancelar");
    const btnExcluir = document.getElementById("btnConfirmacaoExcluir");

    document.getElementById("confirmacaoTitulo").textContent = titulo;
    document.getElementById("confirmacaoMensagem").textContent = mensagem;
    document.getElementById("confirmacaoDetalhe").textContent = detalhe;
    overlay.classList.add("visivel");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("confirmacao-aberta");

    return new Promise(function(resolve){
        function finalizar(confirmado){
            overlay.classList.remove("visivel");
            overlay.setAttribute("aria-hidden", "true");
            document.body.classList.remove("confirmacao-aberta");
            btnCancelar.removeEventListener("click", cancelar);
            btnExcluir.removeEventListener("click", confirmar);
            overlay.removeEventListener("click", clicarFora);
            document.removeEventListener("keydown", usarTeclado);
            resolve(confirmado);
        }

        function cancelar(){ finalizar(false); }
        function confirmar(){ finalizar(true); }
        function clicarFora(evento){
            if(evento.target === overlay) finalizar(false);
        }
        function usarTeclado(evento){
            if(evento.key === "Escape") finalizar(false);
            if(evento.key === "Enter") finalizar(true);
        }

        btnCancelar.addEventListener("click", cancelar);
        btnExcluir.addEventListener("click", confirmar);
        overlay.addEventListener("click", clicarFora);
        document.addEventListener("keydown", usarTeclado);
        setTimeout(function(){ btnCancelar.focus(); }, 50);
    });

}

async function excluirContrato(indice){

    const contrato = contratos[indice];

    if(await abrirConfirmacaoExclusao(
        "Excluir contrato?",
        "Todos os dados deste contrato deixarão de aparecer no cadastro.",
        contrato ? `Contrato ${contrato.numero}` : "Contrato selecionado"
    )){

        contratos.splice(indice,1);

        salvarDados();

        atualizarTabela();

    }

}

document.addEventListener("input", function(e){

    if(e.target.id === "txtContrato"){

        e.target.value = e.target.value.replace(/\D/g,"");

    }

});

document.addEventListener("input", function(e){

    if(e.target.id === "txtValor"){

        let valor = e.target.value.replace(/\D/g,"");

        valor = (Number(valor)/100).toLocaleString("pt-BR",{

            style:"currency",

            currency:"BRL"

        });

        e.target.value = valor;

    }

});

document.addEventListener("input", function(e){

    if(e.target.id === "txtItemValor"){

        let valor = e.target.value.replace(/\D/g, "");

        valor = (Number(valor) / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

        e.target.value = valor;

    }

});

function editarContrato(indice){

    const contrato = normalizarContrato(contratos[indice]);

    definirFormularioAberto("formContrato", true);

    document.getElementById("txtContrato").value = contrato.numero;
    document.getElementById("txtValor").value = contrato.valor;
    document.getElementById("txtFornecedor").value = contrato.fornecedor;
    document.getElementById("txtInicio").value = contrato.inicio;
    document.getElementById("txtFim").value = contrato.fim;

}

function mostrarToast(mensagem, tipo = "sucesso"){

    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");

    toast.textContent = mensagem;

    toast.className = "toast " + tipo;

    container.prepend(toast);

    setTimeout(() => {
        toast.classList.add("sumir");
        setTimeout(() => {
            toast.remove();

            },300);

            },3000);

}

function limparFormulario(){

    document.getElementById("txtContrato").value = "";
    document.getElementById("txtValor").value = "";
    document.getElementById("txtFornecedor").value = "";
    document.getElementById("txtInicio").value = "";
    document.getElementById("txtFim").value = "";

    document.getElementById("txtContrato").focus();

}

document.addEventListener("input", function(e){

    if(e.target.id === "movQtd"){

        e.target.value = e.target.value.replace(/\D/g,"");

        calcularMovimentacao();

    }

});

document.addEventListener("change", function(e){

    if(e.target.id === "movItem"){

        calcularMovimentacao();

    }

});

document.addEventListener("click", function(e){

    const botaoMov = e.target.closest("#btnSalvarMovimentacao");

    if(botaoMov){
        salvarMovimentacao();
    }

});

function carregarContratosMovimentacao(){

    const select = document.getElementById("movContrato");

    if(!select) return;

    select.innerHTML = `<option value="">Selecione...</option>`;

    obterContratosUnidade().forEach(function(contrato){

        if(contrato.status === "Ativo"){

            select.innerHTML += `
                <option value="${contrato.numero}">
                    ${contrato.numero}
                </option>
            `;

        }

    });

    preencherDataHoje();

}

function calcularMovimentacao(){

    const item = document.getElementById("movItem");
    const qtd = document.getElementById("movQtd");
    const valorUnit = document.getElementById("movValorUnit");
    const valorTotal = document.getElementById("movValorTotal");

    if(!item || !qtd || !valorUnit || !valorTotal) return;

    const itemSelecionado = obterItensUnidade().find(function(i){
        return i.descricao === item.value;
    });

    const preco = itemSelecionado
        ? converterMoedaParaNumero(itemSelecionado.valor)
        : 0;

    const quantidade = Number(qtd.value) || 0;
    const total = preco * quantidade;

    valorUnit.value = formatarMoeda(preco);
    valorTotal.value = formatarMoeda(total);

}

function salvarMovimentacao(){

    const contratoAtivo = obterContratoAtivo();

    if(!contratoAtivo){
        mostrarToast("Não existe contrato ativo para lançar movimentação.", "erro");
        return;
    }

    const contrato = contratoAtivo.numero;
    const data = document.getElementById("movData").value;
    const nf = document.getElementById("movNf").value.trim();
    const item = document.getElementById("movItem").value;
    const quantidade = document.getElementById("movQtd").value;

    if(contrato === "" || data === "" || nf === "" || item === "" || quantidade === ""){
        mostrarToast("Preencha todos os campos da movimentação.", "erro");
        return;
    }

    const itemSelecionado = obterItensUnidade().find(function(i){
        return i.descricao === item;
    });

    const valorUnitario = itemSelecionado
        ? converterMoedaParaNumero(itemSelecionado.valor)
        : 0;

    const valorTotal = valorUnitario * Number(quantidade);

    const movimentacao = {
        contrato: contrato,
        unidade: obterUnidadeAtual(),
        data: data,
        mes: obterMes(data),
        nf: nf,
        item: item,
        quantidade: Number(quantidade),
        valorUnitario: valorUnitario,
        valorTotal: valorTotal
    };

    movimentacoes.push(movimentacao);

    salvarDados();

    atualizarTabelaMovimentacoes();

    mostrarToast("Movimentação salva com sucesso!", "sucesso");

    limparFormularioMovimentacao();

}

function atualizarTabelaMovimentacoes(){

    const tabela = document.getElementById("listaMovimentacoes");

    if(!tabela) return;

    tabela.innerHTML = "";

    const movimentacoesUnidade = movimentacoes
        .map(function(mov, indice){
            return {
                mov: mov,
                indice: indice
            };
        })
        .filter(function(item){
            return pertenceUnidadeAtual(item.mov);
        });

    if(movimentacoesUnidade.length === 0){

        tabela.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;color:#888">
                    Nenhuma movimentação cadastrada.
                </td>
            </tr>
        `;

        return;
    }

    movimentacoesUnidade.slice().reverse().forEach(function(item){

    const mov = item.mov;

        tabela.innerHTML += `
            <tr>
                <td>${mov.contrato}</td>
                <td>${formatarData(mov.data)}</td>
                <td>${mov.mes}</td>
                <td>${mov.nf || "-"}</td>
                <td>${mov.item}</td>
                <td>${mov.quantidade}</td>
                <td>${formatarMoeda(mov.valorTotal)}</td>
                <td>
                    <button class="btnExcluir" onclick="excluirMovimentacao(${item.indice})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;

    });

}

async function excluirMovimentacao(indice){

    const movimentacao = movimentacoes[indice];

    if(await abrirConfirmacaoExclusao(
        "Excluir movimentação?",
        "O lançamento será removido dos totais, relatórios e gráficos.",
        movimentacao ? `${movimentacao.item} • ${formatarData(movimentacao.data)}` : "Movimentação selecionada"
    )){

        movimentacoes.splice(indice,1);

        salvarDados();

        atualizarTabelaMovimentacoes();

        mostrarToast("Movimentação excluída.", "erro");

    }

}

function limparFormularioMovimentacao(){

    document.getElementById("movNf").value = "";
    document.getElementById("movItem").value = "";
    document.getElementById("movQtd").value = "";
    document.getElementById("movValorUnit").value = "";
    document.getElementById("movValorTotal").value = "";

    preencherDataHoje();

}

function formatarMoeda(valor){

    return Number(valor).toLocaleString("pt-BR",{
        style:"currency",
        currency:"BRL"
    });

}

function formatarData(data){

    const partes = data.split("-");

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}

function obterMes(data){

    const meses = [
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro"
    ];

    const mes = Number(data.split("-")[1]) - 1;

    return meses[mes];

}

function calcularRankingItens(lista){

    const ranking = {};

    lista.forEach(function(mov){

        const nome = mov.item || "Item sem nome";

        if(!ranking[nome]){
            ranking[nome] = {
                nome: nome,
                valor: 0,
                quantidade: 0
            };
        }

        ranking[nome].valor += Number(mov.valorTotal) || 0;
        ranking[nome].quantidade += Number(mov.quantidade) || 0;

    });

    const total = Object.values(ranking).reduce(function(soma, item){
        return soma + item.valor;
    }, 0);

    const itensOrdenados = Object.values(ranking)
        .sort(function(a, b){
            if(b.valor === a.valor){
                return b.quantidade - a.quantidade;
            }

            return b.valor - a.valor;
        })
        .slice(0, 5);

    return {
        total: total,
        itens: itensOrdenados
    };

}

function atualizarTopItens(lista){

    const container = document.getElementById("listaTopItens");

    if(!container) return;

    const ranking = calcularRankingItens(lista);

    container.innerHTML = "";

    if(ranking.total <= 0 || ranking.itens.length === 0){

        container.innerHTML = `
            <div class="top-itens-vazio">
                Nenhum consumo registrado.
            </div>
        `;

        return;

    }

    ranking.itens.forEach(function(item){

        const percentual = (item.valor / ranking.total) * 100;
        const largura = Math.max(percentual, 3);
        const percentualTexto = percentual > 0 && percentual < 1
            ? "&lt;1%"
            : percentual.toFixed(0) + "%";

        container.innerHTML += `
            <div class="top-item">
                <div class="top-item-linha">
                    <div class="top-item-info">
                        <span>${item.nome}</span>
                        <small>${formatarMoeda(item.valor)} - ${item.quantidade} un.</small>
                    </div>
                    <strong class="top-item-percentual">${percentualTexto}</strong>
                </div>

                <div class="top-item-barra">
                    <div style="width:${largura}%"></div>
                </div>
            </div>
        `;

    });

}

function limparFormularioMovimentacao(){

    document.getElementById("movNf").value = "";
    document.getElementById("movItem").value = "";
    document.getElementById("movQtd").value = "";
    document.getElementById("movValorUnit").value = "";
    document.getElementById("movValorTotal").value = "";

    preencherDataHoje();

}

function preencherDataHoje(){

    const campoData = document.getElementById("movData");

    if(!campoData) return;

    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2,"0");
    const dia = String(hoje.getDate()).padStart(2,"0");

    campoData.value = `${ano}-${mes}-${dia}`;

}

function salvarDados(){

    localStorage.setItem("contratos", JSON.stringify(contratos));
    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
    localStorage.setItem("itens", JSON.stringify(itens));
    agendarSalvamentoOnline();

}

async function carregarDados(){

    try{

        const carregouOnline = await carregarDadosOnline();

        if(carregouOnline){
            localStorage.setItem("contratos", JSON.stringify(contratos));
            localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
            localStorage.setItem("itens", JSON.stringify(itens));
            return;
        }

    }catch(erro){

        bancoOnlineAtivo = false;

    }

    aplicarEstado({
        contratos: JSON.parse(localStorage.getItem("contratos")) || [],
        movimentacoes: JSON.parse(localStorage.getItem("movimentacoes")) || [],
        itens: JSON.parse(localStorage.getItem("itens")) || []
    });

}

async function inicializarApp(){

    localStorage.setItem("unidadeSelecionada", unidadeSelecionada);
    atualizarIdentidadeTopo("inicio");
    atualizarTopoUnidade();

    await carregarDados();
    migrarRegistrosSemUnidade(unidadeSelecionada);
    salvarDados();
    carregarPagina("inicio");
    atualizarTopoUnidade();

    if(obterSupabaseConfigurado() && !bancoOnlineAtivo){
        salvarDadosOnline().catch(function(){
            mostrarToast("Banco online configurado, mas a sincronização falhou.", "aviso");
        });
    }

}

function atualizarDashboard(){

    const contratoAtivo = obterContratoAtivo();

    const elContrato = document.getElementById("painelContrato");
    const elVigencia = document.getElementById("painelVigencia");
    const elCliente = document.getElementById("painelCliente");
    const elFornecedor = document.getElementById("painelFornecedor");
    const elOrcamento = document.getElementById("dashOrcamento");
    const elUtilizado = document.getElementById("dashUtilizado");
    const elSaldo = document.getElementById("dashSaldo");
    const barraUso = document.getElementById("barraUso");
    const percentualUso = document.getElementById("percentualUso");
    const tabela = document.getElementById("dashUltimasMov");

    if(!elContrato) return;

    if(!contratoAtivo){

        elContrato.textContent = "Nenhum contrato ativo";
        elVigencia.textContent = "-";
        elCliente.textContent = "-";
        elFornecedor.textContent = "-";
        elOrcamento.textContent = formatarMoeda(0);
        elUtilizado.textContent = formatarMoeda(0);
        elSaldo.textContent = formatarMoeda(0);
        barraUso.style.width = "0%";
        percentualUso.textContent = "0% utilizado";
        atualizarTopItens([]);
        const status = document.querySelector(".card-contrato .statusAtivo");

        if(status){
        status.textContent = "Sem contrato";
        status.className = "statusSemContrato";
    }

        return;
}

    const orcamento = converterMoedaParaNumero(contratoAtivo.valor);

    const utilizado = obterMovimentacoesUnidade()
        .filter(m => m.contrato === contratoAtivo.numero)
        .reduce((total, m) => total + Number(m.valorTotal), 0);

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    const movimentacoesAno = obterMovimentacoesUnidade().filter(function(mov){
        return Number(String(mov.data || "").split("-")[0]) === anoAtual;
    });

    const movimentacoesMes = movimentacoesAno.filter(function(mov){
        return Number(mov.data.split("-")[1]) === mesAtual;
    });

    const consumoMes = movimentacoesMes
    .reduce(function(total, mov){
        return total + Number(mov.valorTotal);
    }, 0);

    const qtdMovimentada = movimentacoesMes.reduce(function(total, mov){
    return total + Number(mov.quantidade);
}, 0);

    const totalMovimentacoes = movimentacoesMes.length;

    atualizarTopItens(movimentacoesAno);

    const saldo = orcamento - utilizado;

    const percentual = orcamento > 0
        ? Math.min((utilizado / orcamento) * 100, 100)
        : 0;

    const dadosContrato = normalizarContrato(contratoAtivo);

    elContrato.textContent = dadosContrato.numero;
    elCliente.textContent = dadosContrato.cliente;
    elFornecedor.textContent = dadosContrato.fornecedor;

    const status = document.querySelector(".card-contrato .statusSemContrato, .card-contrato .statusAtivo");

    if(status){
        status.textContent = "Ativo";
        status.className = "statusAtivo";
}

    elVigencia.textContent =
        `${formatarData(dadosContrato.inicio)} até ${formatarData(dadosContrato.fim)}`;

    elOrcamento.textContent = formatarMoeda(orcamento);
    elUtilizado.textContent = formatarMoeda(utilizado);
    elSaldo.textContent = formatarMoeda(saldo);

    document.getElementById("dashConsumoMes").textContent = formatarMoeda(consumoMes);
    document.getElementById("dashQtdMovimentada").textContent = qtdMovimentada;
    document.getElementById("dashTotalMovimentacoes").textContent = totalMovimentacoes;
    atualizarMetricasPorContrato(movimentacoesMes, movimentacoesAno);
    const nomeMesAtual = new Intl.DateTimeFormat("pt-BR", { month: "long" })
        .format(hoje)
        .toUpperCase();
    document.querySelectorAll(".dashMesReferencia").forEach(function(elemento){
        elemento.textContent = nomeMesAtual;
    });
    document.getElementById("graficoAnoReferencia").textContent = `Hist\u00f3rico consolidado de ${anoAtual}`;

    barraUso.style.width = percentual + "%";
    barraUso.classList.remove(
    "barraNormal",
    "barraAlerta",
    "barraCritica"
);

if(percentual >= 90){

    barraUso.classList.add("barraCritica");

}else if(percentual >= 70){

    barraUso.classList.add("barraAlerta");

}else{

    barraUso.classList.add("barraNormal");

}
    percentualUso.textContent = percentual.toFixed(1) + "% utilizado";

    const ultimas = movimentacoesAno
        .slice(-5)
        .reverse();

    tabela.innerHTML = "";

    if(ultimas.length === 0){

        tabela.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;color:#888">
                    Nenhuma movimentação cadastrada.
                </td>
            </tr>
        `;

        return;
    }

    ultimas.forEach(function(mov){

        tabela.innerHTML += `
            <tr>
                <td>${formatarData(mov.data)}</td>
                <td><span class="contrato-tag">${mov.contrato || "-"}</span></td>
                <td>${mov.nf || "-"}</td>
                <td>${mov.item}</td>
                <td>${mov.quantidade}</td>
                <td>${formatarMoeda(mov.valorTotal)}</td>
            </tr>
        `;

    });


    const resumo = document.getElementById("resumoItens");

    atualizarGraficoMensal();

}

const CORES_CONTRATOS = ["#175EA8", "#0F9D8A", "#D97706", "#7C3AED", "#DC4C64", "#475569"];
const contratosMetricasOcultos = new Set();
let ultimosTotaisMetricas = [];

function atualizarMetricasPorContrato(movimentacoesMes, movimentacoesAno){

    const contratos = [...new Set(movimentacoesAno.map(function(mov){
        return mov.contrato || "Sem contrato";
    }))];

    const totais = contratos.map(function(contrato, indice){
        const movimentos = movimentacoesMes.filter(function(mov){
            return (mov.contrato || "Sem contrato") === contrato;
        });

        return {
            contrato: contrato,
            cor: CORES_CONTRATOS[indice % CORES_CONTRATOS.length],
            valor: movimentos.reduce(function(total, mov){
                return total + Number(mov.valorTotal || 0);
            }, 0),
            quantidade: movimentos.reduce(function(total, mov){
                return total + Number(mov.quantidade || 0);
            }, 0),
            movimentacoes: movimentos.length
        };
    }).filter(function(item){
        return item.movimentacoes > 0;
    });

    if(totais.length <= 1){
        contratosMetricasOcultos.clear();
    }

    ultimosTotaisMetricas = totais;
    atualizarTotaisVisiveisMetricas();

    preencherMetricaPorContrato("dashConsumoPorContrato", totais, function(item){
        return formatarMoeda(item.valor);
    });
    preencherMetricaPorContrato("dashQuantidadePorContrato", totais, function(item){
        return item.quantidade;
    });
    preencherMetricaPorContrato("dashMovimentacoesPorContrato", totais, function(item){
        return item.movimentacoes;
    });

}

function preencherMetricaPorContrato(elementoId, totais, formatarValor){

    const elemento = document.getElementById(elementoId);
    if(!elemento) return;

    elemento.hidden = totais.length <= 1;

    if(elemento.hidden){
        elemento.innerHTML = "";
        return;
    }

    elemento.innerHTML = totais.length
        ? totais.map(function(item, indice){
            const oculto = contratosMetricasOcultos.has(item.contrato);
            return `<button type="button" class="metrica-contrato-item${oculto ? " contrato-desconsiderado" : ""}" data-contrato-metrica="${indice}" title="${oculto ? "Considerar" : "Desconsiderar"} este contrato">
                <i class="metrica-contrato-cor" style="background:${item.cor}"></i>
                ${item.contrato}: <strong>${formatarValor(item)}</strong>
            </button>`;
        }).join("")
        : `<span class="metrica-contrato-item">Sem movimenta&ccedil;&otilde;es no m&ecirc;s.</span>`;

}

function atualizarTotaisVisiveisMetricas(){

    const visiveis = ultimosTotaisMetricas.filter(function(item){
        return !contratosMetricasOcultos.has(item.contrato);
    });

    const valor = visiveis.reduce(function(total, item){ return total + item.valor; }, 0);
    const quantidade = visiveis.reduce(function(total, item){ return total + item.quantidade; }, 0);
    const movimentacoes = visiveis.reduce(function(total, item){ return total + item.movimentacoes; }, 0);

    document.getElementById("dashConsumoMes").textContent = formatarMoeda(valor);
    document.getElementById("dashQtdMovimentada").textContent = quantidade;
    document.getElementById("dashTotalMovimentacoes").textContent = movimentacoes;

}

document.addEventListener("click", function(e){

    const botao = e.target.closest("[data-contrato-metrica]");
    if(!botao) return;

    const item = ultimosTotaisMetricas[Number(botao.dataset.contratoMetrica)];
    if(!item) return;

    if(contratosMetricasOcultos.has(item.contrato)){
        contratosMetricasOcultos.delete(item.contrato);
    }else{
        contratosMetricasOcultos.add(item.contrato);
    }

    atualizarTotaisVisiveisMetricas();
    atualizarMetricasPorContratoVisual();

});

function atualizarMetricasPorContratoVisual(){

    preencherMetricaPorContrato("dashConsumoPorContrato", ultimosTotaisMetricas, function(item){
        return formatarMoeda(item.valor);
    });
    preencherMetricaPorContrato("dashQuantidadePorContrato", ultimosTotaisMetricas, function(item){
        return item.quantidade;
    });
    preencherMetricaPorContrato("dashMovimentacoesPorContrato", ultimosTotaisMetricas, function(item){
        return item.movimentacoes;
    });

}

function converterMoedaParaNumero(valor){

    if(typeof valor === "number") return valor;

    return Number(
        valor
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
    ) || 0;

}

document.addEventListener("click", function(e){

    const botao = e.target.closest("#btnSalvarItem");

    if(botao){

        salvarItem();

    }

});

function atualizarGraficoMensal(){

    const canvas = document.getElementById("graficoMensal");

    if(!canvas) return;

    const meses = [
        "Janeiro","Fevereiro","Março","Abril",
        "Maio","Junho","Julho","Agosto",
        "Setembro","Outubro","Novembro","Dezembro"
    ];

    const anoAtual = new Date().getFullYear();
    const movimentosAno = obterMovimentacoesUnidade().filter(function(mov){
        return Number(String(mov.data || "").split("-")[0]) === anoAtual;
    });
    const contratosAno = [...new Set(movimentosAno.map(function(mov){
        return mov.contrato || "Sem contrato";
    }))];
    const datasets = contratosAno.map(function(contrato, indice){
        const valores = new Array(12).fill(0);

        movimentosAno.forEach(function(mov){
            if((mov.contrato || "Sem contrato") !== contrato) return;
            const mes = Number(String(mov.data || "").split("-")[1]) - 1;
            if(mes >= 0 && mes < 12){
                valores[mes] += Number(mov.valorTotal || 0);
            }
        });

        return {
            label:contrato,
            data:valores,
            backgroundColor:CORES_CONTRATOS[indice % CORES_CONTRATOS.length],
            borderRadius:6,
            borderSkipped:false,
            barThickness:28
        };
    });

    if(graficoMensal){

        graficoMensal.destroy();

    }

    graficoMensal = new Chart(canvas,{

    type:"bar",

    plugins:[ChartDataLabels],

    data:{

        labels:meses,

        datasets:datasets

    },

    options:{

        responsive:true,
        maintainAspectRatio:false,

        plugins:{

    legend:{
        display:true,
        position:"bottom",
        labels:{
            usePointStyle:true,
            boxWidth:9,
            padding:18,
            font:{weight:"600"}
        }
    },

    tooltip:{
        callbacks:{
            label:function(context){

                return context.dataset.label + ": " +
                    context.raw.toLocaleString("pt-BR",{
                        style:"currency",
                        currency:"BRL"
                    });

            }
        }
    },

    datalabels:{

        anchor:"end",
        align:"end",
        offset:-4,
        clip:false,
        clamp:true,

        formatter:function(value){

            if(!value) return "";

            return value.toLocaleString("pt-BR",{
                style:"currency",
                currency:"BRL"
            });

        },

        font:{
            weight:"bold",
            size:11
        }

    }

},

        scales:{

            y:{
                display:false,
                beginAtZero:true,
                stacked:true,
                grid:{
                    display:false
                }
            },

            x:{
                stacked:true,
                grid:{
                    display:false
                }
            }

        }

    }

});

}

function salvarItem(){

    const descricao = document.getElementById("txtItemDescricao").value.trim();
    const valor = document.getElementById("txtItemValor").value.trim();

    if(descricao === "" || valor === ""){
        mostrarToast("Preencha todos os campos.", "erro");
        return;
    }

    const existe = itens.some(function(item, indice){
        return item.descricao.toUpperCase() === descricao.toUpperCase()
            && pertenceUnidadeAtual(item)
            && indice !== itemEditando;
    });

    if(existe){
        mostrarToast("Este item já existe.", "erro");
        return;
    }

    if(itemEditando !== null){

        itens[itemEditando].descricao = descricao.toUpperCase();
        itens[itemEditando].valor = valor;

        salvarDados();
        atualizarTabelaItens();

        itemEditando = null;

        document.getElementById("btnCancelarItem").style.display = "none";
        document.getElementById("btnSalvarItem").innerHTML = `
            <i class="fa-solid fa-floppy-disk"></i>
            Salvar Item
        `;

        document.getElementById("txtItemDescricao").value = "";
        document.getElementById("txtItemValor").value = "";

        mostrarToast("Item atualizado com sucesso!", "sucesso");

        return;
    }

    itens.push({
        descricao: descricao.toUpperCase(),
        valor: valor,
        unidade: obterUnidadeAtual(),
        status: "Ativo"
    });

    salvarDados();
    atualizarTabelaItens();

    document.getElementById("txtItemDescricao").value = "";
    document.getElementById("txtItemValor").value = "";

    mostrarToast("Item cadastrado com sucesso!", "sucesso");

}

function atualizarTabelaItens(){

    const tabela = document.getElementById("listaItens");

    if(!tabela) return;

    tabela.innerHTML = "";

    const itensUnidade = itens
        .map(function(item, indice){
            return {
                item: item,
                indice: indice
            };
        })
        .filter(function(registro){
            return pertenceUnidadeAtual(registro.item);
        });

    if(itensUnidade.length === 0){

        tabela.innerHTML = `

        <tr>

            <td colspan="4" style="text-align:center;color:#888">

                Nenhum item cadastrado.

            </td>

        </tr>

        `;

        return;

    }

    itensUnidade.forEach(function(registro){

    const item = registro.item;

    tabela.innerHTML += `

    <tr>

        <td>${item.descricao}</td>

        <td>${item.valor}</td>

        <td>
            <span class="statusAtivo">
                ${item.status}
            </span>
        </td>

        <td class="colAcoes">

            <button class="btnEditar" onclick="editarItem(${registro.indice})">
                <i class="fa-solid fa-pen"></i>
            </button>

            <button class="btnExcluir" onclick="excluirItem(${registro.indice})">
                <i class="fa-solid fa-trash"></i>
            </button>

        </td>

    </tr>

    `;

});

}

async function excluirItem(indice){

    const item = itens[indice];

    if(await abrirConfirmacaoExclusao(
        "Excluir item?",
        "O item será removido da lista de opções para novos lançamentos.",
        item ? item.descricao : "Item selecionado"
    )){

        itens.splice(indice,1);

        salvarDados();

        atualizarTabelaItens();

        mostrarToast("Item excluído.","erro");

    }

}

document.addEventListener("input", function(e){

    if(e.target.id === "txtItemDescricao"){

        e.target.value = e.target.value
            .replace(/[^A-Za-zÀ-ÿ0-9/.\s]/g, "")
            .toUpperCase();

    }

});

document.addEventListener("input", function(e){

    if(e.target.id === "txtItemValor"){

        let valor = e.target.value.replace(/\D/g,"");

        valor = (Number(valor) / 100).toLocaleString("pt-BR",{
            style:"currency",
            currency:"BRL"
        });

        e.target.value = valor;

    }

});

function carregarItensMovimentacao(){

    const select = document.getElementById("movItem");

    if(!select) return;

    select.innerHTML = `<option value="">Selecione...</option>`;

    obterItensUnidade().forEach(function(item){

        if(item.status === "Ativo"){

            select.innerHTML += `
                <option value="${item.descricao}">
                    ${item.descricao}
                </option>
            `;

        }

    });

}

function carregarContratoAtivoMovimentacao(){

    const contratoAtivo = obterContratoAtivo();

    const numero = document.getElementById("movContratoAtual");
    const vigencia = document.getElementById("movContratoVigencia");
    const cliente = document.getElementById("movContratoCliente");
    const fornecedor = document.getElementById("movContratoFornecedor");
    const status = document.getElementById("movContratoStatus");

    if(!numero || !vigencia || !status) return;

    if(!contratoAtivo){

        numero.textContent = "Nenhum contrato ativo";
        vigencia.textContent = "-";
        if(cliente) cliente.textContent = "Cliente: -";
        if(fornecedor) fornecedor.textContent = "Fornecedor: -";
        status.textContent = "Sem contrato";
        status.className = "statusSemContrato";

        return;

    }

    const dadosContrato = normalizarContrato(contratoAtivo);

    numero.textContent = dadosContrato.numero;
    vigencia.textContent = `${formatarData(dadosContrato.inicio)} até ${formatarData(dadosContrato.fim)}`;
    if(cliente) cliente.textContent = `Cliente: ${dadosContrato.cliente}`;
    if(fornecedor) fornecedor.textContent = `Fornecedor: ${dadosContrato.fornecedor}`;
    status.textContent = "Ativo";
    status.className = "statusAtivo";

}

function editarItem(indice){

    const item = itens[indice];

    itemEditando = indice;

    definirFormularioAberto("formItem", true);

    document.getElementById("txtItemDescricao").value = item.descricao;
    document.getElementById("txtItemValor").value = item.valor;

    document.getElementById("btnSalvarItem").innerHTML = `
        <i class="fa-solid fa-pen"></i>
        Atualizar Item
    `;

    document.getElementById("btnCancelarItem").style.display = "inline-flex";

    mostrarToast("Modo de edição ativado.", "aviso");

}

function cancelarEdicaoItem(){

    itemEditando = null;

    document.getElementById("txtItemDescricao").value = "";
    document.getElementById("txtItemValor").value = "";

    document.getElementById("btnSalvarItem").innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Salvar Item
    `;

    document.getElementById("btnCancelarItem").style.display = "none";

    document.getElementById("txtItemDescricao").focus();

    mostrarToast("Edição cancelada.", "aviso");

}


function carregarFiltrosRelatorio(){

    const selectContrato = document.getElementById("relContrato");
    const selectItem = document.getElementById("relItem");

    if(!selectContrato || !selectItem) return;

    selectContrato.innerHTML = `<option value="">Todos</option>`;
    selectItem.innerHTML = `<option value="">Todos</option>`;

    obterContratosUnidade().forEach(function(contrato){

        selectContrato.innerHTML += `
            <option value="${contrato.numero}">
                ${contrato.numero}
            </option>
        `;

    });

    obterItensUnidade().forEach(function(item){

        selectItem.innerHTML += `
            <option value="${item.descricao}">
                ${item.descricao}
            </option>
        `;

    });

}

function gerarRelatorio(){

    const dataInicio = document.getElementById("relDataInicio").value;
    const dataFim = document.getElementById("relDataFim").value;
    const contrato = document.getElementById("relContrato").value;
    const item = document.getElementById("relItem").value;

    let resultado = obterMovimentacoesUnidade().slice();

    if(dataInicio !== ""){

        resultado = resultado.filter(function(mov){
            return mov.data >= dataInicio;
        });

    }

    if(dataFim !== ""){

        resultado = resultado.filter(function(mov){
            return mov.data <= dataFim;
        });

    }

    if(contrato !== ""){

        resultado = resultado.filter(function(mov){
            return mov.contrato === contrato;
        });

    }

    if(item !== ""){

        resultado = resultado.filter(function(mov){
            return mov.item === item;
        });

    }

    atualizarResumoRelatorio(resultado);

    atualizarTabelaRelatorio(resultado);
    
    ultimoRelatorio = resultado;

}

function atualizarResumoRelatorio(lista){

    const total = lista.reduce(function(soma, mov){
        return soma + Number(mov.valorTotal);
    }, 0);

    const quantidadeTotal = lista.reduce(function(soma, mov){
        return soma + Number(mov.quantidade);
    }, 0);

    const itensDiferentes = new Set(lista.map(function(mov){
        return mov.item;
    }));

    document.getElementById("relTotal").textContent = formatarMoeda(total);
    document.getElementById("relQtdMov").textContent = lista.length;
    document.getElementById("relQtdItens").textContent = itensDiferentes.size;
    document.getElementById("relQtdTotal").textContent = quantidadeTotal;

}

function atualizarTabelaRelatorio(lista){

    const tabela = document.getElementById("listaRelatorio");

    tabela.innerHTML = "";

    if(lista.length === 0){

        tabela.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;color:#888">
                    Nenhum resultado encontrado.
                </td>
            </tr>
        `;

        return;

    }

    lista.reverse().forEach(function(mov){

        const cliente = obterClienteContrato(mov.contrato);

        tabela.innerHTML += `
            <tr>
                <td>${formatarData(mov.data)}</td>
                <td>${mov.contrato}</td>
                <td class="contrato-cliente">${cliente}</td>
                <td>${mov.nf || "-"}</td>
                <td>${mov.item}</td>
                <td>${mov.quantidade}</td>
                <td>${formatarMoeda(mov.valorTotal)}</td>
            </tr>
        `;

    });

}

let graficoItens = null;

function atualizarGraficoItens(){

    const canvas = document.getElementById("graficoItens");

    if(!canvas) return;

    const contratoAtivo = obterContratoAtivo();

    if(!contratoAtivo) return;

    const movimentacoesContrato = obterMovimentacoesUnidade().filter(function(mov){

        return mov.contrato === contratoAtivo.numero;

    });

    const consumo = {};

    movimentacoesContrato.forEach(function(mov){

        if(!consumo[mov.item]){

            consumo[mov.item] = 0;

        }

        consumo[mov.item] += Number(mov.valorTotal);

    });

    const labels = Object.keys(consumo);
    const valores = Object.values(consumo);

    if(graficoItens){

        graficoItens.destroy();

    }

    graficoItens = new Chart(canvas,{

        type:"doughnut",

        data:{

            labels:labels,

            datasets:[{

                data:valores

            }]

        },

        options:{

            responsive:true,

            plugins:{

                legend:{
                    position:"bottom"
                }

            }

        }
        

    });

const resumo = document.getElementById("resumoItens");

if(resumo){

    resumo.innerHTML = "";

    labels.forEach(function(label, indice){

        resumo.innerHTML += `
            <div class="resumo-item">
                <span>${label}</span>
                <strong>${formatarMoeda(valores[indice])}</strong>
            </div>
        `;

    });

}

}

document.addEventListener("click", function(e){

    const botao = e.target.closest("#btnExportarExcel");

    if(botao){
        exportarExcel();
    }

});

function exportarExcel(){

    if(ultimoRelatorio.length === 0){
        mostrarToast("Gere um relatório antes de exportar.", "erro");
        return;
    }

    const dados = ultimoRelatorio.map(function(mov){

        return {
            "Data": formatarData(mov.data),
            "Contrato": mov.contrato,
            "Cliente": obterClienteContrato(mov.contrato),
            "NF": mov.nf || "",
            "Item": mov.item,
            "Quantidade": Number(mov.quantidade),
            "Valor Unitário": Number(mov.valorUnitario),
            "Valor Total": Number(mov.valorTotal)
        };

    });

    const planilha = XLSX.utils.json_to_sheet(dados);

    planilha["!cols"] = [
        { wch: 14 },
        { wch: 16 },
        { wch: 22 },
        { wch: 18 },
        { wch: 30 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 }
    ];

    const intervalo = XLSX.utils.decode_range(planilha["!ref"]);

    for(let linha = 1; linha <= intervalo.e.r; linha++){

        const celValorUnit = XLSX.utils.encode_cell({ r: linha, c: 6 });
        const celValorTotal = XLSX.utils.encode_cell({ r: linha, c: 7 });

        if(planilha[celValorUnit]){
            planilha[celValorUnit].z = '"R$" #,##0.00';
        }

        if(planilha[celValorTotal]){
            planilha[celValorTotal].z = '"R$" #,##0.00';
        }

    }

    planilha["!autofilter"] = {
        ref: planilha["!ref"]
    };

    const arquivo = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(arquivo, planilha, "Relatório GLP");

    XLSX.writeFile(arquivo, "relatorio_glp.xlsx");

    mostrarToast("Excel exportado com sucesso!", "sucesso");

}
