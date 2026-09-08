/** Match a generated production sitemap to the local test server's origin.
 * Material 9.7.7 copies protocol/hostname when loading a sitemap, but not the
 * server port. Retaining production URLs would silently test full reloads.
 * Only sitemap locations change; the application and generated pages stay intact.
 */
function localSitemap(body, baseUrl) {
  const origin = new URL(baseUrl).origin;
  return body.toString('utf8').replace(/<loc>(https?:\/\/[^<]+)<\/loc>/g, (_, location) => {
    const url = new URL(location);
    return `<loc>${origin}${url.pathname}${url.search}${url.hash}</loc>`;
  });
}

module.exports = { localSitemap };
