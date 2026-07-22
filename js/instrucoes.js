(function(){
    const STORAGE_KEY = "controle-instrucao-simple-v2-real-ta";
    const BIM_STORAGE_KEY = "controle-instrucao-bim-importado-v1";
    const OLD_KEYS = ["controle-instrucao-registros-v2", "controle-instrucao-bim-v1"];

    let estado = null;
    let elementos = null;
    let timerTempo = null;
    let graficoStatusInstrucao = null;

    window.inicializarControleInstrucao = function(){
        if(!document.querySelector(".instrucao-modulo")) return;

        estado = {
            registros: carregarRegistros(),
            registrosBim: carregarRegistrosBim(),
            veiculoAtual: "Em transito",
            prioridadeAtual: "Normal",
            tipoDocumento: "DTA",
            filtro: "all",
            arquivoCsv: null,
            arquivoTa: null
        };

        elementos = {
            total: document.getElementById("instrucaoTotal"),
            pendentes: document.getElementById("instrucaoPendentes"),
            emails: document.getElementById("instrucaoEmails"),
            bim: document.getElementById("instrucaoBim"),
            criticas: document.getElementById("instrucaoCriticas"),
            recentes: document.getElementById("instrucaoRecentes"),
            recentesVazio: document.getElementById("instrucaoRecentesVazio"),
            historico: document.getElementById("instrucaoHistoricoTabela"),
            historicoVazio: document.getElementById("instrucaoHistoricoVazio"),
            formulario: document.getElementById("instrucaoFormulario"),
            pesquisa: document.getElementById("instrucaoPesquisa"),
            csv: document.getElementById("instrucaoCsv"),
            nomeArquivo: document.getElementById("instrucaoNomeArquivo"),
            dropzone: document.getElementById("instrucaoDropzone"),
            taArquivo: document.getElementById("instrucaoTaArquivo"),
            taNomeArquivo: document.getElementById("instrucaoTaNomeArquivo"),
            taDropzone: document.getElementById("instrucaoTaDropzone"),
            textoTa: document.getElementById("instrucaoTextoTa"),
            resultado: document.getElementById("instrucaoResultadoImportacao"),
            textoBim: document.getElementById("instrucaoTextoBim"),
            documento: document.getElementById("instrucaoDta"),
            documentoLabel: document.getElementById("instrucaoDocumentoLabel"),
            unidade: document.getElementById("instrucaoUnidade"),
            transporteSara: document.getElementById("instrucaoTransporteSara"),
            observacoes: document.getElementById("instrucaoObservacoes"),
            integracaoStatus: document.getElementById("instrucaoIntegracaoStatus"),
            botaoSubmit: document.querySelector("#instrucaoFormulario button[type='submit']"),
            tempoMedio: document.getElementById("instrucaoTempoMedio"),
            taxaBim: document.getElementById("instrucaoTaxaBim"),
            listaCritica: document.getElementById("instrucaoListaCritica"),
            graficoStatus: document.getElementById("instrucaoGraficoStatus")
        };

        vincularEventos();
        preencherUnidadePadrao();
        renderizar();
        iniciarContadorTempo();
    };

    function vincularEventos(){
        document.querySelectorAll("[data-instrucao-tab]").forEach(function(botao){
            botao.addEventListener("click", function(){
                abrirAba(botao.dataset.instrucaoTab);
            });
        });

        document.querySelectorAll("[data-instrucao-atalho]").forEach(function(botao){
            botao.addEventListener("click", function(){
                abrirAba(botao.dataset.instrucaoAtalho);
            });
        });

        document.querySelectorAll("[data-instrucao-veiculo]").forEach(function(botao){
            botao.addEventListener("click", function(){
                definirVeiculo(botao.dataset.instrucaoVeiculo);
            });
        });

        document.querySelectorAll("[data-instrucao-prioridade]").forEach(function(botao){
            botao.addEventListener("click", function(){
                definirPrioridade(botao.dataset.instrucaoPrioridade);
            });
        });

        document.querySelectorAll("[data-instrucao-documento]").forEach(function(botao){
            botao.addEventListener("click", function(){
                definirTipoDocumento(botao.dataset.instrucaoDocumento);
            });
        });

        document.querySelectorAll("[data-instrucao-filtro]").forEach(function(botao){
            botao.addEventListener("click", function(){
                estado.filtro = botao.dataset.instrucaoFiltro;

                document.querySelectorAll("[data-instrucao-filtro]").forEach(function(item){
                    item.classList.toggle("ativo", item.dataset.instrucaoFiltro === estado.filtro);
                });

                renderizar();
            });
        });

        elementos.formulario.addEventListener("submit", salvarSolicitacao);
        elementos.pesquisa.addEventListener("input", renderizar);
        elementos.documento.addEventListener("input", tratarInputDocumento);

        document.getElementById("instrucaoExportarRelatorio").addEventListener("click", exportarRelatorio);
        document.getElementById("instrucaoImportarCsv").addEventListener("click", importarCsv);
        document.getElementById("instrucaoImportarTexto").addEventListener("click", importarTexto);

        const botaoImportarTa = document.getElementById("instrucaoImportarTa");
        if(botaoImportarTa) botaoImportarTa.addEventListener("click", importarArquivoTa);

        const botaoLerClipboardTa = document.getElementById("instrucaoLerClipboardTa");
        if(botaoLerClipboardTa) botaoLerClipboardTa.addEventListener("click", lerClipboardTa);

        const botaoImportarTextoTa = document.getElementById("instrucaoImportarTextoTa");
        if(botaoImportarTextoTa) botaoImportarTextoTa.addEventListener("click", importarTextoTa);

        elementos.csv.addEventListener("change", function(){
            estado.arquivoCsv = elementos.csv.files[0] || null;
            elementos.nomeArquivo.textContent = estado.arquivoCsv ? estado.arquivoCsv.name : "Nenhum arquivo selecionado";
        });

        if(elementos.taArquivo){
            elementos.taArquivo.addEventListener("change", function(){
                estado.arquivoTa = elementos.taArquivo.files[0] || null;
                elementos.taNomeArquivo.textContent = estado.arquivoTa ? estado.arquivoTa.name : "Nenhum arquivo selecionado";
            });
        }

        ["dragenter", "dragover"].forEach(function(nomeEvento){
            elementos.dropzone.addEventListener(nomeEvento, function(evento){
                evento.preventDefault();
                elementos.dropzone.classList.add("arrastando");
            });
        });

        ["dragleave", "drop"].forEach(function(nomeEvento){
            elementos.dropzone.addEventListener(nomeEvento, function(evento){
                evento.preventDefault();
                elementos.dropzone.classList.remove("arrastando");
            });
        });

        elementos.dropzone.addEventListener("drop", function(evento){
            estado.arquivoCsv = evento.dataTransfer.files[0] || null;
            elementos.nomeArquivo.textContent = estado.arquivoCsv ? estado.arquivoCsv.name : "Nenhum arquivo selecionado";
        });

        if(elementos.taDropzone){
            ["dragenter", "dragover"].forEach(function(nomeEvento){
                elementos.taDropzone.addEventListener(nomeEvento, function(evento){
                    evento.preventDefault();
                    elementos.taDropzone.classList.add("arrastando");
                });
            });

            ["dragleave", "drop"].forEach(function(nomeEvento){
                elementos.taDropzone.addEventListener(nomeEvento, function(evento){
                    evento.preventDefault();
                    elementos.taDropzone.classList.remove("arrastando");
                });
            });

            elementos.taDropzone.addEventListener("drop", function(evento){
                estado.arquivoTa = evento.dataTransfer.files[0] || null;
                elementos.taNomeArquivo.textContent = estado.arquivoTa ? estado.arquivoTa.name : "Nenhum arquivo selecionado";
            });
        }

        elementos.recentes.addEventListener("click", tratarAcaoTabela);
        elementos.historico.addEventListener("click", tratarAcaoTabela);
        definirTipoDocumento("DTA");
    }

    function abrirAba(aba){
        const mapa = {
            painel: "instrucaoPainel",
            solicitar: "instrucaoSolicitar",
            bim: "instrucaoBimPagina",
            historico: "instrucaoHistorico"
        };

        document.querySelectorAll(".instrucao-pagina").forEach(function(secao){
            secao.classList.toggle("ativo", secao.id === mapa[aba]);
        });

        document.querySelectorAll("[data-instrucao-tab]").forEach(function(botao){
            botao.classList.toggle("ativo", botao.dataset.instrucaoTab === aba);
        });
    }

    async function salvarSolicitacao(evento){
        evento.preventDefault();

        if(estado.tipoDocumento === "DTA" && normalizarDta(valor("#instrucaoDta")).length !== 9){
            mostrarToast("Preencha a DTA no formato 00/000000-0.", "erro");
            elementos.documento.focus();
            return;
        }

        if(documentoJaEnviado(estado.tipoDocumento, valor("#instrucaoDta"))){
            mostrarToast(`${estado.tipoDocumento} ja enviada. Verifique o historico antes de registrar novamente.`, "erro");
            elementos.documento.focus();
            return;
        }

        if(documentoJaPossuiInstrucaoBim(estado.tipoDocumento, valor("#instrucaoDta"))){
            mostrarToast(`${estado.tipoDocumento} ja possui instrucao cadastrada no BIM. Envio bloqueado.`, "erro");
            elementos.documento.focus();
            return;
        }

        const registro = {
            id: criarId(),
            codigo: criarCodigo(valor("#instrucaoDta")),
            dta: valor("#instrucaoDta"),
            tipoDocumento: estado.tipoDocumento,
            cliente: valor("#instrucaoCliente"),
            transportadora: valor("#instrucaoTransportadora") || "Nao informado",
            unidade: elementos.unidade ? elementos.unidade.value : obterUnidadeOperacional(),
            transporteSara: elementos.transporteSara ? elementos.transporteSara.value.trim() : "",
            veiculo: estado.veiculoAtual,
            prioridade: estado.prioridadeAtual,
            criadoEm: new Date().toISOString(),
            emailEm: "",
            emailFonte: "",
            bimEm: "",
            bimFonte: "",
            observacoes: elementos.observacoes ? elementos.observacoes.value.trim() : "",
            integracaoStatus: "Local",
            integracaoProtocolo: "",
            integracaoErro: ""
        };

        bloquearFormulario(true);

        estado.registros.unshift(registro);
        salvarRegistros();
        renderizar();

        abrirEmail(registro);
        bloquearFormulario(false);

        elementos.formulario.reset();
        preencherUnidadePadrao();
        definirTipoDocumento("DTA");
        definirVeiculo("Em transito");
        definirPrioridade("Normal");
        abrirAba("painel");
        mostrarToast("Solicitacao registrada localmente.", "sucesso");
    }

    function documentoJaEnviado(tipoDocumento, documento){
        const documentoNormalizado = normalizarDocumentoPorTipo(tipoDocumento, documento);

        return estado.registros.some(function(registro){
            const tipoRegistro = registro.tipoDocumento || "DTA";

            return tipoRegistro === tipoDocumento &&
                normalizarDocumentoPorTipo(tipoRegistro, registro.dta) === documentoNormalizado;
        });
    }

    function documentoJaPossuiInstrucaoBim(tipoDocumento, documento){
        const documentoNormalizado = normalizarDocumentoPorTipo(tipoDocumento, documento);

        return estado.registrosBim.some(function(registro){
            return gerarChavesDta(registro.documento).has(documentoNormalizado) ||
                normalizarDocumentoPorTipo(tipoDocumento, registro.documento) === documentoNormalizado;
        });
    }

    function renderizar(){
        renderizarMetricas();
        renderizarKpisExecutivos();
        renderizarGraficoStatus();
        renderizarListaCritica();
        renderizarRecentes();
        renderizarHistorico();
    }

    function iniciarContadorTempo(){
        clearInterval(timerTempo);

        timerTempo = setInterval(function(){
            if(!document.querySelector(".instrucao-modulo")){
                clearInterval(timerTempo);
                timerTempo = null;
                return;
            }

            renderizar();
        }, 1000);
    }

    function renderizarMetricas(){
        elementos.total.textContent = estado.registros.length;
        elementos.pendentes.textContent = estado.registros.filter(function(registro){
            return statusFinal(registro) === "pending";
        }).length;
        elementos.emails.textContent = estado.registros.filter(function(registro){
            return statusFinal(registro) === "email";
        }).length;
        elementos.bim.textContent = estado.registros.filter(function(registro){
            return statusFinal(registro) === "bim";
        }).length;
        elementos.criticas.textContent = estado.registros.filter(estaCritico).length;
    }

    function renderizarKpisExecutivos(){
        if(!elementos.tempoMedio || !elementos.taxaBim) return;

        const finalizados = estado.registros.filter(function(registro){
            return statusFinal(registro) !== "pending";
        });

        const totalSegundos = finalizados.reduce(function(total, registro){
            return total + segundosResposta(registro);
        }, 0);

        const media = finalizados.length ? Math.floor(totalSegundos / finalizados.length) : 0;
        const totalBim = estado.registros.filter(function(registro){
            return statusFinal(registro) === "bim";
        }).length;
        const taxa = estado.registros.length ? Math.round((totalBim / estado.registros.length) * 100) : 0;

        elementos.tempoMedio.textContent = formatarDuracao(media);
        elementos.taxaBim.textContent = `${taxa}% com instrução/BIM`;
    }

    function renderizarGraficoStatus(){
        if(!elementos.graficoStatus || typeof Chart === "undefined") return;

        const dados = [
            estado.registros.filter(function(registro){ return statusFinal(registro) === "pending"; }).length,
            estado.registros.filter(function(registro){ return statusFinal(registro) === "email"; }).length,
            estado.registros.filter(function(registro){ return statusFinal(registro) === "bim"; }).length,
            estado.registros.filter(estaCritico).length
        ];

        if(graficoStatusInstrucao){
            graficoStatusInstrucao.data.datasets[0].data = dados;
            graficoStatusInstrucao.update("none");
            return;
        }

        graficoStatusInstrucao = new Chart(elementos.graficoStatus, {
            type: "doughnut",
            data: {
                labels: ["Aguardando", "E-mail", "Instrução/BIM", "Criticas"],
                datasets: [{
                    data: dados,
                    backgroundColor: ["#D97706", "#116D9C", "#175EA8", "#DC2626"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            boxWidth: 10,
                            color: "#42526A",
                            font: {
                                weight: "bold"
                            }
                        }
                    }
                }
            }
        });
    }

    function renderizarListaCritica(){
        if(!elementos.listaCritica) return;

        const registros = estado.registros
            .filter(estaCritico)
            .sort(function(a, b){
                return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
            })
            .slice(0, 5);

        if(!registros.length){
            elementos.listaCritica.innerHTML = '<div class="instrucao-vazio">Nenhuma solicitação crítica.</div>';
            return;
        }

        elementos.listaCritica.innerHTML = registros.map(function(registro){
            return `
                <div class="instrucao-item-critico">
                    <div>
                        <strong>${escaparHtml(registro.dta)}</strong>
                        <span>${escaparHtml(registro.cliente)}</span>
                    </div>
                    <em>${tempoDecorrido(registro)}</em>
                </div>
            `;
        }).join("");
    }

    function renderizarRecentes(){
        const registros = estado.registros.slice(0, 8);

        elementos.recentes.innerHTML = registros.map(function(registro){
            return `
                <tr>
                    <td><strong>${escaparHtml(registro.dta)}</strong><br><small>${escaparHtml(registro.codigo)}</small></td>
                    <td>${escaparHtml(registro.cliente)}<br><small>${escaparHtml(registro.transportadora)} | ${escaparHtml(registro.unidade || "-")}</small></td>
                    <td>${badgeStatus(registro)}</td>
                    <td>${tempoDecorrido(registro)}</td>
                    <td>${acoes(registro)}</td>
                </tr>
            `;
        }).join("");

        elementos.recentesVazio.style.display = registros.length ? "none" : "block";
    }

    function renderizarHistorico(){
        const pesquisa = normalizarTexto(elementos.pesquisa.value);

        const registros = estado.registros.filter(function(registro){
            const texto = normalizarTexto(`${registro.codigo} ${registro.dta} ${registro.cliente} ${registro.transportadora}`);
            const status = statusFinal(registro);
            const porFiltro =
                estado.filtro === "all" ||
                (estado.filtro === "pending" && status === "pending") ||
                (estado.filtro === "email" && status === "email") ||
                (estado.filtro === "bim" && status === "bim");

            return porFiltro && texto.includes(pesquisa);
        });

        elementos.historico.innerHTML = registros.map(function(registro){
            return `
                <tr>
                    <td><span class="instrucao-codigo">${escaparHtml(registro.codigo)}</span></td>
                    <td><strong>${escaparHtml(registro.dta)}</strong><br><small>${escaparHtml(textoApi(registro))}</small></td>
                    <td>${escaparHtml(registro.cliente)}</td>
                    <td>${escaparHtml(registro.transportadora)}</td>
                    <td>${textoVeiculo(registro.veiculo)}<br><small>${escaparHtml(registro.prioridade || "Normal")} | ${escaparHtml(registro.unidade || "-")}</small></td>
                    <td>${formatarData(registro.criadoEm)}</td>
                    <td>${badgeStatus(registro)}</td>
                    <td>${tempoDecorrido(registro)}</td>
                </tr>
            `;
        }).join("");

        elementos.historicoVazio.style.display = registros.length ? "none" : "block";
    }

    function acoes(registro){
        return `
            <div class="instrucao-acoes-linha">
                <button class="instrucao-acao" title="Preparar e-mail" data-instrucao-acao="email-open" data-id="${registro.id}">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
                <button class="instrucao-acao" title="Marcar retorno por e-mail" data-instrucao-acao="email-ok" data-id="${registro.id}">
                    <i class="fa-solid fa-envelope"></i>
                </button>
                <button class="instrucao-acao" title="Marcar com instrução/BIM" data-instrucao-acao="bim-ok" data-id="${registro.id}">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="instrucao-acao perigo" title="Remover" data-instrucao-acao="delete" data-id="${registro.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    }

    async function tratarAcaoTabela(evento){
        const botao = evento.target.closest("[data-instrucao-acao]");

        if(!botao) return;

        const registro = estado.registros.find(function(item){
            return item.id === botao.dataset.id;
        });

        if(!registro) return;

        if(botao.dataset.instrucaoAcao === "email-open"){
            abrirEmail(registro);
            return;
        }

        if(botao.dataset.instrucaoAcao === "email-ok"){
            const confirmado = await confirmarAcao({
                titulo: "Marcar retorno por e-mail?",
                mensagem: `Tem certeza que deseja marcar ${registro.dta} como respondida por e-mail?`,
                confirmar: "Marcar e-mail",
                tipo: "azul",
                dataHora: {
                    label: "Data e hora da resposta",
                    valor: formatarDataHoraInput(registro.emailEm || new Date().toISOString())
                }
            });

            if(!confirmado) return;

            registro.emailEm = confirmado.dataHora;
            registro.emailFonte = "Baixa manual";
            salvarRegistros();
            renderizar();
            mostrarToast("Status de e-mail atualizado.", "sucesso");
        }

        if(botao.dataset.instrucaoAcao === "bim-ok"){
            const confirmado = await confirmarAcao({
                titulo: "Marcar com instrução/BIM?",
                mensagem: `Tem certeza que deseja marcar ${registro.dta} como processo com instrução ou cadastro no BIM?`,
                confirmar: "Marcar",
                tipo: "azul"
            });

            if(!confirmado) return;

            registro.bimEm = new Date().toISOString();
            registro.bimFonte = "Manual";
            salvarRegistros();
            renderizar();
            mostrarToast("Status de instrução/BIM atualizado.", "sucesso");
        }

        if(botao.dataset.instrucaoAcao === "delete"){
            const confirmado = await confirmarAcao({
                titulo: "Remover solicitação?",
                mensagem: `Tem certeza que deseja remover ${registro.dta}? Esta ação não pode ser desfeita.`,
                confirmar: "Remover",
                tipo: "perigo"
            });

            if(!confirmado) return;

            estado.registros = estado.registros.filter(function(item){
                return item.id !== registro.id;
            });
            salvarRegistros();
            renderizar();
            mostrarToast("Registro removido.", "erro");
        }
    }

    async function importarCsv(){
        if(!estado.arquivoCsv){
            mostrarToast("Selecione o CSV exportado do BIM.", "aviso");
            return;
        }

        const texto = await lerArquivoTexto(estado.arquivoCsv);
        aplicarImportacaoBim(texto, estado.arquivoCsv.name);
    }

    async function importarArquivoTa(){
        if(!estado.arquivoTa){
            mostrarToast("Selecione o arquivo exportado do TA.", "aviso");
            return;
        }

        if(typeof XLSX === "undefined"){
            mostrarToast("Biblioteca de Excel nao carregada.", "erro");
            return;
        }

        try{
            const linhas = await lerArquivoTa(estado.arquivoTa);
            const transportes = linhas
                .map(normalizarLinhaTa)
                .filter(function(item){
                    return item.documento || item.codigoTransporteTa || item.veiculo;
                });

            if(!transportes.length){
                mostrarToast("Nenhuma linha valida encontrada no arquivo do TA.", "aviso");
                return;
            }

            const importacao = aplicarImportacaoTa(transportes, estado.arquivoTa.name || "Arquivo TA");
            if(elementos.resultado){
                elementos.resultado.innerHTML = `
                    <strong>TA importado para o Controle de Instrução.</strong><br>
                    Linhas lidas: ${transportes.length}<br>
                    Novas pendências: ${importacao.criados}<br>
                    Atualizados: ${importacao.atualizados}<br>
                    Com instrução no TA: ${importacao.comInstrucao}<br>
                    Sem instrução: ${importacao.pendentes}<br>
                    Sem documento: ${importacao.semDocumento}
                `;
            }

            estado.arquivoTa = null;
            if(elementos.taArquivo) elementos.taArquivo.value = "";
            if(elementos.taNomeArquivo) elementos.taNomeArquivo.textContent = "Nenhum arquivo selecionado";

            mostrarToast("TA importado para a fila de instruções.", "sucesso");
        }catch(erro){
            mostrarToast(erro.message || "Falha ao importar arquivo do TA.", "erro");
        }
    }

    async function lerClipboardTa(){
        if(!navigator.clipboard || !navigator.clipboard.readText){
            mostrarToast("Leitura da area de transferencia nao esta disponivel neste navegador.", "erro");
            return;
        }

        try{
            const texto = await navigator.clipboard.readText();

            if(!texto.trim()){
                mostrarToast("A area de transferencia esta vazia.", "aviso");
                return;
            }

            if(elementos.textoTa){
                elementos.textoTa.value = texto;
            }

            await importarTextoTa();
        }catch(erro){
            mostrarToast("Nao foi possivel ler a area de transferencia. Cole o texto manualmente.", "aviso");
        }
    }

    async function importarTextoTa(){
        const texto = elementos.textoTa ? elementos.textoTa.value.trim() : "";

        if(!texto){
            mostrarToast("Cole ou copie os dados da grade do TA.", "aviso");
            return;
        }

        try{
            const linhas = parseTabelaTextoTa(texto);
            const transportes = linhas
                .map(normalizarLinhaTa)
                .filter(function(item){
                    return item.documento || item.codigoTransporteTa || item.veiculo;
                });

            if(!transportes.length){
                mostrarToast("Nenhuma linha valida encontrada no texto do TA.", "aviso");
                return;
            }

            const importacao = aplicarImportacaoTa(transportes, "Texto copiado do TA");
            if(elementos.resultado){
                elementos.resultado.innerHTML = `
                    <strong>TA copiado para o Controle de Instrução.</strong><br>
                    Linhas lidas: ${transportes.length}<br>
                    Novas pendências: ${importacao.criados}<br>
                    Atualizados: ${importacao.atualizados}<br>
                    Com instrução no TA: ${importacao.comInstrucao}<br>
                    Sem instrução: ${importacao.pendentes}<br>
                    Sem documento: ${importacao.semDocumento}
                `;
            }

            mostrarToast("TA copiado para a fila de instruções.", "sucesso");
        }catch(erro){
            mostrarToast(erro.message || "Falha ao importar texto do TA.", "erro");
        }
    }

    function parseTabelaTextoTa(texto){
        const linhas = String(texto || "")
            .replace(/\r/g, "")
            .split("\n")
            .map(function(linha){ return linha.trim(); })
            .filter(Boolean);

        if(linhas.length < 2) return [];

        const cabecalho = dividirLinhaTa(linhas[0]);
        const temCabecalho = cabecalho.some(function(coluna){
            return normalizarTexto(coluna).includes("veiculo") ||
                normalizarTexto(coluna).includes("documento") ||
                normalizarTexto(coluna).includes("transportadora");
        });

        const colunas = temCabecalho ? cabecalho : [
            "Veiculo",
            "Reboque",
            "Transportadora",
            "Procedencia",
            "Conteineres",
            "Origem",
            "Prazo Siscomex",
            "Chegada Prevista",
            "Chega em",
            "Trans. Simplif."
        ];

        const dados = temCabecalho ? linhas.slice(1) : linhas;

        return dados.map(function(linha){
            const valores = dividirLinhaTa(linha);
            const registro = {};

            colunas.forEach(function(coluna, indice){
                registro[coluna] = valores[indice] || "";
            });

            return registro;
        });
    }

    function dividirLinhaTa(linha){
        if(linha.includes("\t")){
            return linha.split("\t").map(function(item){ return item.trim(); });
        }

        if(linha.includes(";")){
            return linha.split(";").map(function(item){ return item.trim(); });
        }

        return linha.split(/\s{2,}/).map(function(item){ return item.trim(); });
    }

    async function lerArquivoTa(arquivo){
        const buffer = await arquivo.arrayBuffer();
        const workbook = XLSX.read(buffer, {
            type: "array",
            cellDates: true
        });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false
        });
    }

    function normalizarLinhaTa(linha){
        const get = function(){
            for(const nome of arguments){
                if(Object.prototype.hasOwnProperty.call(linha, nome) && String(linha[nome]).trim()){
                    return String(linha[nome]).trim();
                }
            }

            return "";
        };

        const veiculo = get("Veiculo", "Veículo", "veiculo", "veículo");
        const reboque = get("Reboque", "reboque");
        const transportadora = get("Transportadora", "transportadora");
        const procedencia = get("Procedencia", "Procedência", "procedencia", "procedência");
        const documento = get("Documento", "documento", "DTA", "dta");
        const tipo = get("Tipo", "tipo") || "DTA";
        const beneficiario = get("Beneficiario", "Beneficiário", "beneficiario", "beneficiário", "Cliente", "cliente");
        const origem = get("Origem", "origem");
        const prazo = get("Prazo Siscomex", "Prazo Siscomex ", "prazoSiscomex");
        const chegadaPrevista = get("Chegada Prevista", "chegadaPrevista");
        const chegaEm = get("Chega em", "chegaEm");
        const transSimplif = get("Trans. Simplif.", "Trans Simplif", "transSimplif");

        return {
            codigoTransporteTa: veiculo || documento,
            tipoDocumento: tipo,
            documento: documento || veiculo,
            cliente: beneficiario || "Nao informado",
            transportadora: transportadora || "Nao informado",
            unidade: obterUnidadeOperacional() || "Campinas",
            statusVeiculo: "Em transito",
            prioridade: chegaEm && chegaEm.includes("-") ? "Alta" : "Normal",
            observacoes: [
                veiculo ? `Veiculo: ${veiculo}` : "",
                reboque ? `Reboque: ${reboque}` : "",
                procedencia ? `Procedencia: ${procedencia}` : "",
                origem ? `Origem: ${origem}` : "",
                prazo ? `Prazo Siscomex: ${prazo}` : "",
                chegadaPrevista ? `Chegada prevista: ${chegadaPrevista}` : "",
                chegaEm ? `Chega em: ${chegaEm}` : "",
                transSimplif ? `Trans. simplif.: ${transSimplif}` : ""
            ].filter(Boolean).join(" | "),
            iniciadoEm: origem || new Date().toISOString(),
            movimentacoes: [{
                item: "Transito Aduaneiro",
                quantidade: 1,
                valorUnitario: 0,
                valorTotal: 0
            }]
        };
    }

    function normalizarLinhaTa(linha){
        const veiculo = obterCampoTa(linha, "Veiculo", "Veículo", "Placa");
        const reboque = obterCampoTa(linha, "Reboque");
        const transportadora = obterCampoTa(linha, "Transportadora");
        const procedencia = obterCampoTa(linha, "Procedencia", "Procedência");
        const documento = obterCampoTa(linha, "Documento", "DTA", "NF", "Nota Fiscal", "Processo");
        const tipo = obterCampoTa(linha, "Tipo") || detectarTipoDocumentoTa(documento);
        const beneficiario = obterCampoTa(linha, "Beneficiario", "Beneficiário", "Cliente", "Beneficiário Conhec.", "Beneficiario Conhec.");
        const cnpjCpf = obterCampoTa(linha, "CNPJ/CPF", "CNPJ", "CPF", "CNPJ/CPF Benef.", "CNPJ/CPF Benef");
        const conhecimento = obterCampoTa(linha, "Conhecimento/CE", "Conhecimento", "CE");
        const instrucao = obterCampoTa(linha, "Instrucao", "Instrução", "Instrucao Carga", "Instrução Carga");
        const ati = obterCampoTa(linha, "ATI");
        const origem = obterCampoTa(linha, "Origem");
        const prazo = obterCampoTa(linha, "Prazo Siscomex");
        const chegadaPrevista = obterCampoTa(linha, "Chegada Prevista");
        const chegaEm = obterCampoTa(linha, "Chega em");
        const transSimplif = obterCampoTa(linha, "Trans. Simplif.", "Trans Simplif");

        return {
            codigoTransporteTa: veiculo || documento,
            tipoDocumento: tipo,
            documento: documento,
            cliente: beneficiario || "Nao informado",
            transportadora: transportadora || "Nao informado",
            unidade: obterUnidadeOperacional() || "Campinas",
            veiculo: veiculo,
            reboque: reboque,
            instrucao: instrucao,
            ati: ati,
            statusVeiculo: "Em transito",
            prioridade: chegaEm && chegaEm.includes("-") ? "Alta" : "Normal",
            observacoes: [
                veiculo ? `Veiculo: ${veiculo}` : "",
                reboque ? `Reboque: ${reboque}` : "",
                cnpjCpf ? `CNPJ/CPF: ${cnpjCpf}` : "",
                conhecimento ? `Conhecimento/CE: ${conhecimento}` : "",
                procedencia ? `Procedencia: ${procedencia}` : "",
                origem ? `Origem: ${origem}` : "",
                prazo ? `Prazo Siscomex: ${prazo}` : "",
                chegadaPrevista ? `Chegada prevista: ${chegadaPrevista}` : "",
                chegaEm ? `Chega em: ${chegaEm}` : "",
                transSimplif ? `Trans. simplif.: ${transSimplif}` : "",
                instrucao ? `Instrucao TA: ${instrucao}` : "",
                ati ? `ATI: ${ati}` : ""
            ].filter(Boolean).join(" | "),
            iniciadoEm: origem || new Date().toISOString(),
            movimentacoes: [{
                item: "Transito Aduaneiro",
                quantidade: 1,
                valorUnitario: 0,
                valorTotal: 0
            }]
        };
    }

    function obterCampoTa(linha, ...nomes){
        const mapa = {};

        Object.keys(linha || {}).forEach(function(chave){
            mapa[normalizarChaveTa(chave)] = linha[chave];
        });

        for(const nome of nomes){
            const valor = mapa[normalizarChaveTa(nome)];

            if(valor !== undefined && valor !== null && String(valor).trim()){
                return String(valor).trim();
            }
        }

        return "";
    }

    function normalizarChaveTa(valorOriginal){
        return normalizarTexto(valorOriginal).replace(/[^a-z0-9]/g, "");
    }

    function detectarTipoDocumentoTa(documento){
        const texto = normalizarTexto(documento);
        if(texto.includes("nf") || texto.includes("nota")) return "NF";
        return "DTA";
    }

    function possuiInstrucaoTa(transporte){
        const valor = normalizarTexto(`${transporte.instrucao || ""} ${transporte.ati || ""}`).trim();

        if(!valor) return false;

        return !["n", "nao", "0", "-", "sem instrucao"].includes(valor);
    }

    function aplicarImportacaoTa(transportes, fonte){
        const resumo = {
            criados: 0,
            atualizados: 0,
            comInstrucao: 0,
            pendentes: 0,
            semDocumento: 0
        };

        transportes.forEach(function(transporte){
            const tipoDocumento = detectarTipoDocumentoTa(transporte.tipoDocumento || transporte.documento);
            const documento = String(transporte.documento || "").trim();
            const documentoNormalizado = normalizarDocumentoPorTipo(tipoDocumento, documento);

            if(!documentoInstrucaoValido(tipoDocumento, documento)){
                resumo.semDocumento++;
                return;
            }

            const temInstrucao = possuiInstrucaoTa(transporte);
            const registroExistente = estado.registros.find(function(registro){
                const tipoRegistro = registro.tipoDocumento || "DTA";
                return tipoRegistro === tipoDocumento &&
                    normalizarDocumentoPorTipo(tipoRegistro, registro.dta) === documentoNormalizado;
            });

            const dadosBase = {
                dta: documento,
                tipoDocumento: tipoDocumento,
                cliente: transporte.cliente || "Nao informado",
                transportadora: transporte.transportadora || "Nao informado",
                unidade: transporte.unidade || obterUnidadeOperacional() || "Campinas",
                transporteSara: transporte.codigoTransporteTa || "",
                veiculo: transporte.statusVeiculo || "Em transito",
                prioridade: transporte.prioridade || "Normal",
                observacoes: transporte.observacoes || "",
                integracaoStatus: "TA importado",
                origem: "TA",
                taFonte: fonte,
                taImportadoEm: new Date().toISOString()
            };

            if(registroExistente){
                Object.assign(registroExistente, {
                    cliente: registroExistente.cliente === "Nao informado" ? dadosBase.cliente : registroExistente.cliente,
                    transportadora: registroExistente.transportadora === "Nao informado" ? dadosBase.transportadora : registroExistente.transportadora,
                    unidade: registroExistente.unidade || dadosBase.unidade,
                    transporteSara: registroExistente.transporteSara || dadosBase.transporteSara,
                    prioridade: dadosBase.prioridade === "Alta" ? "Alta" : registroExistente.prioridade,
                    observacoes: [registroExistente.observacoes, dadosBase.observacoes].filter(Boolean).join(" | "),
                    integracaoStatus: registroExistente.integracaoStatus || dadosBase.integracaoStatus,
                    taFonte: fonte,
                    taImportadoEm: dadosBase.taImportadoEm
                });

                if(temInstrucao && !registroExistente.bimEm){
                    registroExistente.bimEm = new Date().toISOString();
                    registroExistente.bimFonte = `TA: ${fonte}`;
                }

                resumo.atualizados++;
            }else{
                estado.registros.unshift({
                    id: criarId(),
                    codigo: criarCodigo(documento),
                    criadoEm: new Date().toISOString(),
                    emailEm: "",
                    emailFonte: "",
                    bimEm: temInstrucao ? new Date().toISOString() : "",
                    bimFonte: temInstrucao ? `TA: ${fonte}` : "",
                    integracaoProtocolo: "",
                    integracaoErro: "",
                    ...dadosBase
                });

                resumo.criados++;
            }

            if(temInstrucao){
                resumo.comInstrucao++;
            }else{
                resumo.pendentes++;
            }
        });

        salvarRegistros();
        renderizar();
        return resumo;
    }

    function documentoInstrucaoValido(tipoDocumento, documento){
        if(tipoDocumento === "DTA") return normalizarDta(documento).length >= 5 && !/[A-Za-z]/.test(String(documento || ""));
        return normalizarDocumentoPorTipo(tipoDocumento, documento).length >= 3;
    }

    async function sincronizacaoRemovida(){
        return;

        try{
            const resposta = await fetch("", {
                headers: montarCabecalhosApi(false)
            });

            if(!resposta.ok) return;

            const payload = await resposta.json();
            const transportesApi = Array.isArray(payload) ? payload : (payload.transportes || payload.value || []);

            if(!transportesApi.length) return;

            const transportes = transportesApi.map(normalizarTransporteApiTa);
            const importacao = aplicarImportacaoTa(transportes, "Importacao local TA");

            if(elementos.resultado && (importacao.criados || importacao.atualizados)){
                elementos.resultado.innerHTML = `
                    <strong>TA sincronizado localmente.</strong><br>
                    Novas pendências: ${importacao.criados}<br>
                    Atualizados: ${importacao.atualizados}<br>
                    Com instrução no TA: ${importacao.comInstrucao}<br>
                    Sem instrução: ${importacao.pendentes}<br>
                    Ignorados sem documento válido: ${importacao.semDocumento}
                `;
            }
        }catch(erro){
            console.warn("Nao foi possivel sincronizar TA localmente.", erro);
        }
    }

    function normalizarTransporteApiTa(transporte){
        return {
            codigoTransporteTa: transporte.codigoTransporteTa || transporte.transporteSara || transporte.id || "",
            tipoDocumento: transporte.tipoDocumento || detectarTipoDocumentoTa(transporte.documento),
            documento: transporte.documento || "",
            cliente: transporte.cliente || transporte.beneficiario || "Nao informado",
            transportadora: transporte.transportadora || "Nao informado",
            unidade: transporte.unidade || obterUnidadeOperacional() || "Campinas",
            veiculo: transporte.veiculo || transporte.codigoTransporteTa || "",
            reboque: transporte.reboque || "",
            instrucao: transporte.instrucao || transporte.instrucaoTa || "",
            ati: transporte.ati || "",
            statusVeiculo: transporte.statusVeiculo || "Em transito",
            prioridade: transporte.prioridade || "Normal",
            observacoes: transporte.observacoes || "",
            iniciadoEm: transporte.iniciadoEm || transporte.criadoEm || new Date().toISOString(),
            movimentacoes: transporte.movimentacoes || []
        };
    }

    async function envioRemovido(transportes){
        if(true){
            throw new Error("Importacao automatica removida.");
        }

        const url = "";
        const resposta = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                transportes: transportes
            })
        });

        const texto = await resposta.text();
        const payload = texto ? JSON.parse(texto) : {};

        if(!resposta.ok){
            throw new Error(payload.erro || texto || `Falha HTTP ${resposta.status}`);
        }

        return payload;
    }

    function importarTexto(){
        const texto = elementos.textoBim.value.trim();

        if(!texto){
            mostrarToast("Cole DTAs ou conteudo do CSV.", "aviso");
            return;
        }

        aplicarImportacaoBim(texto, "Lista colada");
    }

    function aplicarImportacaoBim(texto, fonte){
        const registrosImportados = extrairRegistrosBim(texto, fonte);
        mesclarRegistrosBim(registrosImportados);

        const indice = montarIndiceImportacao(texto, estado.registrosBim);
        const pendentes = estado.registros.filter(function(registro){
            return statusFinal(registro) !== "bim";
        });
        const encontrados = [];

        pendentes.forEach(function(registro){
            if(combinaImportacao(registro.dta, indice)){
                registro.bimEm = obterDataEnvioBim(registro.dta, indice) || new Date().toISOString();
                registro.bimFonte = fonte;
                encontrados.push(registro.dta);
            }
        });

        salvarRegistros();
        salvarRegistrosBim();
        renderizar();

        const mensagem = [
            `${encontrados.length} registro(s) atualizado(s).`,
            `${pendentes.length} pendente(s) avaliado(s).`,
            `${estado.registrosBim.length} documento(s) BIM salvo(s).`
        ].join(" ");

        elementos.resultado.innerHTML = `
            <strong>${escaparHtml(mensagem)}</strong>
            ${encontrados.length ? `<br>DTAs baixados: ${encontrados.map(escaparHtml).join(", ")}` : ""}
        `;

        mostrarToast(mensagem, "sucesso");
    }

    function extrairRegistrosBim(texto, fonte){
        const linhas = parseCsv(texto);

        if(linhas.length < 2) return [];

        const cabecalho = linhas[0].map(normalizarTexto);
        const indiceDataEnvio = cabecalho.findIndex(function(coluna){
            return coluna.includes("data") && coluna.includes("envio");
        });
        const indiceDocumento = cabecalho.findIndex(function(coluna){
            return coluna.includes("dta") ||
                coluna.includes("nota") ||
                coluna === "nf" ||
                coluna.includes("documento") ||
                coluna.includes("processo");
        });

        const registros = [];

        linhas.slice(1).forEach(function(linha){
            const documento = indiceDocumento >= 0
                ? linha[indiceDocumento]
                : encontrarDocumentoNaLinha(linha);

            if(!documento) return;

            const dataEnvio = indiceDataEnvio >= 0
                ? normalizarDataBim(linha[indiceDataEnvio])
                : "";

            registros.push({
                documento: documento.trim(),
                dataEnvio: dataEnvio,
                fonte: fonte,
                importadoEm: new Date().toISOString()
            });
        });

        return registros;
    }

    function mesclarRegistrosBim(registrosImportados){
        const mapa = new Map();

        estado.registrosBim.forEach(function(registro){
            mapa.set(chaveDocumentoBim(registro.documento), registro);
        });

        registrosImportados.forEach(function(registro){
            const chave = chaveDocumentoBim(registro.documento);

            if(!chave) return;

            mapa.set(chave, {
                ...mapa.get(chave),
                ...registro
            });
        });

        estado.registrosBim = Array.from(mapa.values());
    }

    function chaveDocumentoBim(documento){
        return normalizarDta(documento) || normalizarTexto(documento).replace(/\s+/g, "");
    }

    function parseCsv(texto){
        const linhas = String(texto || "").replace(/\u0000/g, "").split(/\r?\n/).filter(function(linha){
            return linha.trim() !== "";
        });

        if(!linhas.length) return [];

        const delimitador = detectarDelimitador(linhas[0]);

        return linhas.map(function(linha){
            return dividirCsv(linha, delimitador);
        });
    }

    function detectarDelimitador(linha){
        const opcoes = [";", ",", "\t"];
        let melhor = ";";
        let maior = -1;

        opcoes.forEach(function(opcao){
            const total = dividirCsv(linha, opcao).length;

            if(total > maior){
                maior = total;
                melhor = opcao;
            }
        });

        return melhor;
    }

    function dividirCsv(linha, delimitador){
        const colunas = [];
        let atual = "";
        let aspas = false;

        for(let i = 0; i < linha.length; i++){
            const caractere = linha[i];
            const proximo = linha[i + 1];

            if(caractere === '"' && aspas && proximo === '"'){
                atual += '"';
                i++;
                continue;
            }

            if(caractere === '"'){
                aspas = !aspas;
                continue;
            }

            if(caractere === delimitador && !aspas){
                colunas.push(atual.trim());
                atual = "";
                continue;
            }

            atual += caractere;
        }

        colunas.push(atual.trim());
        return colunas;
    }

    function encontrarDocumentoNaLinha(linha){
        return linha.find(function(valorOriginal){
            return gerarChavesDta(valorOriginal).size > 0;
        }) || "";
    }

    function normalizarDataBim(valorOriginal){
        const valor = String(valorOriginal || "").trim();

        if(!valor) return "";

        const br = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);

        if(br){
            const iso = `${br[3]}-${br[2]}-${br[1]}T${br[4] || "00"}:${br[5] || "00"}:${br[6] || "00"}`;
            const data = new Date(iso);
            return Number.isNaN(data.getTime()) ? "" : data.toISOString();
        }

        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "" : data.toISOString();
    }

    function montarIndiceImportacao(texto, registrosBim){
        const bruto = String(texto || "").replace(/\u0000/g, "");
        const digitos = normalizarDta(bruto);
        const chaves = new Set();
        const datas = new Map();
        const formatados = bruto.match(/\d{2}\s*[\/.-]\s*\d{5,8}\s*[\/.-]?\s*\d?/g) || [];

        formatados.forEach(function(item){
            adicionarChavesDta(chaves, item);
        });

        bruto
            .split(/[\s,;|"']+/)
            .map(normalizarDta)
            .filter(function(item){
                return item.length >= 5 && item.length <= 12;
            })
            .forEach(function(item){
                adicionarChavesDta(chaves, item);
            });

        registrosBim.forEach(function(registro){
            adicionarChavesDta(chaves, registro.documento);

            gerarChavesDta(registro.documento).forEach(function(chave){
                if(registro.dataEnvio) datas.set(chave, registro.dataEnvio);
            });
        });

        return { bruto, digitos, chaves, datas };
    }

    function combinaImportacao(dta, indice){
        for(const chave of gerarChavesDta(dta)){
            if(indice.chaves.has(chave)) return true;
            if(chave.length >= 5 && indice.digitos.includes(chave)) return true;
        }

        return false;
    }

    function obterDataEnvioBim(documento, indice){
        for(const chave of gerarChavesDta(documento)){
            if(indice.datas.has(chave)) return indice.datas.get(chave);
        }

        return "";
    }

    function adicionarChavesDta(destino, valorOriginal){
        gerarChavesDta(valorOriginal).forEach(function(chave){
            destino.add(chave);
        });
    }

    function gerarChavesDta(valorOriginal){
        const digitos = normalizarDta(valorOriginal);
        const chaves = new Set();

        if(!digitos) return chaves;

        [
            digitos,
            digitos.length > 2 ? digitos.slice(2) : "",
            digitos.length > 1 ? digitos.slice(0, -1) : "",
            digitos.length > 3 ? digitos.slice(2, -1) : ""
        ].forEach(function(item){
            if(!item || item.length < 5) return;
            chaves.add(item);
            chaves.add(item.replace(/^0+/, ""));
        });

        return chaves;
    }

    function statusFinal(registro){
        if(registro.bimEm) return "bim";
        if(registro.emailEm) return "email";
        return "pending";
    }

    function badgeStatus(registro){
        const status = statusFinal(registro);

        if(status === "bim") return '<span class="instrucao-badge bim">Com instrução/BIM</span>';
        if(estaCritico(registro)) return '<span class="instrucao-badge critico">Prazo critico</span>';
        if(status === "email") return '<span class="instrucao-badge email">Respondido por e-mail</span>';
        if(registro.integracaoStatus === "TA importado") return '<span class="instrucao-badge bim">TA importado</span>';

        return '<span class="instrucao-badge pendente">Aguardando retorno</span>';
    }

    function estaCritico(registro){
        return statusFinal(registro) === "pending" &&
            !ehTransportadoraMultilog(registro.transportadora) &&
            Date.now() - new Date(registro.criadoEm).getTime() > 60 * 60 * 1000;
    }

    function ehTransportadoraMultilog(transportadora){
        return normalizarTexto(transportadora).includes("multilog");
    }

    function tempoDecorrido(registro){
        return formatarDuracao(segundosResposta(registro));
    }

    function segundosResposta(registro){
        const inicio = new Date(registro.criadoEm).getTime();
        const fimValor = registro.bimEm || registro.emailEm;
        const fim = fimValor ? new Date(fimValor).getTime() : Date.now();
        return Math.max(0, Math.floor((fim - inicio) / 1000));
    }

    function formatarDuracao(segundosTotais){
        const horas = Math.floor(segundosTotais / 3600);
        const minutos = Math.floor((segundosTotais % 3600) / 60);
        const segundos = segundosTotais % 60;

        return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
    }

    function abrirEmail(registro){
        const tipoDocumento = registro.tipoDocumento || "DTA";

        if(statusFinal(registro) === "bim" || documentoJaPossuiInstrucaoBim(tipoDocumento, registro.dta)){
            mostrarToast(`${tipoDocumento} ja possui instrucao cadastrada no BIM. Envio bloqueado.`, "erro");
            return;
        }

        const assunto = `Instrucao de Carga - ${registro.cliente} - ${tipoDocumento}: ${registro.dta}`;
        const corpo = [
            "Boa noite,",
            "Relacionamento,",
            "",
            "Gentileza solicitar instrucao do processo mencionado.",
            mensagemVeiculo(registro.veiculo),
            "",
            `Cliente: ${registro.cliente}`,
            `${tipoDocumento}: ${registro.dta}`,
            `Transportadora: ${registro.transportadora}`,
            `Unidade: ${registro.unidade || "Nao informada"}`,
            `Prioridade: ${registro.prioridade || "Normal"}`,
            `Transporte SARA: ${registro.transporteSara || "Nao informado"}`,
            `Origem: ${registro.integracaoProtocolo || registro.integracaoStatus || "Local"}`,
            "",
            "Ficamos no aguardo.",
            "",
            `Controle interno: ${registro.codigo}`
        ].join("\n");

        window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    }

    function mensagemVeiculo(veiculo){
        if(veiculo === "Em transito") return "***O VEICULO ESTA EM TRANSITO PARA A UNIDADE!***";
        if(veiculo === "No recinto") return "***O VEICULO ESTA NO RECINTO!***";

        return "***CARGA ARMAZENADA NA UNIDADE!***";
    }

    function limparBase(){
        if(!confirm("Limpar todos os registros?")) return;

        estado.registros = [];
        salvarRegistros();
        renderizar();
        mostrarToast("Base limpa.", "aviso");
    }

    function exportarRelatorio(){
        if(!estado.registros.length){
            mostrarToast("Nao ha registros para exportar.", "aviso");
            return;
        }

        const cabecalho = ["Codigo", "Tipo", "Documento", "Cliente", "Transportadora", "Unidade", "Transporte SARA", "Veiculo", "Prioridade", "Origem", "Solicitado em", "Status final", "Email em", "BIM em", "Observacoes"];
        const linhas = estado.registros.map(function(registro){
            return [
                registro.codigo,
                registro.tipoDocumento || "DTA",
                registro.dta,
                registro.cliente,
                registro.transportadora,
                registro.unidade,
                registro.transporteSara,
                textoVeiculo(registro.veiculo),
                registro.prioridade || "Normal",
                textoApi(registro),
                formatarData(registro.criadoEm),
                textoStatus(registro),
                formatarData(registro.emailEm),
                formatarData(registro.bimEm),
                registro.observacoes
            ].map(celulaCsv).join(";");
        });

        baixarArquivo("controle-instrucoes.csv", [cabecalho.join(";"), ...linhas].join("\n"));
    }

    async function lerArquivoTexto(arquivo){
        const buffer = await arquivo.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const nulos = bytes.reduce(function(total, byte){
            return total + (byte === 0 ? 1 : 0);
        }, 0);

        if(nulos > bytes.length * 0.1) return new TextDecoder("utf-16le").decode(buffer);

        const utf8 = new TextDecoder("utf-8").decode(buffer);

        if(utf8.includes("�")) return new TextDecoder("windows-1252").decode(buffer);

        return utf8;
    }

    function definirVeiculo(veiculo){
        estado.veiculoAtual = veiculo;

        document.querySelectorAll("[data-instrucao-veiculo]").forEach(function(botao){
            botao.classList.toggle("ativo", botao.dataset.instrucaoVeiculo === veiculo);
        });
    }

    function definirPrioridade(prioridade){
        estado.prioridadeAtual = prioridade;

        document.querySelectorAll("[data-instrucao-prioridade]").forEach(function(botao){
            botao.classList.toggle("ativo", botao.dataset.instrucaoPrioridade === prioridade);
        });
    }

    function definirTipoDocumento(tipo){
        estado.tipoDocumento = tipo;

        document.querySelectorAll("[data-instrucao-documento]").forEach(function(botao){
            botao.classList.toggle("ativo", botao.dataset.instrucaoDocumento === tipo);
        });

        elementos.documentoLabel.textContent = tipo;
        elementos.documento.value = "";
        elementos.documento.placeholder = tipo === "DTA" ? "00/000000-0" : "Numero da NF";
        elementos.documento.inputMode = tipo === "DTA" ? "numeric" : "text";

        if(tipo === "DTA"){
            elementos.documento.setAttribute("maxlength", "11");
        }else{
            elementos.documento.removeAttribute("maxlength");
        }
    }

    function tratarInputDocumento(){
        if(estado.tipoDocumento !== "DTA") return;

        elementos.documento.value = formatarDta(elementos.documento.value);
    }

    function formatarDta(valorOriginal){
        const digitos = normalizarDta(valorOriginal).slice(0, 9);
        let formatado = "";

        if(digitos.length <= 2){
            return digitos;
        }

        formatado = `${digitos.slice(0, 2)}/${digitos.slice(2, 8)}`;

        if(digitos.length > 8){
            formatado += `-${digitos.slice(8)}`;
        }

        return formatado;
    }

    function valor(seletor){
        return document.querySelector(seletor).value.trim();
    }

    function integracaoRemovida(){
        return false;
    }

    function statusIntegracaoRemovida(){
        if(!elementos.integracaoStatus) return;

        if(false){
            elementos.integracaoStatus.classList.add("online");
            elementos.integracaoStatus.innerHTML = '<i class="fa-solid fa-circle-info"></i> Controle local ativo.';
            return;
        }

        elementos.integracaoStatus.classList.remove("online");
        elementos.integracaoStatus.innerHTML = '<i class="fa-solid fa-circle-info"></i> Controle local ativo.';
    }

    async function solicitacaoRemovida(registro){
        return null;

        const endpoint = "";
        const url = "";
        const token = obterTokenApi();

        const cabecalhos = {
            "Content-Type": "application/json"
        };

        if(token){
            cabecalhos.Authorization = `Bearer ${token}`;
        }

        const resposta = await fetch(url, {
            method: "POST",
            headers: cabecalhos,
            body: JSON.stringify(montarPayloadApi(registro))
        });

        if(!resposta.ok){
            const texto = await resposta.text();
            throw new Error(texto || `Falha HTTP ${resposta.status}`);
        }

        if(resposta.status === 204) return {};

        const conteudo = await resposta.text();
        return conteudo ? JSON.parse(conteudo) : {};
    }

    function montarPayloadApi(registro){
        return {
            codigoControle: registro.codigo,
            tipoDocumento: registro.tipoDocumento || "DTA",
            documento: registro.dta,
            cliente: registro.cliente,
            transportadora: registro.transportadora,
            unidade: registro.unidade,
            codigoTransporteSara: registro.transporteSara,
            statusVeiculo: registro.veiculo,
            prioridade: registro.prioridade,
            observacoes: registro.observacoes,
            solicitadoEm: registro.criadoEm,
            automacoes: {
                iniciarTransporte: true,
                sincronizarSara: true,
                atualizarDashboard: true,
                gerarRelatorioOperacional: true,
                enviarEmail: true,
                enviarTeams: true
            }
        };
    }

    function obterTokenApi(){
        return "" ||
            sessionStorage.getItem("controleglp_api_token") ||
            localStorage.getItem("controleglp_api_token") ||
            "";
    }

    function montarCabecalhosApi(incluirJson){
        const cabecalhos = {};
        const token = obterTokenApi();

        if(incluirJson !== false){
            cabecalhos["Content-Type"] = "application/json";
        }

        if(token){
            cabecalhos.Authorization = `Bearer ${token}`;
        }

        return cabecalhos;
    }

    function bloquearFormulario(bloquear){
        if(!elementos.formulario) return;

        elementos.formulario.querySelectorAll("input, textarea, select, button").forEach(function(campo){
            campo.disabled = bloquear;
        });

        if(elementos.botaoSubmit){
            elementos.botaoSubmit.innerHTML = bloquear
                ? '<i class="fa-solid fa-spinner fa-spin"></i> Registrando'
                : '<i class="fa-solid fa-route"></i> Registrar e preparar e-mail';
        }
    }

    function preencherUnidadePadrao(){
        if(!elementos.unidade) return;

        const unidade = obterUnidadeOperacional();
        if(unidade) elementos.unidade.value = unidade;
    }

    function obterUnidadeOperacional(){
        if(typeof window.obterUnidadeAtual === "function"){
            return window.obterUnidadeAtual() || "";
        }

        return localStorage.getItem("unidadeSelecionada") || "";
    }

    function textoApi(registro){
        if(registro.integracaoProtocolo) return `Origem: ${registro.integracaoProtocolo}`;
        return registro.integracaoStatus ? `Origem: ${registro.integracaoStatus}` : "Origem: local";
    }

    function criarCodigo(dta){
        const digitos = normalizarDta(dta).slice(-10) || String(Date.now()).slice(-8);
        return `IC-${digitos}`;
    }

    function criarId(){
        if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function normalizarDta(valorOriginal){
        return String(valorOriginal || "").replace(/[^\d]/g, "");
    }

    function normalizarDocumentoPorTipo(tipoDocumento, documento){
        if(tipoDocumento === "DTA") return normalizarDta(documento);

        return normalizarTexto(documento).replace(/\s+/g, "");
    }

    function normalizarTexto(valorOriginal){
        return String(valorOriginal || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function formatarData(valorOriginal){
        if(!valorOriginal) return "";

        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(valorOriginal));
    }

    function formatarDataHoraInput(valorOriginal){
        const data = new Date(valorOriginal || Date.now());

        if(Number.isNaN(data.getTime())) return "";

        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");
        const hora = String(data.getHours()).padStart(2, "0");
        const minuto = String(data.getMinutes()).padStart(2, "0");

        return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
    }

    function converterInputDataHoraParaIso(valorOriginal){
        if(!valorOriginal) return "";

        const data = new Date(valorOriginal);
        return Number.isNaN(data.getTime()) ? "" : data.toISOString();
    }

    function celulaCsv(valorOriginal){
        return `"${String(valorOriginal || "").replace(/"/g, '""')}"`;
    }

    function baixarArquivo(nomeArquivo, conteudo){
        const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = nomeArquivo;
        link.click();
        URL.revokeObjectURL(url);
    }

    function escaparHtml(valorOriginal){
        const div = document.createElement("div");
        div.textContent = valorOriginal || "";
        return div.innerHTML;
    }

    function confirmarAcao(opcoes){
        return new Promise(function(resolve){
            const modalExistente = document.querySelector(".instrucao-confirmacao-overlay");
            if(modalExistente) modalExistente.remove();

            const overlay = document.createElement("div");
            overlay.className = "instrucao-confirmacao-overlay";
            const campoDataHora = opcoes.dataHora ? `
                <label class="instrucao-confirmacao-campo">
                    ${escaparHtml(opcoes.dataHora.label || "Data e hora")}
                    <input type="datetime-local" value="${escaparHtml(opcoes.dataHora.valor || formatarDataHoraInput(new Date().toISOString()))}">
                    <small></small>
                </label>
            ` : "";

            overlay.innerHTML = `
                <div class="instrucao-confirmacao" role="dialog" aria-modal="true" aria-labelledby="instrucaoConfirmacaoTitulo">
                    <div class="instrucao-confirmacao-icone ${opcoes.tipo === "perigo" ? "perigo" : ""}">
                        <i class="fa-solid ${opcoes.tipo === "perigo" ? "fa-trash" : "fa-check"}"></i>
                    </div>

                    <div class="instrucao-confirmacao-conteudo">
                        <span>Confirmação necessária</span>
                        <h2 id="instrucaoConfirmacaoTitulo">${escaparHtml(opcoes.titulo || "Confirmar ação?")}</h2>
                        <p>${escaparHtml(opcoes.mensagem || "Deseja continuar?")}</p>
                        ${campoDataHora}
                    </div>

                    <div class="instrucao-confirmacao-acoes">
                        <button class="instrucao-confirmacao-cancelar" type="button">Cancelar</button>
                        <button class="instrucao-confirmacao-confirmar ${opcoes.tipo === "perigo" ? "perigo" : ""}" type="button">
                            ${escaparHtml(opcoes.confirmar || "Confirmar")}
                        </button>
                    </div>
                </div>
            `;

            const fechar = function(resultado){
                document.removeEventListener("keydown", tratarTecla);
                overlay.classList.remove("visivel");

                setTimeout(function(){
                    overlay.remove();
                    resolve(resultado);
                }, 180);
            };

            const tratarTecla = function(evento){
                if(evento.key === "Escape") fechar(false);
            };

            overlay.addEventListener("click", function(evento){
                if(evento.target === overlay) fechar(false);
            });

            overlay.querySelector(".instrucao-confirmacao-cancelar").addEventListener("click", function(){
                fechar(false);
            });

            overlay.querySelector(".instrucao-confirmacao-confirmar").addEventListener("click", function(){
                const inputDataHora = overlay.querySelector(".instrucao-confirmacao-campo input");

                if(inputDataHora){
                    const dataHora = converterInputDataHoraParaIso(inputDataHora.value);
                    const erro = overlay.querySelector(".instrucao-confirmacao-campo small");

                    if(!dataHora){
                        erro.textContent = "Informe uma data e hora valida.";
                        inputDataHora.focus();
                        return;
                    }

                    fechar({ dataHora });
                    return;
                }

                fechar(true);
            });

            document.body.appendChild(overlay);
            document.addEventListener("keydown", tratarTecla);

            requestAnimationFrame(function(){
                overlay.classList.add("visivel");
                const inputDataHora = overlay.querySelector(".instrucao-confirmacao-campo input");
                (inputDataHora || overlay.querySelector(".instrucao-confirmacao-confirmar")).focus();
            });
        });
    }

    function mostrarToast(mensagem, tipo){
        if(typeof window.mostrarToast === "function"){
            window.mostrarToast(mensagem, tipo || "sucesso");
            return;
        }

        alert(mensagem);
    }

    function salvarRegistros(){
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estado.registros));
    }

    function salvarRegistrosBim(){
        localStorage.setItem(BIM_STORAGE_KEY, JSON.stringify(estado.registrosBim));
    }

    function carregarRegistros(){
        try{
            const registros = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(registros) ? registros.filter(registroInstrucaoValido) : [];
        }catch(erro){
            // Continua para tentar bases antigas.
        }

        for(const chave of OLD_KEYS){
            try{
                const registros = JSON.parse(localStorage.getItem(chave));

                if(Array.isArray(registros) && registros.length){
                    return registros.map(normalizarRegistroAntigo).filter(registroInstrucaoValido);
                }
            }catch(erro){
                // Ignora bases antigas invalidas.
            }
        }

        return [];
    }

    function registroInstrucaoValido(registro){
        const tipoDocumento = registro.tipoDocumento || "DTA";

        if(!documentoInstrucaoValido(tipoDocumento, registro.dta || registro.documento || "")){
            return false;
        }

        const textoTeste = normalizarTexto(`${registro.dta || ""} ${registro.cliente || ""} ${registro.transportadora || ""}`);
        return ![
            "12/345678-9",
            "77/111111-2",
            "98/765432-1",
            "44/555555-6",
            "cliente csv",
            "cliente importado",
            "cliente teste",
            "teste01"
        ].some(function(marcador){
            return textoTeste.includes(normalizarTexto(marcador));
        });
    }

    function carregarRegistrosBim(){
        try{
            const registros = JSON.parse(localStorage.getItem(BIM_STORAGE_KEY));
            return Array.isArray(registros) ? registros : [];
        }catch(erro){
            return [];
        }
    }

    function normalizarRegistroAntigo(registro){
        return {
            id: registro.id || criarId(),
            codigo: registro.code || registro.codigo || criarCodigo(registro.dta || ""),
            dta: registro.dta || "",
            tipoDocumento: registro.tipoDocumento || "DTA",
            cliente: registro.client || registro.cliente || "",
            transportadora: registro.carrier || registro.transportadora || "Nao informado",
            unidade: registro.unidade || "",
            transporteSara: registro.transporteSara || "",
            veiculo: registro.vehicle || registro.veiculo || "Em transito",
            prioridade: registro.prioridade || "Normal",
            criadoEm: registro.createdAt || registro.criadoEm || new Date().toISOString(),
            emailEm: registro.emailAt || registro.emailEm || "",
            emailFonte: registro.emailFrom || registro.emailRemetente || "",
            bimEm: registro.bimAt || registro.bimEm || (registro.status === "bim" ? new Date().toISOString() : ""),
            bimFonte: registro.bimSource || registro.bimFonte || "",
            observacoes: registro.notes || "",
            integracaoStatus: registro.integracaoStatus || "Local",
            integracaoProtocolo: registro.integracaoProtocolo || "",
            integracaoErro: registro.integracaoErro || ""
        };
    }

    function textoVeiculo(veiculo){
        if(veiculo === "Em transito") return "Em transito";
        return veiculo;
    }

    function textoStatus(registro){
        const status = statusFinal(registro);

        if(status === "bim") return "Com instrução/BIM";
        if(status === "email") return "Respondido por e-mail";
        if(estaCritico(registro)) return "Prazo critico";

        return "Aguardando retorno";
    }
})();
