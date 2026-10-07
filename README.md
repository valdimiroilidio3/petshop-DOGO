# DOGO · Pet Shop & Grooming (Coimbra)

Site institucional e de marcações para um pet shop com **banho & tosa, loja e consultas veterinárias** em Coimbra.

Construído em **HTML, CSS e JavaScript puros** — sem frameworks, sem passo de build e sem dependências em produção. Abre-se em qualquer alojamento estático (GitHub Pages, Netlify, Vercel, servidor da loja) e carrega em menos de um segundo.

- **5 páginas + 404**: início, serviços e preçário, loja, marcações e contactos.
- **Marcação online real**: escolha do dia e da hora com validação a sério, resumo do pedido e envio por WhatsApp já preenchido.
- **SEO local**: dados estruturados `PetStore`, `Service`, `FAQPage`, `ItemList`, sitemaps e Open Graph.
- **Acessibilidade AA**: navegação por teclado, foco visível, leitores de ecrã, contraste conforme WCAG 2.1.
- **Sem cookies de rastreio** e sem pedidos a terceiros (fontes e imagens são servidas do próprio domínio).

---

## Arrancar localmente

```bash
git clone https://github.com/valdimiroilidio3/petshop-DOGO.git
cd petshop-DOGO
python3 -m http.server 4173     # ou: npm run dev
# abrir http://localhost:4173
```

Não é preciso `npm install` para ver o site. O `npm install` só é necessário para correr os testes.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor local em `http://localhost:4173` (equivale a `python3 -m http.server 4173`) |
| `npm run check` | Verifica referências, âncoras, `alt`, ids duplicados e SEO mínimo em todas as páginas |
| `npm test` | Testes de integração do formulário de marcação (requer `npm install`, usa jsdom) |
| `npm run verify` | Corre o `check` e os testes |
| `npm run assets` | Regenera as imagens WebP, ícones e `og-cover.jpg` a partir dos originais |

## Estrutura

```
.
├── index.html              # Início: proposta de valor, serviços, produtos, depoimentos, visita
├── servicos.html           # Serviços, o que está incluído, preçário por porte, FAQ
├── loja.html               # Produtos, categorias, entregas e devoluções
├── marcacoes.html          # Formulário de marcação (o coração do site)
├── contactos.html          # Contactos, mapa, transportes, privacidade e acessibilidade
├── 404.html                # Página de erro com caminhos alternativos
├── manifest.webmanifest    # Instalação no telemóvel (PWA básico)
├── robots.txt / sitemap.xml
├── assets/
│   ├── css/styles.css      # Sistema de design: variáveis, grelhas, componentes, responsivo
│   ├── js/main.js          # Menu, revelações, horários, validação, links de WhatsApp
│   ├── fonts/              # Nunito e Nunito Sans (self-hosted, subconjunto latino)
│   └── img/                # WebP otimizado + ícones + og-cover
└── tools/
    ├── build-assets.py     # Pipeline de imagens (Pillow)
    ├── check-site.mjs      # Verificador de links/SEO
    └── test-marcacao.mjs   # Testes do formulário (jsdom)
```

## Personalizar

**1. Contactos e horários.** Os dados do negócio vivem num único sítio: o objeto `NEGOCIO` no topo de `assets/js/main.js` (telefone, WhatsApp, email, morada). Os links com `data-wa` recebem automaticamente o número e a mensagem certa. No HTML, substitua ainda o telefone/morada nas secções de contacto e no rodapé.

**2. Preços e serviços.** Tabela em `servicos.html#precos` e opções de `select[name="servico"]` em `marcacoes.html`. Os valores são de exemplo.

**3. Horário de marcação.** A constante `HORARIO_SEMANA` em `assets/js/main.js` define os períodos por dia da semana (`0` = domingo, `null` = fechado). Exemplo de um dia com três períodos:

```js
3: [[9, 11], [11, 13], [14, 16]],   // quarta-feira
```

**4. Domínio.** Em todas as páginas, troque `https://www.dogopetshop.pt` no `canonical`, `og:url`, `og:image`, no `sitemap.xml` e no `robots.txt`.

**5. Imagens.** Coloque os originais em `assets/img/raw/` com os nomes usados em `JOBS` (`tools/build-assets.py`), corra `npm run assets` e as versões WebP são geradas nas larguras certas. Para reexportar apenas algumas: `python3 tools/build-assets.py hero loja`.

**6. Receber marcações num backend.** O formulário valida e mostra a confirmação no cliente e, por omissão, o pedido segue por WhatsApp. Para o enviar também para um serviço (Formspree, Google Forms, função serverless própria), acrescente `data-endpoint="https://…"` ao `<form id="form-marcacao">` e ative o `fetch` já comentado no fim do bloco de submissão em `assets/js/main.js`.

## Publicar

**GitHub Pages** — *Settings → Pages → Deploy from a branch* e escolha a pasta raiz. O site funciona sem mais configuração porque todos os caminhos são relativos.

**Netlify / Vercel** — arraste a pasta ou ligue o repositório. Não há comando de build (deixe vazio e publique a raiz).

Depois de publicar:
1. confirme o `canonical` e o `og:image` com o domínio final;
2. submeta `sitemap.xml` ao Google Search Console;
3. crie/atualize o perfil Google Business com morada, horário e fotos — é o que traz mais visitas a um pet shop local;
4. acrescente avaliações reais com `aggregateRating`/`review` ao JSON-LD (por decisão consciente não incluímos avaliações fictícias).

## Qualidade

- **Desempenho**: sem JavaScript de terceiros; CSS único (~20 KB), JS único (~12 KB) e ~20 KB de fontes com subconjunto latino. Imagens WebP com `srcset`, `loading="lazy"` e `width`/`height` declarados para evitar deslocamentos de layout. A imagem do hero é previamente carregada.
- **Acessibilidade**: ligação "saltar para o conteúdo", marcos semânticos, `aria-current` na página ativa, `aria-expanded` no menu, foco visível, mensagens de erro associadas com `role="alert"`, contraste AA e suporte a `prefers-reduced-motion`.
- **Formulários**: validação no cliente com mensagens em português, data mínima = hoje, horários do passado bloqueados, domingo fechado e armadilha anti-spam (honeypot).
- **Privacidade**: sem cookies nem rastreio; a política de privacidade em `contactos.html#privacidade` é escrita em linguagem simples.

## Estado e próximos passos

- [ ] **Substituir as fotos de banco por fotografias reais** da loja, da equipa e dos animais — o que converte melhor é sempre o animal do cliente que já cá veio.
- [ ] Algumas imagens atuais têm embutida marca inglesa de banco de imagens (embalagens, paredes). Regenerar/substituir ao trocar pelas fotos reais.
- [ ] Passar de 5 para 8–12 produtos na loja, com stock e preço atualizáveis.
- [ ] Avaliações reais (Google) no JSON-LD e na página inicial.
- [ ] Integrar as marcações com a agenda real (Google Calendar ou software de gestão da loja).
- [ ] Programa de fidelização (ex.: o 6.º banho é oferta) e lembretes de vacinas por WhatsApp.

## Conteúdo de exemplo

Os contactos, preços, avaliações e testemunhos são **fictícios**, para demonstração do layout e do comportamento. Substitua por dados reais antes de publicar: veja `assets/js/main.js` (`NEGOCIO`), `servicos.html#precos` e `index.html`.

## Licenças

Código sob MIT. Tipografia [Nunito](https://fonts.google.com/specimen/Nunito) e [Nunito Sans](https://fonts.google.com/specimen/Nunito+Sans) (SIL Open Font License 1.1), obtidas pelos pacotes `@fontsource`. Fotografias geradas para demonstração — confirme os direitos antes de uso comercial.
