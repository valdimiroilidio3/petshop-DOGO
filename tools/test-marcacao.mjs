/**
 * Testes de integração do formulário de marcação (requer jsdom).
 *
 *   npm install        # instala o jsdom (única dependência de desenvolvimento)
 *   npm test
 *
 * Verifica os caminhos que mais importam ao negócio:
 *   1. horários gerados conforme o dia escolhido (incluindo domingo fechado)
 *   2. validação a impedir envio com campos em falta
 *   3. envio válido → resumo apresentado e link de WhatsApp com todos os dados
 *   4. proteção anti-spam (honeypot) a bloquear envios automáticos
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(RAIZ, "marcacoes.html"), "utf8");
const js = readFileSync(join(RAIZ, "assets/js/main.js"), "utf8");

let falhas = 0;
const assert = (condicao, mensagem) => {
  if (condicao) {
    console.log(`  ✓ ${mensagem}`);
  } else {
    falhas += 1;
    console.log(`  ✗ ${mensagem}`);
  }
};

/** Cria uma página nova com o HTML+JS reais do site. */
function montarPagina() {
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://www.dogopetshop.pt/marcacoes.html" });
  const { window } = dom;
  // APIs que o jsdom não implementa e que o site usa
  window.Element.prototype.scrollIntoView = function () {};
  window.scrollTo = () => {};
  window.eval(js);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return window;
}

/** Próximo dia com a hora de funcionamento pedida (0=domingo). */
function proximoDia(diaSemana) {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  while (data.getDay() !== diaSemana) data.setDate(data.getDate() + 1);
  return data;
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const preencher = (window, valores) => {
  Object.entries(valores).forEach(([nome, valor]) => {
    const campo = window.document.querySelector(`[name="${nome}"]`);
    if (!campo) throw new Error(`campo inexistente: ${nome}`);
    if (campo.type === "checkbox") campo.checked = valor === true;
    else campo.value = valor;
  });
};

const disparar = (window, elemento, tipo) => elemento.dispatchEvent(new window.Event(tipo, { bubbles: true }));

console.log("\n1. Geração de horários");
{
  const window = montarPagina();
  const { document } = window;
  const campoData = document.querySelector("#data");
  const slots = document.querySelector("#slots");

  assert(slots.querySelectorAll("input[name='horario']").length === 0, "sem data escolhida não há horários");

  campoData.value = iso(proximoDia(3)); // quarta-feira
  disparar(window, campoData, "change");
  assert(slots.querySelectorAll("input[name='horario']").length === 4, "quarta-feira oferece 4 períodos (09–11, 11–13, 14–16, 16–18)");

  campoData.value = iso(proximoDia(6)); // sábado
  disparar(window, campoData, "change");
  assert(slots.querySelectorAll("input[name='horario']").length === 3, "sábado oferece 3 períodos");

  campoData.value = iso(proximoDia(0)); // domingo
  disparar(window, campoData, "change");
  assert(slots.querySelectorAll("input[name='horario']").length === 0, "domingo não oferece horários");
  assert(/fechad/i.test(slots.textContent), "domingo explica que estamos fechados");
  assert(Number(campoData.min.split("-")[0]) > 2000, "data mínima definida para hoje (não se marca no passado)");
  window.close();
}

console.log("\n2. Validação");
{
  const window = montarPagina();
  const { document } = window;
  const formulario = document.querySelector("#form-marcacao");

  disparar(window, formulario, "submit");
  const invalidos = document.querySelectorAll("[data-invalido]").length;
  assert(invalidos >= 6, `envio vazio marca os campos obrigatórios (${invalidos} assinalados)`);
  assert(!document.querySelector("#marcacao-sucesso").hasAttribute("data-visivel"), "não mostra sucesso sem dados");

  preencher(window, { nome: "Al", telefone: "123", email: "ana@", animalNome: "K", tipo: "", servico: "", data: "" });
  disparar(window, formulario, "submit");
  const mensagens = [...document.querySelectorAll(".erro-campo")].map((p) => p.textContent).join(" ");
  assert(/nome completo/i.test(mensagens), "nome demasiado curto é recusado");
  assert(/9 dígitos/i.test(mensagens), "telefone inválido explica o formato esperado");
  assert(/email parece incompleto/i.test(mensagens), "email mal formado é recusado");
  window.close();
}

console.log("\n3. Envio válido");
{
  const window = montarPagina();
  const { document } = window;
  const formulario = document.querySelector("#form-marcacao");
  const dia = iso(proximoDia(4)); // quinta-feira

  preencher(window, {
    nome: "Maria Silva", telefone: "912345678", email: "maria@exemplo.pt",
    animalNome: "Kira", tipo: "Cão", servico: "Banho + tosa completa", data: dia,
    notas: "Tem medo do secador",
  });
  disparar(window, document.querySelector("#data"), "change");
  document.querySelector("input[name='porte'][value='Pequeno']").checked = true;
  const slot = document.querySelector("input[name='horario']");
  slot.checked = true;
  preencher(window, { recolha: true, consentimento: true });

  disparar(window, formulario, "submit");

  const sucesso = document.querySelector("#marcacao-sucesso");
  assert(sucesso.hasAttribute("data-visivel"), "mostra o painel de confirmação");
  assert(formulario.hidden === true, "esconde o formulário depois de enviar");

  const resumo = sucesso.querySelector(".sucesso__resumo").textContent;
  assert(resumo.includes("Maria Silva") && resumo.includes("Kira"), "o resumo mostra tutor e animal");
  assert(resumo.includes("Banho + tosa completa"), "o resumo mostra o serviço escolhido");

  const link = sucesso.querySelector("[data-wa-confirmar]").getAttribute("href");
  const mensagem = decodeURIComponent(link.split("text=")[1]);
  assert(/^https:\/\/wa\.me\/351912345678\?text=/.test(link), "o link usa o número de WhatsApp configurado");
  ["Maria Silva", "Kira", "Banho + tosa completa", dia, "Pequeno", "Tem medo do secador"].forEach((esperado) => {
    assert(mensagem.includes(esperado), `a mensagem de WhatsApp inclui "${esperado}"`);
  });
  window.close();
}

console.log("\n4. Anti-spam");
{
  const window = montarPagina();
  const { document } = window;
  const formulario = document.querySelector("#form-marcacao");
  document.querySelector("#website").value = "http://spam.example";
  disparar(window, formulario, "submit");
  assert(!document.querySelector("#marcacao-sucesso").hasAttribute("data-visivel"), "bot com honeypot preenchido não vê confirmação");
  assert(formulario.hidden === false, "formulário permanece intacto para o bot");
  window.close();
}

console.log("\n5. Navegação e interatividade");
{
  const window = montarPagina();
  const { document } = window;
  const botao = document.querySelector(".hamburguer");
  const menu = document.querySelector("#menu-movel");
  botao.click();
  assert(botao.getAttribute("aria-expanded") === "true", "botão do menu atualiza aria-expanded");
  assert(menu.hasAttribute("data-aberto"), "menu móvel abre");
  botao.click();
  assert(!menu.hasAttribute("data-aberto"), "menu móvel fecha");

  const ano = document.querySelector("[data-ano]");
  assert(ano.textContent === String(new Date().getFullYear()), "ano do rodapé é atualizado automaticamente");
  window.close();
}

console.log(falhas === 0 ? "\n✓ Todos os testes passaram.\n" : `\n✗ ${falhas} teste(s) falharam.\n`);
process.exit(falhas === 0 ? 0 : 1);
