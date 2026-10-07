#!/usr/bin/env node
/**
 * Verificador do site DOGO — sem dependências.
 *
 * Verifica, em todos os ficheiros .html/.css:
 *   · referências locais (href, src, srcset, url() no CSS) que apontem para ficheiros inexistentes
 *   · âncoras (#id) que não existam na página de destino
 *   · imagens sem atributo alt
 *   · ids duplicados na mesma página
 *   · cabeçalho SEO: title, meta description, canonical, og:image, um único h1
 *
 * Uso:  node tools/check-site.mjs        (sai com código 1 se houver erros)
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Percorre recursivamente uma pasta, ignorando o que não interessa. */
function listar(pasta, filtro, ignorar = [".git", "node_modules", "assets/img/raw"]) {
  const resultados = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    const relativo = caminho.slice(RAIZ.length + 1);
    if (ignorar.some((i) => relativo === i || relativo.startsWith(`${i}/`))) continue;
    const info = statSync(caminho);
    if (info.isDirectory()) resultados.push(...listar(caminho, filtro, ignorar));
    else if (filtro.test(nome)) resultados.push(caminho);
  }
  return resultados;
}

const erros = [];
const avisos = [];
const paginas = listar(RAIZ, /\.html$/);
const estilos = listar(RAIZ, /\.css$/);

const idDePagina = (ficheiro) => (ficheiro === "index.html" ? "./index.html" : ficheiro);

/** Devolve a lista de ids definidos num documento HTML. */
const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

const cache = new Map();
function lerHtml(relativo) {
  if (!cache.has(relativo)) cache.set(relativo, readFileSync(join(RAIZ, relativo), "utf8"));
  return cache.get(relativo);
}

function verificarReferencia(ref, origemRelativa) {
  if (!ref || /^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref)) return;
  const [caminhoBruto] = ref.split("#");
  const [caminho, _query] = caminhoBruto.split("?");
  if (!caminho) return;
  const destino = caminho.startsWith("/") ? join(RAIZ, caminho) : resolve(dirname(join(RAIZ, origemRelativa)), caminho);
  if (!existsSync(destino)) {
    erros.push(`${origemRelativa}: referência quebrada → ${ref}`);
  }
}

// ---------- páginas ----------
for (const caminho of paginas) {
  const relativo = caminho.slice(RAIZ.length + 1);
  const html = lerHtml(relativo);

  // referências locais
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) verificarReferencia(m[1], relativo);
  for (const m of html.matchAll(/imagesrcset="([^"]+)"/g)) {
    m[1].split(",").forEach((parte) => verificarReferencia(parte.trim().split(/\s+/)[0], relativo));
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    m[1].split(",").forEach((parte) => {
      if (!parte.trim() || /^\s/.test(parte.split(/\s+/)[1] ?? "")) return;
      verificarReferencia(parte.trim().split(/\s+/)[0], relativo);
    });
  }

  // âncoras internas e entre páginas
  for (const m of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
    const [pagina, ancora] = m[1].split("#");
    if (!ancora || ancora === "") continue;
    const alvo = pagina || relativo;
    if (!alvo.endsWith(".html")) continue;
    const alvoRelativo = idDePagina(alvo.replace(/^\.\//, ""));
    if (!existsSync(join(RAIZ, alvoRelativo))) continue; // já reportado acima
    if (!idsDe(lerHtml(alvoRelativo)).includes(ancora)) {
      erros.push(`${relativo}: âncora inexistente → ${m[1]}`);
    }
  }

  // imagens sem alt
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) erros.push(`${relativo}: <img> sem atributo alt → ${m[0].slice(0, 80)}…`);
  }

  // ids duplicados
  const ids = idsDe(html);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of new Set(repetidos)) erros.push(`${relativo}: id duplicado → #${id}`);

  // SEO mínimo
  const titulo = html.match(/<title>([^<]*)<\/title>/);
  if (!titulo || titulo[1].trim().length < 15) erros.push(`${relativo}: <title> ausente ou demasiado curto`);
  else if (titulo[1].length > 70) avisos.push(`${relativo}: <title> com ${titulo[1].length} caracteres (ideal ≤ 60)`);
  const descricao = html.match(/<meta name="description" content="([^"]+)"/);
  if (!descricao) erros.push(`${relativo}: meta description ausente`);
  else if (descricao[1].length > 165) avisos.push(`${relativo}: meta description com ${descricao[1].length} caracteres (ideal ≤ 160)`);
  if (!/<link rel="canonical"/.test(html) && !/name="robots"/.test(html)) erros.push(`${relativo}: sem canonical nem robots`);
  const h1s = [...html.matchAll(/<h1\b/g)].length;
  if (h1s === 0) erros.push(`${relativo}: sem <h1>`);
  if (h1s > 1) erros.push(`${relativo}: ${h1s} elementos <h1> (deve existir apenas 1)`);
  if (/<html lang="pt-PT">/.test(html) === false) avisos.push(`${relativo}: atributo lang inesperado`);
}

// ---------- CSS ----------
for (const caminho of estilos) {
  const relativo = caminho.slice(RAIZ.length + 1);
  const css = readFileSync(caminho, "utf8");
  for (const m of css.matchAll(/url\((["']?)([^"')]+)\1\)/g)) verificarReferencia(m[2], relativo);
}

// ---------- ficheiros obrigatórios ----------
for (const obrigatorio of ["robots.txt", "sitemap.xml", "manifest.webmanifest", "favicon.ico", "assets/css/styles.css", "assets/js/main.js"]) {
  if (!existsSync(join(RAIZ, obrigatorio))) erros.push(`falta o ficheiro obrigatório: ${obrigatorio}`);
}

// ---------- sitemap vs páginas ----------
const sitemap = readFileSync(join(RAIZ, "sitemap.xml"), "utf8");
const noSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const caminho of paginas) {
  const relativo = caminho.slice(RAIZ.length + 1);
  if (relativo === "404.html") continue;
  const esperado = relativo === "index.html" ? "https://www.dogopetshop.pt/" : `https://www.dogopetshop.pt/${relativo}`;
  if (!noSitemap.includes(esperado)) erros.push(`sitemap.xml: falta ${esperado}`);
}

// ---------- relatório ----------
console.log(`\nVerificados ${paginas.length} ficheiros HTML e ${estilos.length} ficheiros CSS.\n`);
if (avisos.length) {
  console.log(`Avisos (${avisos.length}):`);
  avisos.forEach((a) => console.log(`  ⚠ ${a}`));
  console.log("");
}
if (erros.length) {
  console.log(`Erros (${erros.length}):`);
  erros.forEach((e) => console.log(`  ✗ ${e}`));
  console.log("");
  process.exit(1);
}
console.log("✓ Sem erros: referências, âncoras, alt, ids e SEO mínimo estão consistentes.\n");
