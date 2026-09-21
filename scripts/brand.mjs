// The institution behind the course, in one place. Every generated page — the
// overview, the problem set pages, the placeholder and the 404 — reads its
// colours, its logo and the university's name from here, so bringing the site
// in line with the brand is a matter of editing this file and dropping the
// logo into public/assets/.
//
// The palette holds every colour the stylesheet uses, for both schemes. Keep
// each text/background pair at or above 4.5:1 (WCAG AA): ink and muted on bg
// and panel; accent on bg, panel and accent-soft; ok on bg, panel and ok-soft.

export const brand = {
  university: {
    mn: 'Санхүү эдийн засгийн их сургууль',
    mnShort: 'СЭЗИС',
    en: 'University of Finance and Economics',
    enShort: 'UFE',
    url: 'https://www.ufe.edu.mn/',
  },

  // The official mark, cut from the university's logo file (public/assets/):
  // the blue logo for light backgrounds, a white recolour for dark ones, and
  // the shield emblem on its own for the favicon. When a file is missing the
  // build renders nothing in its place, so the pages never show a broken image.
  logo: {
    file: 'ufe-logo.png',
    dark: 'ufe-logo-white.png',
    mark: 'ufe-mark.png',
    width: 906,
    height: 192,
    alt: 'Санхүү эдийн засгийн их сургууль — UFE',
  },

  // UFE blue, read from the logo itself: #0045e7. On dark backgrounds the same
  // hue is lifted so it still reads as text (7.4:1 on the dark background).

  colors: {
    light: {
      bg: '#f5f6fa',
      panel: '#ffffff',
      ink: '#13182a',
      muted: '#5a6178',
      line: '#e2e5ee',
      rule: '#b6bccc',
      accent: '#0045e7',
      'accent-soft': '#e5ecff',
      ok: '#2b6743',
      'ok-soft': '#e3efe7',
    },
    dark: {
      bg: '#0f1526',
      panel: '#171d31',
      ink: '#eceff6',
      muted: '#a6adc2',
      line: '#2a3350',
      rule: '#4a5578',
      accent: '#7fa3ff',
      'accent-soft': '#1b2a55',
      ok: '#8ccfa4',
      'ok-soft': '#16302a',
    },
  },
}
