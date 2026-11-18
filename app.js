import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

'use strict';

// Perfilize: monta currículos localmente e guarda os registros no Supabase.
// A autenticação e as permissões de acesso são controladas pelo Supabase.

const formulario = document.getElementById('formCurriculo');
const curriculo = document.getElementById('curriculo');
const botaoSalvar = document.getElementById('salvar');
const botaoGerar = document.getElementById('botaoGerar');
const botaoCancelar = document.getElementById('cancelarEdicao');
const listaCurriculos = document.getElementById('listaCurriculos');
const tituloFormulario = document.getElementById('tituloFormulario');
const botaoPDF = document.getElementById('gerarPDF');

const painelAcesso = document.getElementById('painelAcesso');
const painelUsuario = document.getElementById('painelUsuario');
const secaoFormulario = document.getElementById('secaoFormulario');
const secaoResultado = document.getElementById('secaoResultado');
const secaoConsultas = document.getElementById('secaoConsultas');
const emailConta = document.getElementById('emailConta');
const senhaConta = document.getElementById('senhaConta');
const botaoEntrar = document.getElementById('entrarConta');
const botaoCriarConta = document.getElementById('criarConta');
const botaoSair = document.getElementById('sairConta');
const usuarioLogado = document.getElementById('usuarioLogado');
const statusConta = document.getElementById('statusConta');
const statusBanco = document.getElementById('statusBanco');

const CAMPOS = [
    'nome', 'email', 'telefone', 'cargo', 'objetivo',
    'formacao', 'experiencia', 'habilidades'
];

const configuracao = window.PERFILIZE_SUPABASE || {};
const urlSupabase = String(configuracao.url || '').trim();
const chavePublica = String(configuracao.publicKey || '').trim();

const configuracaoValida =
    urlSupabase.startsWith('https://') &&
    !urlSupabase.includes('SEU-PROJETO') &&
    chavePublica.length > 20 &&
    !chavePublica.includes('SUA_CHAVE');

let supabase = null;
let usuarioAtual = null;
let curriculoAtual = null;
let idEmEdicao = null;
let curriculosSalvos = [];

if (configuracaoValida) {
    supabase = createClient(urlSupabase, chavePublica);
} else {
    statusConta.textContent = 'Configure a URL e a chave pública do Supabase no arquivo supabase-config.js para ativar o banco de dados.';
    botaoEntrar.disabled = true;
    botaoCriarConta.disabled = true;
}

// =====================================
// FUNÇÕES AUXILIARES
// =====================================

function mostrarStatus(elemento, mensagem, tipo = '') {
    elemento.textContent = mensagem;
    elemento.className = tipo ? `status-conta ${tipo}` : 'status-conta';
}

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

// =====================================
// GERAÇÃO DO CURRÍCULO SEM IA
// =====================================

function criarObjetivo(dados) {
    const objetivoInformado = limparTexto(dados.objetivo);

    if (objetivoInformado) {
        return objetivoInformado;
    }

    const cargo = (dados.cargo || '').trim();

    if (cargo) {
        return `Busco uma oportunidade para atuar como ${cargo}, contribuindo com a equipe e desenvolvendo minhas competências profissionais.`;
    }

    return 'Busco uma oportunidade profissional para aplicar e desenvolver minhas competências, aprender novas atividades e contribuir com a equipe.';
}

function limparTexto(texto) {
    return String(texto || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(linha => linha.trim())
        .filter(Boolean)
        .join('\n');
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
    // Não usa IA nem cria informações profissionais que a pessoa não informou.

    return {
        ...dados,
        objetivo: criarObjetivo(dados),
        dataGeracao: new Date().toISOString()
    };
}

// =====================================
// FORMULÁRIO
// =====================================

function preencherFormulario(dados) {
    CAMPOS.forEach(campo => {
        const elemento = document.getElementById(campo);

        if (elemento) {
            elemento.value = dados[campo] || '';
        }
    });
}

function atualizarModoFormulario(editando) {
    tituloFormulario.textContent = editando ? 'Editar currículo' : 'Cadastrar currículo';

    botaoGerar.textContent = editando
        ? 'Atualizar currículo'
        : 'Gerar currículo';

    botaoSalvar.textContent = editando
        ? 'Salvar alterações no banco'
        : 'Salvar currículo no banco';

    botaoCancelar.hidden = !editando;
}

// =====================================
// BANCO DE DADOS
// =====================================

function converterRegistro(registro) {
    return {
        id: registro.id,
        nome: registro.nome || '',
        email: registro.email || '',
        telefone: registro.telefone || '',
        cargo: registro.cargo || '',
        objetivo: registro.objetivo || '',
        formacao: registro.formacao || '',
        experiencia: registro.experiencia || '',
        habilidades: registro.habilidades || '',

        dataCadastro: registro.created_at
            ? new Date(registro.created_at).toLocaleDateString('pt-BR')
            : 'Data não informada',

        created_at: registro.created_at,
        updated_at: registro.updated_at
    };
}

async function carregarCurriculos() {
    if (!supabase || !usuarioAtual) return;

    mostrarStatus(statusBanco, 'Carregando seus currículos...');

    const { data, error } = await supabase
        .from('curriculos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    curriculosSalvos = (data || []).map(converterRegistro);

    consultarCurriculos();

    mostrarStatus(statusBanco, '');
}

function consultarCurriculos() {
    listaCurriculos.innerHTML = '';

    if (!curriculosSalvos.length) {
        listaCurriculos.innerHTML = '<p>Nenhum currículo cadastrado ainda.</p>';
        return;
    }

    curriculosSalvos.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card-curriculo';

        const nome = document.createElement('h3');
        nome.textContent = item.nome || 'Sem nome';

        const email = document.createElement('p');
        email.textContent = item.email || '';

        const data = document.createElement('p');
        data.textContent = `Cadastrado em: ${item.dataCadastro}`;

        const consultar = criarBotaoCard('Consultar', () => {
            idEmEdicao = null;

            preencherFormulario(item);
            montarCurriculo(item);
            atualizarModoFormulario(false);

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        const editar = criarBotaoCard(
            'Editar',
            () => editarCurriculo(item.id)
        );

        const apagar = criarBotaoCard(
            'Apagar',
            () => apagarCurriculo(item.id)
        );

        card.append(
            nome,
            email,
            data,
            consultar,
            editar,
            apagar
        );

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

// =====================================
// CADASTRO DE CONTA
// =====================================

async function registrarConta() {
    const email = emailConta.value.trim();
    const password = senhaConta.value;

    if (!email || !password) {
        mostrarStatus(statusConta, 'Informe o e-mail e a senha.');
        return;
    }

    if (password.length < 8) {
        mostrarStatus(statusConta, 'A senha deve ter pelo menos 8 caracteres.');
        return;
    }

    botaoCriarConta.disabled = true;

    mostrarStatus(statusConta, 'Criando sua conta...');

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;

        if (data.session) {
            mostrarStatus(
                statusConta,
                'Conta criada! Você já está conectado.',
                'sucesso'
            );

            await atualizarPainel(data.session);

        } else {
            mostrarStatus(
                statusConta,
                'Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre no Perfilize.',
                'sucesso'
            );
        }

    } catch (erro) {
        console.error('Erro ao criar conta:', erro);

        mostrarStatus(statusConta, traduzirErro(erro));

    } finally {
        botaoCriarConta.disabled = false;
    }
}

// =====================================
// LOGIN
// =====================================

async function entrarNaConta() {
    const email = emailConta.value.trim();
    const password = senhaConta.value;

    if (!email || !password) {
        mostrarStatus(statusConta, 'Informe o e-mail e a senha.');
        return;
    }

    botaoEntrar.disabled = true;

    mostrarStatus(statusConta, 'Entrando...');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        await atualizarPainel(data.session);

        mostrarStatus(
            statusConta,
            'Login realizado com sucesso.',
            'sucesso'
        );

    } catch (erro) {
        console.error('Erro ao entrar:', erro);

        mostrarStatus(statusConta, traduzirErro(erro));

    } finally {
        botaoEntrar.disabled = false;
    }
}

// =====================================
// TRATAMENTO DE ERROS
// =====================================

function traduzirErro(erro) {
    const mensagem = String(
        erro?.message || 'Ocorreu um erro inesperado.'
    );

    if (/Invalid login credentials/i.test(mensagem)) {
        return 'E-mail ou senha incorretos.';
    }

    if (/Email not confirmed/i.test(mensagem)) {
        return 'Confirme seu e-mail antes de entrar.';
    }

    if (/User already registered/i.test(mensagem)) {
        return 'Esse e-mail já possui uma conta. Tente entrar.';
    }

    if (/Password should be at least/i.test(mensagem)) {
        return 'A senha precisa ter pelo menos 8 caracteres.';
    }

    if (/Failed to fetch|NetworkError/i.test(mensagem)) {
        return 'Não foi possível conectar. Confira a internet e a configuração do Supabase.';
    }

    return mensagem;
}

// =====================================
// ATUALIZAÇÃO DA TELA
// =====================================

async function atualizarPainel(session) {
    const conectado = Boolean(session?.user);

    painelAcesso.hidden = conectado;
    painelUsuario.hidden = !conectado;
    secaoFormulario.hidden = !conectado;
    secaoResultado.hidden = !conectado;
    secaoConsultas.hidden = !conectado;

    usuarioAtual = conectado ? session.user : null;

    usuarioLogado.textContent = usuarioAtual?.email || '';

    if (conectado) {
        try {
            await carregarCurriculos();

        } catch (erro) {
            console.error('Erro ao carregar currículos:', erro);

            mostrarStatus(
                statusBanco,
                `Não foi possível carregar os currículos: ${traduzirErro(erro)}`
            );
        }

    } else {
        curriculosSalvos = [];

        consultarCurriculos();
        cancelarEdicao();
    }
}

// =====================================
// SAIR DA CONTA
// =====================================

async function sairDaConta() {
    botaoSair.disabled = true;

    try {
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        await atualizarPainel(null);

        mostrarStatus(
            statusConta,
            'Você saiu da sua conta.',
            'sucesso'
        );

    } catch (erro) {
        console.error('Erro ao sair:', erro);

        mostrarStatus(statusBanco, traduzirErro(erro));

    } finally {
        botaoSair.disabled = false;
    }
}

// =====================================
// GERAR CURRÍCULO
// =====================================

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

        if (idEmEdicao) {
            gerado.id = idEmEdicao;
        }

        montarCurriculo(gerado);

        mostrarStatus(
            statusBanco,
            'Currículo montado. Clique em salvar para guardar no banco de dados.'
        );

    } catch (erro) {
        console.error('Erro ao montar currículo:', erro);

        alert('Não foi possível montar o currículo. Confira os dados e tente novamente.');

    } finally {
        botaoGerar.disabled = false;

        atualizarModoFormulario(Boolean(idEmEdicao));
    }
});

// =====================================
// SALVAR CURRÍCULO
// =====================================

botaoSalvar.addEventListener('click', async () => {
    if (!usuarioAtual) {
        alert('Entre na sua conta antes de salvar.');
        return;
    }

    const dadosFormulario = obterDadosFormulario();

    if (!dadosFormulario.nome || !dadosFormulario.email) {
        alert('Preencha nome e e-mail.');
        return;
    }

    if (!curriculoAtual) {
        alert('Primeiro preencha os dados e clique em “Gerar currículo”.');
        return;
    }

    if (curriculoAtual.id && !idEmEdicao) {
        alert('Este currículo já está salvo. Clique em “Editar” na lista para alterar esse registro.');
        return;
    }

    const payload = {
        ...dadosFormulario,
        objetivo: criarObjetivo(dadosFormulario),
        user_id: usuarioAtual.id,
        updated_at: new Date().toISOString()
    };

    botaoSalvar.disabled = true;

    mostrarStatus(statusBanco, 'Salvando no banco de dados...');

    try {
        let resultado;

        if (idEmEdicao) {
            resultado = await supabase
                .from('curriculos')
                .update(payload)
                .eq('id', idEmEdicao)
                .eq('user_id', usuarioAtual.id)
                .select('*')
                .single();

        } else {
            resultado = await supabase
                .from('curriculos')
                .insert(payload)
                .select('*')
                .single();
        }

        if (resultado.error) throw resultado.error;

        const salvo = converterRegistro(resultado.data);

        idEmEdicao = null;
        curriculoAtual = { ...salvo };

        montarCurriculo(salvo);

        await carregarCurriculos();

        atualizarModoFormulario(false);

        mostrarStatus(
            statusBanco,
            'Currículo salvo com sucesso no banco de dados!',
            'sucesso'
        );

    } catch (erro) {
        console.error('Erro ao salvar currículo:', erro);

        mostrarStatus(
            statusBanco,
            `Não foi possível salvar: ${traduzirErro(erro)}`
        );

    } finally {
        botaoSalvar.disabled = false;
    }
});

// =====================================
// EDITAR CURRÍCULO
// =====================================

async function editarCurriculo(id) {
    const item = curriculosSalvos.find(
        registro => registro.id === id
    );

    if (!item) {
        mostrarStatus(
            statusBanco,
            'Currículo não encontrado. Atualize a página e tente novamente.'
        );

        return;
    }

    idEmEdicao = id;

    preencherFormulario(item);
    montarCurriculo(item);

    atualizarModoFormulario(true);

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// =====================================
// APAGAR CURRÍCULO
// =====================================

async function apagarCurriculo(id) {
    if (!confirm('Tem certeza de que deseja apagar este currículo?')) {
        return;
    }

    if (!usuarioAtual) return;

    mostrarStatus(statusBanco, 'Apagando currículo...');

    try {
        const { error } = await supabase
            .from('curriculos')
            .delete()
            .eq('id', id)
            .eq('user_id', usuarioAtual.id);

        if (error) throw error;

        if (idEmEdicao === id) {
            cancelarEdicao();
        }

        if (curriculoAtual?.id === id) {
            curriculoAtual = null;

            curriculo.innerHTML = '<p>Preencha seus dados e clique em “Gerar currículo”.</p>';
        }

        await carregarCurriculos();

        mostrarStatus(
            statusBanco,
            'Currículo apagado com sucesso.',
            'sucesso'
        );

    } catch (erro) {
        console.error('Erro ao apagar currículo:', erro);

        mostrarStatus(
            statusBanco,
            `Não foi possível apagar: ${traduzirErro(erro)}`
        );
    }
}

// =====================================
// CANCELAR EDIÇÃO
// =====================================

function cancelarEdicao() {
    idEmEdicao = null;
    curriculoAtual = null;

    formulario.reset();

    curriculo.innerHTML = '<p>Preencha seus dados e clique em “Gerar currículo”.</p>';

    atualizarModoFormulario(false);
}

botaoCancelar.addEventListener('click', cancelarEdicao);

// =====================================
// GERAR PDF
// =====================================

botaoPDF.addEventListener('click', () => {
    if (!curriculoAtual) {
        alert('Gere ou consulte um currículo antes de criar o PDF.');
        return;
    }

    window.print();
});

// =====================================
// EVENTOS DOS BOTÕES
// =====================================

botaoEntrar.addEventListener('click', entrarNaConta);
botaoCriarConta.addEventListener('click', registrarConta);
botaoSair.addEventListener('click', sairDaConta);

senhaConta.addEventListener('keydown', event => {
    if (event.key === 'Enter' && supabase) {
        entrarNaConta();
    }
});

// =====================================
// VERIFICAR SESSÃO DO USUÁRIO
// =====================================

if (supabase) {

    supabase.auth.onAuthStateChange((_evento, session) => {

        // A atualização é adiada para não bloquear o callback interno do Supabase Auth.

        window.setTimeout(() => {
            atualizarPainel(session).catch(erro => {
                console.error('Erro ao atualizar a sessão:', erro);

                mostrarStatus(
                    statusBanco,
                    traduzirErro(erro)
                );
            });

        }, 0);
    });

    supabase.auth.getSession()
        .then(({ data, error }) => {

            if (error) throw error;

            return atualizarPainel(data.session);
        })
        .catch(erro => {

            console.error('Erro ao verificar a sessão:', erro);

            mostrarStatus(
                statusConta,
                traduzirErro(erro)
            );
        });
}
