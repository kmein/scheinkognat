// PDF-Ausgabe aller Scheinkognat-Einträge im Stil eines traditionellen
// Wörterbuchs: dreispaltig, run-in-Einträge, fortlaufend numeriert.
// Daten kommen aus pdf/entries.json (von scripts/build-pdf-data.mjs erzeugt).
// Kompiliert via `nix build .#pdf` (Schriften kommen aus dem Nix-Closure).

#let data = json("entries.json")

#let script-font(lang) = {
  let map = (
    "cop": ("Antinoou", "Noto Sans Coptic"),
    "syc": ("Noto Sans Syriac Western", "Noto Sans Syriac"),
    "syr": ("Noto Sans Syriac Western", "Noto Sans Syriac"),
    "aii": ("Noto Sans Syriac Eastern", "Noto Sans Syriac"),
    "arc": ("Noto Sans ImpAramaic", "Noto Sans Syriac"),
    "ara": ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic"),
    "arb": ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic"),
    "fas": ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic"),
    "pes": ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic"),
    "urd": ("Noto Nastaliq Urdu", "Amiri", "Noto Sans Arabic"),
    "cjy": ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic"),
    "pus": ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic"),
    "uig": ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic"),
    "kk": ("Amiri", "Noto Naskh Arabic", "Noto Sans Arabic"),
    "rus": ("Gentium",),
    "ady": ("Gentium",),
    "mdf": ("Gentium",),
    "hbs": ("Gentium",),
    "mon": ("Gentium", "Noto Sans Mongolian"),
    "heb": ("Noto Sans Hebrew",),
    "yid": ("Noto Sans Hebrew",),
    "san": ("Noto Sans Devanagari",),
    "pli": ("Noto Sans Devanagari",),
    "hin": ("Noto Sans Devanagari",),
    "guj": ("Noto Sans Gujarati", "Noto Sans Devanagari"),
    "ben": ("Noto Sans Bengali", "Noto Sans Devanagari"),
    "kan": ("Noto Sans Kannada",),
    "mal": ("Noto Sans Malayalam",),
    "tam": ("Noto Sans Tamil",),
    "tel": ("Noto Sans Telugu",),
    "sux": ("Noto Sans Cuneiform",),
    "akk": ("Noto Sans Cuneiform",),
    "hit": ("Noto Sans Cuneiform",),
    "pgd": ("Noto Sans Kharoshthi",),
    "egy": ("Noto Sans EgyptHiero",),
    "ett": ("Noto Sans Old",),
    "got": ("Noto Sans Gothic",),
    "chu": ("Noto Sans Glagolitic",),
    "phn": ("Noto Sans Phoenician",),
    "grc": ("Junicode",),
    "ell": ("Junicode",),
    "ang": ("Junicode",),
    "cmn": ("Noto Sans CJK SC",),
    "yue": ("Noto Sans CJK SC",),
    "lzh": ("Noto Sans CJK SC",),
    "wuu": ("Noto Sans CJK SC",),
    "jpn": ("Noto Sans CJK JP",),
    "kor": ("Noto Sans CJK KR",),
    "tha": ("Noto Sans Thai",),
    "khm": ("Noto Sans Khmer",),
    "lao": ("Noto Sans Lao",),
    "mya": ("Noto Sans Myanmar",),
    "bod": ("Noto Serif Tibetan",),
    "hye": ("Noto Sans Armenian",),
    "kat": ("Noto Sans Georgian",),
    "amh": ("Noto Sans Ethiopic",),
    "gez": ("Noto Sans Ethiopic",),
    "qun": ("Noto Sans Anatolian Hieroglyphs",),
  )
  let fonts = if lang in map { map.at(lang) } else { () }
  fonts + ("Junicode", "Noto Sans", "Noto Serif")
}

#let lang-name(code) = {
  let l = data.languages.at(code, default: none)
  if l == none { code } else { l.name }
}

#let initials(name) = {
  // "Johann Christoph Adelung" → "JCA"; "M. Kahir" → "MK".
  name.split(regex("\s+"))
    .map(w => w.replace(regex("[^\p{L}]"), ""))
    .filter(w => w.len() > 0)
    .map(w => upper(w.first()))
    .join("")
}

#let contrib-initials(id) = {
  if id == none { return none }
  let c = data.contributors.at(id, default: none)
  if c == none { id } else { initials(c.name) }
}

#set document(title: "Scheinkognat", author: "Scheinkognat-Beiträger")
#set page(
  paper: "a5",
  margin: (top: 1.8cm, bottom: 1.6cm, left: 1.6cm, right: 1.6cm),
  numbering: "1",
  number-align: center,
)
#set text(
  font: ("Junicode", "Noto Serif"),
  size: 10pt,
  lang: "de",
  hyphenate: true,
)
#set par(justify: true, leading: 0.65em, first-line-indent: 0pt, spacing: 0.55em)

// --- Titelseite ---------------------------------------------------------------
#set page(numbering: none)
#align(center + horizon)[
  #text(size: 36pt, weight: "regular", tracking: 2pt)[#smallcaps[Scheinkognat]]
  #v(0.8em)
  #text(size: 11pt, style: "italic")[Eine Sammlung linguistischer Koinzidenzen]
  #v(3em)
  #text(size: 9pt)[#data.entries.len() Einträge · Stand #data.meta.buildDate]
]
#pagebreak()

// --- Epigraph -----------------------------------------------------------------
#v(6em)
#align(center)[
  #block(width: 70%)[
    #set text(style: "italic", size: 10pt)
    #set par(justify: false, leading: 0.6em)
    „Aber es mußte einmal an einigen Beispielen aus verschiedenen Gebieten gezeigt werden, ein wie neckisches Spiel der unbezweifelbare Zufall im sprachlichen Leben treibt."

    #v(0.6em)
    #text(style: "normal", size: 9pt)[— Johannes Friedrich, 1952]
  ]
]
#v(1fr)
#pagebreak()

// --- Einträge -----------------------------------------------------------------
#set page(
  numbering: "1",
  number-align: center,
  header: context {
    let page-loc = here()
    let markers = query(<entry-marker>).filter(m => m.location().page() == page-loc.page())
    if markers.len() == 0 { return }
    let first = markers.first().value
    let last = markers.last().value
    set text(size: 8pt, fill: gray)
    set par(leading: 0pt)
    grid(
      columns: (1fr, 1fr),
      align(left)[#first],
      align(right)[#last],
    )
    v(-0.5em)
    line(length: 100%, stroke: 0.3pt + gray)
  },
)
#counter(page).update(1)

#let lang-abbr(code) = upper(code)

#let render-form(form) = {
  let bits = ()
  if form.at("script", default: none) != none {
    bits.push(text(
      font: script-font(form.lang),
      lang: form.lang,
      form.script,
    ))
  }
  if form.at("translit", default: none) != none {
    bits.push(text(style: "italic", form.translit))
  }
  let head = bits.join(" ")
  let suffix = []
  if form.at("dialect", default: none) != none {
    suffix += text(size: 7pt)[ (#form.dialect)]
  }
  let gloss = if form.at("gloss", default: none) != none [ ‚#form.gloss‘] else []
  let abbr = text(
    font: "Noto Sans",
    size: 7pt,
    fill: gray,
    tracking: 0.6pt,
  )[#smallcaps(lang-abbr(form.lang))]
  let etym = if form.at("etymology", default: none) != none [ #text(size: 7.5pt, fill: gray)[(#form.etymology)]] else []
  [#abbr #head#suffix#gloss#etym]
}

#let trim-trailing-period(s) = if s.ends-with(".") { s.slice(0, s.len() - 1) } else { s }

#let sep = text(fill: gray)[ ‖ ]

#let render-entry(num, entry) = {
  let head = text(size: 7.5pt, fill: gray)[#num] + [#metadata(num)<entry-marker>]
  let forms = entry.forms.map(render-form).join(sep)
  let comment = if entry.at("comment", default: none) != none [ #text(style: "italic")[ — #trim-trailing-period(entry.comment)]] else []
  [#head #h(0.3em)#forms#comment.]
}

#set par(hanging-indent: 1em, justify: true, leading: 0.65em, spacing: 0.7em)

#columns(2, gutter: 1.4em)[
  #for (i, entry) in data.entries.enumerate() [
    #render-entry(i + 1, entry)#parbreak()
  ]
]

// --- Indizes ------------------------------------------------------------------
#let lang-to-nums = {
  let m = (:)
  for (i, entry) in data.entries.enumerate() {
    let seen = (:)
    for form in entry.forms {
      let l = form.lang
      if l in seen { continue }
      seen.insert(l, true)
      if l in m { m.insert(l, m.at(l) + (i + 1,)) }
      else { m.insert(l, (i + 1,)) }
    }
  }
  m
}

#let contrib-to-nums = {
  let m = (:)
  for (i, entry) in data.entries.enumerate() {
    let c = entry.at("contributor", default: none)
    if c == none { continue }
    if c in m { m.insert(c, m.at(c) + (i + 1,)) }
    else { m.insert(c, (i + 1,)) }
  }
  m
}

#pagebreak()
#align(center)[#text(size: 16pt, weight: "regular", tracking: 1pt)[#smallcaps[Sprachen]]]
#v(0.8em)

#set par(hanging-indent: 1em, justify: true, leading: 0.65em, spacing: 0.6em)

#let lang-codes-sorted = lang-to-nums.keys().sorted(key: c => lang-name(c))

#columns(1)[
  #for code in lang-codes-sorted [
    #smallcaps[#lang-name(code)]
    #h(0.2em)#text(font: "Noto Sans", size: 7pt, fill: gray, tracking: 0.6pt)[#smallcaps(code)] —
    #lang-to-nums.at(code).map(n => str(n)).join(", ").#parbreak()
  ]
]

#pagebreak()
#align(center)[#text(size: 16pt, weight: "regular", tracking: 1pt)[#smallcaps[Beiträger]]]
#v(0.8em)

#let contrib-name(id) = data.contributors.at(id, default: (name: id)).name

#let contrib-ids-sorted = contrib-to-nums.keys().sorted(key: id => contrib-name(id))

#columns(1)[
  #for id in contrib-ids-sorted [
    #smallcaps[#contrib-name(id)]
    #h(0.2em)#text(font: "Noto Sans", size: 7pt, fill: gray, tracking: 0.6pt)[#smallcaps(initials(contrib-name(id)))] —
    #contrib-to-nums.at(id).map(n => str(n)).join(", ").#parbreak()
  ]
]
