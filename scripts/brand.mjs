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

  // Put the official logo at public/assets/<file>. SVG is best (it stays sharp
  // and carries its own colours); a PNG works too. When the file is present the
  // build shows it in the sidebar and on the self-contained pages; when it is
  // absent nothing is rendered and the pages fall back to the text mark.
  logo: {
    file: 'ufe-logo.svg',
    alt: 'Санхүү эдийн засгийн их сургууль',
  },

  colors: {
    light: {
      bg: '#f5f4f0',
      panel: '#ffffff',
      ink: '#1c1b19',
      muted: '#5f5d56',
      line: '#e3e1da',
      rule: '#b9b6ad',
      accent: '#a3461f',
      'accent-soft': '#f8e8df',
      ok: '#2b6743',
      'ok-soft': '#e3efe7',
    },
    dark: {
      bg: '#151511',
      panel: '#1e1e19',
      ink: '#ecebe5',
      muted: '#a8a59c',
      line: '#33322b',
      rule: '#4d4b43',
      accent: '#ec8d61',
      'accent-soft': '#33231b',
      ok: '#8ccfa4',
      'ok-soft': '#1b2b22',
    },
  },
}
