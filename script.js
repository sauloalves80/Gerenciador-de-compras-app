// ── Estado ────────────────────────────────────────────
let limite = parseFloat(localStorage.getItem('limite')) || 0;
let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
let toastTimer = null;
let editandoId = null;

function salvarDados() {
  localStorage.setItem('limite', limite);
  localStorage.setItem('produtos', JSON.stringify(produtos));
}

// ── Utilitários ───────────────────────────────────────
function fmt(valor) {
  return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

function showToast(mensagem, icone = 'ti-check') {
  const toast = document.getElementById('toast');
  toast.querySelector('i').className = 'ti ' + icone;
  document.getElementById('toast-msg').textContent = mensagem;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function setErro(id, mensagem) {
  document.getElementById(id).textContent = mensagem;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Limite ────────────────────────────────────────────
function definirLimite() {
  const valor = parseFloat(document.getElementById('limite-input').value);
  if (!valor || valor <= 0) {
    setErro('limite-erro', 'Informe um valor válido maior que zero.');
    return;
  }
  setErro('limite-erro', '');
  limite = valor;
  produtos = [];
  cancelarEdicao();
  document.getElementById('limite-input').value = '';
  renderizar();
  salvarDados();
  showToast('Limite definido: ' + fmt(limite), 'ti-check');
}

// ── Adicionar / Salvar edição ─────────────────────────
function adicionarProduto() {
  const nome = document.getElementById('nome-input').value.trim();
  const valorUnit = parseFloat(document.getElementById('valor-input').value);
  const qtd = parseInt(document.getElementById('qtd-input').value);

  if (!nome) { setErro('produto-erro', 'Informe o nome do produto.'); return; }
  if (!valorUnit || valorUnit <= 0) { setErro('produto-erro', 'Informe um valor válido.'); return; }
  if (!qtd || qtd < 1) { setErro('produto-erro', 'Informe uma quantidade válida.'); return; }
  if (limite === 0) { setErro('produto-erro', 'Defina um limite antes de adicionar produtos.'); return; }

  setErro('produto-erro', '');
  const valorTotal = valorUnit * qtd;

  if (editandoId !== null) {
    produtos = produtos.map(p =>
      p.id === editandoId
        ? { id: p.id, nome, valorUnit, qtd, valor: valorTotal }
        : p
    );
    showToast('"' + nome + '" atualizado!', 'ti-edit');
    cancelarEdicao();
  } else {
    produtos.push({ id: Date.now(), nome, valorUnit, qtd, valor: valorTotal });
    document.getElementById('nome-input').value = '';
    document.getElementById('valor-input').value = '';
    document.getElementById('qtd-input').value = '1';
    document.getElementById('nome-input').focus();
  }

  renderizar();
  salvarDados();
}

// ── Editar ────────────────────────────────────────────
function editar(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;

  editandoId = id;
  document.getElementById('nome-input').value = p.nome;
  document.getElementById('valor-input').value = p.valorUnit;
  document.getElementById('qtd-input').value = p.qtd;
  document.getElementById('nome-input').focus();

  const btn = document.getElementById('btn-adicionar');
  btn.textContent = 'Salvar alterações';
  btn.style.background = '#ef9f27';

  document.getElementById('btn-cancelar').classList.add('visivel');
  setErro('produto-erro', '');
  showToast('Editando "' + p.nome + '"', 'ti-pencil');
  renderizar();
}

// ── Cancelar edição ───────────────────────────────────
function cancelarEdicao() {
  editandoId = null;
  document.getElementById('nome-input').value = '';
  document.getElementById('valor-input').value = '';
  document.getElementById('qtd-input').value = '1';
  setErro('produto-erro', '');

  const btn = document.getElementById('btn-adicionar');
  btn.textContent = 'Adicionar produto';
  btn.style.background = '';

  document.getElementById('btn-cancelar').classList.remove('visivel');
  renderizar();
}

// ── Excluir ───────────────────────────────────────────
function excluir(id) {
  const p = produtos.find(x => x.id === id);
  produtos = produtos.filter(x => x.id !== id);
  if (editandoId === id) cancelarEdicao();
  renderizar();
  salvarDados();
  if (p) showToast('"' + p.nome + '" removido.', 'ti-trash');
}

// ── Limpar tudo ───────────────────────────────────────
function limparTudo() {
  if (produtos.length === 0) return;
  if (!confirm('Tem certeza que deseja limpar todos os produtos?')) return;
  produtos = [];
  cancelarEdicao();
  renderizar();
  salvarDados();
  showToast('Lista limpa com sucesso!', 'ti-trash');
}

// ── Exportar CSV ──────────────────────────────────────
function exportarCSV() {
  if (produtos.length === 0) {
    showToast('Adicione produtos antes de exportar.', 'ti-alert-circle');
    return;
  }

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const agora = new Date();
  const nomeMes = meses[agora.getMonth()];
  const ano = agora.getFullYear();
  const total = produtos.reduce((s, p) => s + p.valor, 0);
  const restante = Math.max(limite - total, 0);

  let csv = '\uFEFF';
  csv += 'Controle de Compras - ' + nomeMes + '/' + ano + '\n\n';
  csv += 'Resumo\n';
  csv += 'Limite;' + fmt(limite) + '\n';
  csv += 'Total gasto;' + fmt(total) + '\n';
  csv += 'Restante;' + fmt(restante) + '\n\n';
  csv += 'Produtos\n';
  csv += '#;Produto;Qtd.;Valor Unit.;Total\n';
  produtos.forEach((p, j) => {
    csv += (j + 1) + ';' + p.nome + ';' + p.qtd + ';' + fmt(p.valorUnit) + ';' + fmt(p.valor) + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'compras_' + nomeMes + '_' + ano + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Exportado: compras_' + nomeMes + '_' + ano + '.csv', 'ti-file-spreadsheet');
}

// ── Renderização ──────────────────────────────────────
function renderizar() {
  const total = produtos.reduce((s, p) => s + p.valor, 0);
  const restante = Math.max(limite - total, 0);
  const pct = limite > 0 ? Math.min((total / limite) * 100, 100) : 0;

  document.getElementById('m-limite').textContent = fmt(limite);
  document.getElementById('m-gasto').textContent = fmt(total);
  document.getElementById('m-restante').textContent = fmt(restante);

  const barra = document.getElementById('progress-bar');
  barra.style.width = pct.toFixed(1) + '%';
  barra.style.background = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#3b82f6';
  document.getElementById('pct-label').textContent = pct.toFixed(0) + '%';

  const alerta = document.getElementById('alert-bar');
  if (total >= limite && limite > 0) alerta.classList.add('show');
  else alerta.classList.remove('show');

  const n = produtos.length;
  document.getElementById('lista-count').textContent = n + ' produto' + (n !== 1 ? 's' : '');

  const lista = document.getElementById('lista');
  const emptyState = document.getElementById('empty-state');

  if (n === 0) {
    lista.innerHTML = '';
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    lista.innerHTML = produtos.map((p, j) => {
      const editando = editandoId === p.id ? ' editando' : '';
      return `<div class="produto-card${editando}">
        <div class="produto-left">
          <div class="produto-icon"><i class="ti ti-tag" aria-hidden="true"></i></div>
          <div class="produto-info">
            <div class="produto-nome">${escapeHtml(p.nome)}</div>
            <div class="produto-idx">${p.qtd}x ${fmt(p.valorUnit)} &mdash; Item ${j + 1}</div>
          </div>
        </div>
        <div class="produto-right">
          <span class="produto-valor">${fmt(p.valor)}</span>
          <button class="btn-edit" onclick="editar(${p.id})" aria-label="Editar">
            <i class="ti ti-pencil" aria-hidden="true"></i>
          </button>
          <button class="btn-del" onclick="excluir(${p.id})" aria-label="Excluir">
            <i class="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;
    }).join('');
  }
}

// ── Atalhos de teclado ────────────────────────────────
document.getElementById('limite-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') definirLimite();
});
document.getElementById('nome-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('valor-input').focus();
});
document.getElementById('valor-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('qtd-input').focus();
});
document.getElementById('qtd-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') adicionarProduto();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && editandoId !== null) cancelarEdicao();
});

// ── Inicialização ─────────────────────────────────────
renderizar();
