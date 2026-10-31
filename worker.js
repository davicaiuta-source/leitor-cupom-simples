// Proxy da nota fiscal para o Cloudflare Workers.
// Cole este código no editor do Worker (dash.cloudflare.com → Workers & Pages) e clique em Deploy.
// Uso: https://SEU-WORKER.workers.dev/<URL da SEFAZ>   (ou ?url=<URL codificada>)

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const reqUrl = new URL(request.url);
    const path = decodeURIComponent(reqUrl.pathname.slice(1));
    const target = /^https?:\/\//i.test(path)
      ? path + reqUrl.search
      : reqUrl.searchParams.get('url');
    if (!target) return new Response('Informe a URL: /https://... ou ?url=', { status: 400, headers: cors });

    let host;
    try { host = new URL(target).hostname; } catch (_) {
      return new Response('URL inválida', { status: 400, headers: cors });
    }
    // Só libera sites do governo, para ninguém usar seu proxy para outras coisas
    if (!/(^|\.)gov\.br$/i.test(host)) {
      return new Response('Somente sites .gov.br', { status: 403, headers: cors });
    }

    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      redirect: 'follow'
    });

    return new Response(res.body, {
      status: res.status,
      headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'text/html' }
    });
  }
};
