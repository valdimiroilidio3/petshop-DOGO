/* ==========================================================================
   DOGO · Pet Shop & Grooming — interatividade
   Sem dependências. Tudo o que não precisa de JS funciona sem JS.
   1) dados do negócio 2) cabeçalho/menu 3) revelações 4) voltar ao topo
   5) horários 6) links de WhatsApp 7) formulário de marcação
   ========================================================================== */

(() => {
  "use strict";

  /* 1) Dados do negócio (fonte única — basta editar aqui) ------------------ */
  const NEGOCIO = {
    nome: "DOGO · Pet Shop & Grooming",
    telefoneVisivel: "+351 912 345 678",
    telefoneLink: "+351912345678",
    whatsapp: "351912345678", // formato internacional, sem "+" nem espaços
    email: "ola@dogopetshop.pt",
    morada: "Rua da Sofia 42, 3000-390 Coimbra",
    esperaResposta: "2 horas",
  };
  window.DOGO = NEGOCIO;

  /* Horário de funcionamento: 0=domingo … 6=sábado.
     null = fechado. Valores em horas decimais [inicio, fim]. */
  const HORARIO_SEMANA = {
    0: null,
    1: [[9, 11], [11, 13], [14, 16], [16, 18]],
    2: [[9, 11], [11, 13], [14, 16], [16, 18]],
    3: [[9, 11], [11, 13], [14, 16], [16, 18]],
    4: [[9, 11], [11, 13], [14, 16], [16, 18]],
    5: [[9, 11], [11, 13], [14, 16], [16, 18]],
    6: [[9, 11], [11, 13], [14, 16]],
  };

  const DIAS_MAX_MARCACAO = 60;

  const $ = (seletor, contexto = document) => contexto.querySelector(seletor);
  const $$ = (seletor, contexto = document) => Array.from(contexto.querySelectorAll(seletor));

  const hhmm = (hora) => `${String(Math.floor(hora)).padStart(2, "0")}:${String(Math.round((hora % 1) * 60)).padStart(2, "0")}`;
  const dataISO = (data) => {
    const fuso = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
    return fuso.toISOString().slice(0, 10);
  };

  /* 2) Cabeçalho e menu ---------------------------------------------------- */
  function iniciarTopo() {
    const topo = $(".topo");
    if (!topo) return;

    const aplicarSombra = () => topo.classList.toggle("topo--fixo", window.scrollY > 12);
    aplicarSombra();
    window.addEventListener("scroll", aplicarSombra, { passive: true });

    const botao = $(".hamburguer", topo);
    const menu = $("#menu-movel");
    if (!botao || !menu) return;

    const abrir = () => {
      botao.setAttribute("aria-expanded", "true");
      menu.setAttribute("data-aberto", "");
      const primeiro = $("a, button", menu);
      if (primeiro) primeiro.focus({ preventScroll: true });
    };
    const fechar = (devolverFoco = false) => {
      botao.setAttribute("aria-expanded", "false");
      menu.removeAttribute("data-aberto");
      if (devolverFoco) botao.focus({ preventScroll: true });
    };
    const alternar = () => (botao.getAttribute("aria-expanded") === "true" ? fechar(true) : abrir());

    botao.addEventListener("click", alternar);
    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && botao.getAttribute("aria-expanded") === "true") fechar(true);
    });
    menu.addEventListener("click", (evento) => {
      if (evento.target.closest("a")) fechar();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 860 && botao.getAttribute("aria-expanded") === "true") fechar();
    });
  }

  /* 3) Revelar ao entrar no ecrã ------------------------------------------- */
  function iniciarRevelacoes() {
    const itens = $$(".revelar");
    if (!itens.length) return;

    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (semMovimento || !("IntersectionObserver" in window)) {
      itens.forEach((item) => item.setAttribute("data-visivel", ""));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada, indice) => {
          if (!entrada.isIntersecting) return;
          const atraso = Math.min(indice * 80, 320);
          window.setTimeout(() => entrada.target.setAttribute("data-visivel", ""), atraso);
          observador.unobserve(entrada.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    itens.forEach((item) => observador.observe(item));
  }

  /* 4) Botão voltar ao topo ------------------------------------------------ */
  function iniciarVoltarTopo() {
    const botao = $(".voltar-topo");
    if (!botao) return;
    const aplicar = () => botao.toggleAttribute("data-visivel", window.scrollY > 600);
    aplicar();
    window.addEventListener("scroll", aplicar, { passive: true });
    botao.addEventListener("click", () => {
      const destino = $("#conteudo") || document.body;
      destino.scrollIntoView({ behavior: "smooth", block: "start" });
      const alvoFoco = $("#conteudo h1");
      if (alvoFoco) alvoFoco.setAttribute("tabindex", "-1");
      if (alvoFoco) alvoFoco.focus({ preventScroll: true });
    });
  }

  /* 5) Marcar o dia de hoje na tabela de horários -------------------------- */
  function iniciarHorarios() {
    const tabelas = $$(".horarios");
    if (!tabelas.length) return;
    const hoje = new Date().getDay();
    tabelas.forEach((tabela) => {
      $$("tr[data-dia]", tabela).forEach((linha) => {
        if (Number(linha.dataset.dia) === hoje) linha.classList.add("hoje");
      });
    });
  }

  /* 6) Links de WhatsApp pré-preenchidos ----------------------------------- */
  function linkWhatsApp(mensagem) {
    return `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(mensagem)}`;
  }

  function iniciarLinksWhatsApp() {
    $$("[data-wa]").forEach((elemento) => {
      const assunto = elemento.dataset.wa ? `${elemento.dataset.wa}\n` : "";
      const mensagem = elemento.dataset.waMensagem || `Ola! Vim pelo site do DOGO.\n${assunto}`.trim();
      elemento.setAttribute("href", linkWhatsApp(mensagem));
      elemento.setAttribute("target", "_blank");
      elemento.setAttribute("rel", "noopener");
    });
  }

  /* 7) Formulário de marcação --------------------------------------------- */
  const MENSAGENS = {
    nome: "Escreva o seu nome completo (mínimo 3 letras).",
    telefone: "Indique um telefone válido com 9 dígitos (ex.: 912 345 678).",
    email: "O email parece incompleto. Confirme, por favor (ex.: nome@exemplo.pt).",
    animal: "Diga-nos como se chama o seu companheiro.",
    tipo: "Escolha cão, gato ou outro.",
    porte: "Escolha o porte do animal para calcularmos o preço.",
    servico: "Escolha o serviço pretendido.",
    data: "Escolha uma data para a marcação.",
    dataFechada: "Estamos fechados ao domingo. Escolha outro dia, por favor.",
    horario: "Escolha um horário disponível.",
    consentimento: "Precisamos do seu consentimento para guardar estes dados.",
  };

  function iniciarFormulario() {
    const formulario = $("#form-marcacao");
    if (!formulario) return;

    const sucesso = $("#marcacao-sucesso");
    const campoData = $("#data", formulario);
    const dataAjuda = $("#data-ajuda", formulario);
    const slotsCaixa = $("#slots", formulario);
    const slotsLegenda = $("#slots-legenda", formulario);

    /* datas possíveis */
    const hoje = new Date();
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + DIAS_MAX_MARCACAO);
    if (campoData) {
      campoData.min = dataISO(hoje);
      campoData.max = dataISO(limite);
    }

    const textoDia = (data) =>
      new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(data);

    /* desenhar horários consoante o dia escolhido */
    function desenharSlots() {
      if (!slotsCaixa || !campoData) return;
      const valor = campoData.value;
      slotsCaixa.innerHTML = "";
      const grupoHorario = $("[data-grupo-horario]", formulario);
      if (grupoHorario) grupoHorario.removeAttribute("data-invalido");

      if (!valor) {
        slotsCaixa.innerHTML = '<p class="slots__vazio">Escolha primeiro a data para ver os horários livres.</p>';
        return;
      }

      const data = new Date(`${valor}T12:00:00`);
      const faixas = HORARIO_SEMANA[data.getDay()];

      if (!faixas) {
        slotsCaixa.innerHTML = '<p class="slots__vazio">Estamos fechados ao domingo. Escolha outro dia ou ligue-nos: ' +
          `<a href="tel:${NEGOCIO.telefoneLink}">${NEGOCIO.telefoneVisivel}</a>.</p>`;
        return;
      }

      const futuroMinimo = new Date(Date.now() + 60 * 60 * 1000); // 1h de antecedência
      let disponiveis = 0;

      faixas.forEach(([inicio, fim]) => {
        const inicioSlot = new Date(data);
        inicioSlot.setHours(inicio, 0, 0, 0);

        const etiqueta = document.createElement("label");
        etiqueta.className = "slot";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "horario";
        input.required = true;
        input.value = `${hhmm(inicio)}–${hhmm(fim)}`;
        input.id = `slot-${hhmm(inicio).replace(":", "")}`;

        const indisponivel = dataISO(data) === dataISO(new Date()) && inicioSlot <= futuroMinimo;
        input.disabled = indisponivel;
        if (!indisponivel) disponiveis += 1;

        const texto = document.createElement("span");
        texto.textContent = `${hhmm(inicio)}–${hhmm(fim)}`;

        etiqueta.append(input, texto);
        slotsCaixa.append(etiqueta);
      });

      if (disponiveis === 0) {
        const nota = document.createElement("p");
        nota.className = "slots__vazio";
        nota.innerHTML = `Já não há vagas para ${textoDia(data)}. Escolha outro dia ou ligue-nos: ` +
          `<a href="tel:${NEGOCIO.telefoneLink}">${NEGOCIO.telefoneVisivel}</a>.`;
        slotsCaixa.append(nota);
      }
    }

    if (campoData) {
      campoData.addEventListener("change", () => {
        const data = new Date(`${campoData.value}T12:00:00`);
        const fechado = campoData.value && !HORARIO_SEMANA[data.getDay()];
        if (dataAjuda) {
          dataAjuda.textContent = campoData.value && !fechado
            ? `${textoDia(data)}, ${HORARIO_SEMANA[data.getDay()].length} períodos disponíveis.`
            : "Segunda a sábado. Escolha um dia para ver os horários livres.";
        }
        if (slotsLegenda) slotsLegenda.textContent = campoData.value && !fechado ? `Horários para ${textoDia(data)}` : "Horários disponíveis";
        desenharSlots();
      });
      desenharSlots();
    }

    /* validação */
    const validadores = {
      nome: (v) => v.trim().length >= 3 || MENSAGENS.nome,
      telefone: (v) => {
        const digitos = v.replace(/\D/g, "");
        /* Portugal: rede fixa (2), serviços (3) e telemóvel (9), com ou sem indicativo +351 */
        const valido = (digitos.length === 9 && /^[239]/.test(digitos)) || (digitos.length === 12 && digitos.startsWith("351"));
        return valido || MENSAGENS.telefone;
      },
      email: (v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim()) || MENSAGENS.email,
      animalNome: (v) => v.trim().length >= 2 || MENSAGENS.animal,
      tipo: (v) => Boolean(v) || MENSAGENS.tipo,
      servico: (v) => Boolean(v) || MENSAGENS.servico,
      data: (v) => {
        if (!v) return MENSAGENS.data;
        const data = new Date(`${v}T12:00:00`);
        if (!HORARIO_SEMANA[data.getDay()]) return MENSAGENS.dataFechada;
        return true;
      },
    };

    function validarCampo(campo) {
      const caixa = campo.closest(".campo") || campo.closest(".campo-grupo");
      const validador = validadores[campo.name];
      let resultado = true;

      if (validador) {
        resultado = validador(campo.value);
      } else if (campo.type === "checkbox") {
        resultado = !campo.required || campo.checked || MENSAGENS.consentimento;
      } else if (campo.type === "radio") {
        /* um grupo de radios é obrigatório se qualquer elemento do grupo o for */
        const grupo = $$(`input[name="${campo.name}"]`, formulario);
        const obrigatorio = grupo.some((radio) => radio.required);
        resultado = !obrigatorio || grupo.some((radio) => radio.checked) || (MENSAGENS[campo.name] || "Escolha uma opção.");
      }

      const valido = resultado === true;
      if (caixa) {
        caixa.toggleAttribute("data-invalido", !valido);
        const aviso = $(".erro-campo", caixa);
        if (aviso) aviso.textContent = valido ? "" : String(resultado);
      }
      if (campo.setAttribute) campo.setAttribute("aria-invalid", String(!valido));
      return valido;
    }

    /* Validação delegada: funciona também para os horários criados dinamicamente */
    formulario.addEventListener("change", (evento) => {
      if (evento.target.matches("input, select, textarea")) validarCampo(evento.target);
    });
    formulario.addEventListener("focusout", (evento) => {
      const campo = evento.target;
      if (campo.matches("input, select, textarea") && campo.type !== "radio" && campo.name !== "consentimento") validarCampo(campo);
    });
    formulario.addEventListener("input", (evento) => {
      const caixa = evento.target.closest(".campo");
      if (caixa && caixa.hasAttribute("data-invalido")) validarCampo(evento.target);
    });

    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();

      /* honeypot: se preenchido, é bot — fingimos sucesso e não enviamos nada */
      const armadilha = $(".armadilha input", formulario);
      if (armadilha && armadilha.value) {
        formulario.reset();
        return;
      }

      /* percorre cada campo uma única vez por nome (grupos de radios contam como um) */
      const nomesVistos = new Set();
      let primeiroInvalido = null;
      $$("input, select, textarea", formulario)
        .filter((campo) => campo.type !== "hidden" && campo.name !== "website")
        .forEach((campo) => {
          if (nomesVistos.has(campo.name)) return;
          nomesVistos.add(campo.name);
          if (validarCampo(campo)) return;
          const caixa = campo.closest(".campo");
          if (!primeiroInvalido && caixa && caixa.hasAttribute("data-invalido")) primeiroInvalido = campo;
        });

      if (primeiroInvalido) {
        primeiroInvalido.focus({ preventScroll: true });
        primeiroInvalido.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const dados = Object.fromEntries(new FormData(formulario).entries());
      const mensagem = [
        `Olá DOGO! Gostaria de marcar um serviço.`,
        ``,
        `Tutor: ${dados.nome}`,
        `Telefone: ${dados.telefone}`,
        dados.email ? `Email: ${dados.email}` : null,
        `Animal: ${dados.animalNome} (${dados.tipo}, porte ${dados.porte})`,
        `Serviço: ${dados.servico}`,
        `Data: ${dados.data} às ${dados.horario}`,
        dados.notas ? `Notas: ${dados.notas}` : null,
        dados.recolha ? `Recolha ao domicílio: sim (3 €)` : null,
      ].filter((linha) => linha !== null).join("\n");

      /* resumo no ecrã */
      if (sucesso) {
        const resumo = $(".sucesso__resumo", sucesso);
        if (resumo) {
          resumo.innerHTML = `<dl>
            <dt>Tutor</dt><dd>${dados.nome}</dd>
            <dt>Animal</dt><dd>${dados.animalNome} · ${dados.tipo} · porte ${dados.porte}</dd>
            <dt>Serviço</dt><dd>${dados.servico}</dd>
            <dt>Data</dt><dd>${textoDia(new Date(`${dados.data}T12:00:00`))} · ${dados.horario}</dd>
            <dt>Contacto</dt><dd>${dados.telefone}</dd>
          </dl>`;
        }
        const linkWa = $("[data-wa-confirmar]", sucesso);
        if (linkWa) linkWa.setAttribute("href", linkWhatsApp(mensagem));

        formulario.hidden = true;
        sucesso.setAttribute("data-visivel", "");
        sucesso.setAttribute("tabindex", "-1");
        sucesso.focus({ preventScroll: true });
        sucesso.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      /* Se existir um backend, ative o envio real:
         fetch(formulario.dataset.endpoint, { method: "POST", body: new FormData(formulario) }) */
    });

    /* botão "limpar e fazer nova marcação" */
    const reiniciar = $("[data-nova-marcacao]", document);
    if (reiniciar) {
      reiniciar.addEventListener("click", () => {
        formulario.reset();
        formulario.hidden = false;
        if (sucesso) sucesso.removeAttribute("data-visivel");
        desenharSlots();
        const primeiro = $("input, select", formulario);
        if (primeiro) primeiro.focus({ preventScroll: true });
        window.scrollTo({ top: formulario.offsetTop - 120, behavior: "smooth" });
      });
    }
  }

  /* Arranque --------------------------------------------------------------- */
  function iniciar() {
    const ano = $("[data-ano]");
    if (ano) ano.textContent = String(new Date().getFullYear());
    iniciarTopo();
    iniciarRevelacoes();
    iniciarVoltarTopo();
    iniciarHorarios();
    iniciarLinksWhatsApp();
    iniciarFormulario();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
