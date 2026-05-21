const videoPatterns = [
  {
    match: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    extract: (m: RegExpMatchArray) => m[1],
    embed: (id: string) => `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
  },
  {
    match: /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
    extract: (m: RegExpMatchArray) => m[1],
    embed: (id: string) => `<iframe src="https://player.bilibili.com/player.html?bvid=${id}&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" width="560" height="315"></iframe>`,
  },
  {
    match: /vimeo\.com\/(\d+)/,
    extract: (m: RegExpMatchArray) => m[1],
    embed: (id: string) => `<iframe src="https://player.vimeo.com/video/${id}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
  },
];

export function convertVideoLinksToEmbeds(html: string): string {
  let result = html;
  for (const pattern of videoPatterns) {
    // Find links matching the pattern and replace with embeds
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
    result = result.replace(linkRegex, (match, href, text) => {
      const m = href.match(pattern.match);
      if (m) {
        return pattern.embed(pattern.extract(m));
      }
      return match;
    });
    // Also find plain text URLs
    const urlRegex = /(?<!["'=\w])(https?:\/\/[^\s<>"']{3,200})(?![^<]*>)/g;
    result = result.replace(urlRegex, (url) => {
      const m = url.match(pattern.match);
      if (m) {
        return pattern.embed(pattern.extract(m));
      }
      return url;
    });
  }
  return result;
}
