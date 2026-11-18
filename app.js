'use strict';

// Perfilize: geração local por modelos de texto. Não utiliza IA, servidor ou API externa.
const formulario = document.getElementById('formCurriculo');
const curriculo = document.getElementById('curriculo');
const botaoSalvar = document.getElementById('salvar');
const botaoGerar = document.getElementById('botaoGerar');
const botaoCancelar = document.getElementById('cancelarEdicao');
const listaCurriculos = document.getElementById('listaCurriculos');
const tituloFormulario = document.getElementById('tituloFormulario');
const botaoPDF = document.getElementById('gerarPDF');

const CAMPOS = [
    'nome', 'email', 'telefone', 'cargo', 'objetivo',
    'formacao', 'experiencia', 'habilidades'
];
const CHAVE = 'curriculosPerfilize';

let curriculoAtual = null;
let idEmEdicao = null;

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[caractere]);
}

function obterDadosFormulario() {
    const dados = {};
    CAMPOS.forEach(campo => {
        dados[campo] = document.getElementById(campo).value.trim();
    });
    return dados;
}

function obterCurriculos() {
    try {
        const salvos = JSON.parse(localStorage.getItem(CHAVE) || '[]');
        return Array.isArray(salvos) ? salvos : [];
    } catch (erro) {
        console.error('Não foi possível ler os currículos salvos:', erro);
        return [];
    }
}

function armazenarCurriculos(lista) {
    try {
        localStorage.setItem(CHAVE, JSON.stringify(lista));
        return true;
    } catch (erro) {
        console.error('Não foi possível salvar os currículos:', erro);
        alert('Não foi possível salvar. Verifique o espaço disponível no navegador.');
        return false;
    }
}

// Ajusta somente a apresentação do texto informado; não inventa empresas,
// cursos, datas, cargos anteriores ou qualificações.
function limparTexto(texto) {
    return String(texto || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(linha => linha.trim())
        .filter(Boolean)
        .join('\n');
}

function criarObjetivo(dados) {
    const objetivoInformado = limparTexto(dados.objetivo);
    if (objetivoInformado) return objetivoInformado;

    const cargo = (dados.cargo || '').trim();
    if (cargo) {
        return `Busco uma oportunidade para atuar como ${cargo}, contribuindo com a equipe e desenvolvendo minhas competências profissionais.`;
    }

    return 'Busco uma oportunidade profissional para aplicar e desenvolver minhas competências, aprender novas atividades e contribuir com a equipe.';
}

function separarItens(texto) {
    return limparTexto(texto)
        .split(/\n|[;]+/)
        .map(item => item.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
}

function formatarLista(texto) {
    const itens = separarItens(texto);
    if (!itens.length) return '';
    return `<ul>${itens.map(item => `<li>${escaparHTML(item)}</li>`).join('')}</ul>`;
}

function formatarTextoLivre(texto) {
    const linhas = limparTexto(texto).split('\n').filter(Boolean);
    if (!linhas.length) return '';
    return linhas.map(linha => `<p>${escaparHTML(linha)}</p>`).join('');
}

function montarCurriculo(dados) {
    const nome = escaparHTML(dados.nome);
    const cargo = escaparHTML(dados.cargo || 'Objetivo profissional');
    const objetivo = criarObjetivo(dados);

    const secao = (titulo, conteudo) => {
        if (!conteudo) return '';
        return `
            <section class="cv-section">
                <h2>${titulo}</h2>
                <div class="cv-content">${conteudo}</div>
            </section>`;
    };

    curriculo.innerHTML = `
        <article class="curriculo-modelo">
            <header class="cv-header">
                <h1>${nome}</h1>
                <p class="cv-cargo">${cargo}</p>
            </header>
            <div class="cv-contato">
                ${dados.telefone ? `<span>☎ ${escaparHTML(dados.telefone)}</span>` : ''}
                ${dados.email ? `<span>✉ ${escaparHTML(dados.email)}</span>` : ''}
            </div>
            ${secao('OBJETIVO PROFISSIONAL', formatarTextoLivre(objetivo))}
            ${secao('FORMAÇÃO', formatarLista(dados.formacao))}
            ${secao('EXPERIÊNCIA PROFISSIONAL', formatarTextoLivre(dados.experiencia))}
            ${secao('HABILIDADES', formatarLista(dados.habilidades))}
        </article>`;

    curriculoAtual = { ...dados, objetivo };
}

function gerarCurriculoLocal(dados) {
    // A redação é feita por modelos fixos executados no próprio navegador.
    // Os dados profissionais permanecem exatamente os que a pessoa informou.
    return {
        ...dados,
        objetivo: criarObjetivo(dados),
        dataGeracao: new Date().toISOString()
    };
}

function preencherFormulario(dados) {
    CAMPOS.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) elemento.value = dados[campo] || '';
    });
}

function atualizarModoFormulario(editando) {
    tituloFormulario.textContent = editando ? 'Editar currículo' : 'Cadastrar currículo';
    botaoGerar.textContent = editando ? 'Atualizar currículo' : 'Gerar currículo';
    botaoSalvar.textContent = editando ? 'Salvar alterações' : 'Salvar currículo';
    botaoCancelar.hidden = !editando;
}

function consultarCurriculos() {
    const lista = obterCurriculos();
    listaCurriculos.innerHTML = '';

    if (!lista.length) {
        listaCurriculos.innerHTML = '<p>Nenhum currículo cadastrado ainda.</p>';
        return;
    }

    lista.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card-curriculo';

        const nome = document.createElement('h3');
        nome.textContent = item.nome || 'Sem nome';
        const email = document.createElement('p');
        email.textContent = item.email || '';
        const data = document.createElement('p');
        data.textContent = `Cadastrado em: ${item.dataCadastro || 'Data não informada'}`;

        const consultar = criarBotaoCard('Consultar', () => {
            idEmEdicao = null;
            preencherFormulario(item);
            montarCurriculo(item);
            atualizarModoFormulario(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        const editar = criarBotaoCard('Editar', () => editarCurriculo(item.id));
        const apagar = criarBotaoCard('Apagar', () => apagarCurriculo(item.id));

        card.append(nome, email, data, consultar, editar, apagar);
        listaCurriculos.appendChild(card);
    });
}

function criarBotaoCard(texto, acao) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = texto;
    botao.addEventListener('click', acao);
    return botao;
}

formulario.addEventListener('submit', event => {
    event.preventDefault();
    const dados = obterDadosFormulario();

    if (!dados.nome || !dados.email) {
        alert('Preencha seu nome e e-mail.');
        return;
    }

    botaoGerar.disabled = true;
    botaoGerar.textContent = 'Montando currículo...';

    try {
        const gerado = gerarCurriculoLocal(dados);
        if (idEmEdicao) gerado.id = idEmEdicao;
        montarCurriculo(gerado);
        alert(idEmEdicao
            ? 'Currículo atualizado. Clique em “Salvar alterações” para guardar.'
            : 'Currículo pronto! Confira a visualização e clique em “Salvar currículo”.');
    } catch (erro) {
        console.error('Erro ao montar currículo:', erro);
        alert('Não foi possível montar o currículo. Confira os dados e tente novamente.');
    } finally {
        botaoGerar.disabled = false;
        atualizarModoFormulario(Boolean(idEmEdicao));
    }
});

botaoSalvar.addEventListener('click', () => {
    const dadosFormulario = obterDadosFormulario();
    if (!dadosFormulario.nome || !dadosFormulario.email) {
        alert('Preencha nome e e-mail.');
        return;
    }
    if (!curriculoAtual) {
        alert('Primeiro preencha os dados e clique em “Gerar currículo”.');
        return;
    }

    const lista = obterCurriculos();
    const dadosFinais = {
        ...curriculoAtual,
        ...dadosFormulario,
        objetivo: criarObjetivo(dadosFormulario),
        dataCadastro: curriculoAtual.dataCadastro || new Date().toLocaleDateString('pt-BR')
    };

    if (idEmEdicao) {
        const indice = lista.findIndex(item => item.id === idEmEdicao);
        if (indice === -1) {
            alert('Currículo não encontrado.');
            return;
        }
        dadosFinais.id = idEmEdicao;
        lista[indice] = dadosFinais;
    } else {
        dadosFinais.id = String(Date.now());
        lista.push(dadosFinais);
    }

    if (!armazenarCurriculos(lista)) return;

    curriculoAtual = { ...dadosFinais };
    idEmEdicao = null;
    montarCurriculo(dadosFinais);
    consultarCurriculos();
    atualizarModoFormulario(false);
    alert('Currículo salvo com sucesso neste navegador!');
});

function editarCurriculo(id) {
    const item = obterCurriculos().find(curriculoSalvo => curriculoSalvo.id === id);
    if (!item) {
        alert('Currículo não encontrado.');
        return;
    }
    idEmEdicao = id;
    preencherFormulario(item);
    montarCurriculo(item);
    atualizarModoFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function apagarCurriculo(id) {
    if (!confirm('Tem certeza de que deseja apagar este currículo?')) return;

    const atualizados = obterCurriculos().filter(item => item.id !== id);
    if (!armazenarCurriculos(atualizados)) return;

    if (idEmEdicao === id) cancelarEdicao();
    if (curriculoAtual && curriculoAtual.id === id) {
        curriculoAtual = null;
        curriculo.innerHTML = '<p>Preencha seus dados e clique em “Gerar currículo”.</p>';
    }
    consultarCurriculos();
}

function cancelarEdicao() {
    idEmEdicao = null;
    curriculoAtual = null;
    formulario.reset();
    curriculo.innerHTML = '<p>Preencha seus dados e clique em “Gerar currículo”.</p>';
    atualizarModoFormulario(false);
}

botaoCancelar.addEventListener('click', cancelarEdicao);
botaoPDF.addEventListener('click', () => {
    if (!curriculoAtual) {
        alert('Gere ou consulte um currículo antes de criar o PDF.');
        return;
    }
    window.print();
});

// Mantém os currículos que já estavam salvos em versões anteriores.
function migrarDadosAntigos() {
    const listaAtual = obterCurriculos();
    if (listaAtual.length) return;

    const antigo = localStorage.getItem('curriculoSalvo');
    if (!antigo) return;

    try {
        const dadosAntigos = JSON.parse(antigo);
        if (dadosAntigos && dadosAntigos.nome) {
            const convertido = {
                ...dadosAntigos,
                cargo: dadosAntigos.cargo || '',
                id: String(Date.now()),
                dataCadastro: new Date().toLocaleDateString('pt-BR')
            };
            armazenarCurriculos([convertido]);
        }
    } catch (erro) {
        console.warn('Não foi possível importar um currículo antigo:', erro);
    }
}

migrarDadosAntigos();
consultarCurriculos();
