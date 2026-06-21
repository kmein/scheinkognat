// PDF-Ausgabe aller Scheinkognat-Einträge.
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
    "ara": ("Noto Naskh Arabic", "Noto Sans Arabic"),
    "arb": ("Noto Naskh Arabic", "Noto Sans Arabic"),
    "fas": ("Noto Naskh Arabic", "Noto Sans Arabic"),
    "pes": ("Noto Naskh Arabic", "Noto Sans Arabic"),
    "urd": ("Noto Nastaliq Urdu", "Noto Sans Arabic"),
    "cjy": ("Noto Naskh Arabic", "Noto Sans Arabic"),
    "pus": ("Noto Naskh Arabic", "Noto Sans Arabic"),
    "uig": ("Noto Naskh Arabic", "Noto Sans Arabic"),
    "kk": ("Noto Naskh Arabic", "Noto Sans Arabic"),
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
    "mon": ("Noto Sans Mongolian",),
    "qun": ("Noto Sans Anatolian Hieroglyphs",),
  )
  let fonts = if lang in map { map.at(lang) } else { () }
  fonts + ("Junicode", "Noto Sans", "Noto Serif")
}

#let lang-name(code) = {
  let l = data.languages.at(code, default: none)
  if l == none { code } else { l.name }
}

#let contrib-name(id) = {
  if id == none { none } else {
    let c = data.contributors.at(id, default: none)
    if c == none { id } else { c.name }
  }
}

#set document(title: "Scheinkognat", author: "Scheinkognat-Beiträger")
#set page(paper: "a4", margin: (x: 2.2cm, y: 2.4cm), numbering: none)
#set text(font: ("Junicode", "Noto Serif"), size: 10pt, lang: "de", hyphenate: true)
#set par(justify: true, leading: 0.55em, first-line-indent: 0pt)
#show heading.where(level: 1): set text(size: 22pt, weight: "bold")
#show heading.where(level: 2): set text(size: 11pt, weight: "bold")
#show heading.where(level: 2): set block(above: 1em, below: 0.4em)
#show link: set text(fill: rgb("#6e3052"))

// --- Titelseite ---------------------------------------------------------------
#align(center + horizon)[
  #text(size: 48pt, weight: "bold")[Scheinkognat]
  #v(0.5em)
  #text(size: 14pt, style: "italic")[Eine Sammlung linguistischer Koinzidenzen]
  #v(3em)
  #text(size: 10pt)[#data.entries.len() Einträge · Stand #datetime.today().display("[day].[month].[year]")]
]
#pagebreak()

// --- Epigraph -----------------------------------------------------------------
#set page(numbering: "1")
#counter(page).update(1)
#v(4em)
#align(center)[
  #block(width: 75%)[
    #set text(style: "italic")
    #set par(justify: false)
    „Aber es mußte einmal an einigen Beispielen aus verschiedenen Gebieten gezeigt werden, ein wie neckisches Spiel der unbezweifelbare Zufall im sprachlichen Leben treibt."

    #v(0.5em)
    #text(style: "normal", size: 9pt)[— Johannes Friedrich, 1952]
  ]
]
#v(1fr)
#pagebreak()

// --- Einträge -----------------------------------------------------------------
#set heading(numbering: none)

#columns(2, gutter: 1.2em)[
  #for entry in data.entries [
    #block(breakable: false, width: 100%)[
      #heading(level: 2)[#entry.id] #label("entry-" + entry.id)

      #for form in entry.forms [
        #grid(
          columns: (4.5em, 1fr),
          column-gutter: 0.5em,
          row-gutter: 0.1em,
          [#text(size: 7.5pt, fill: gray)[
            #lang-name(form.lang)
            #if form.at("dialect", default: none) != none [
              \ #text(size: 7pt)[· #form.dialect]
            ]
          ]],
          [
            #if form.at("script", default: none) != none [
              #text(font: script-font(form.lang), lang: form.lang)[#form.script]
            ]
            #if form.at("translit", default: none) != none [
              #h(0.3em) #text(style: "italic")[#form.translit]
            ]
            #if form.at("gloss", default: none) != none [
              #h(0.3em) ‚#form.gloss‘
            ]
            #if form.at("etymology", default: none) != none [
              #linebreak()
              #text(size: 8pt, fill: gray)[#form.etymology]
            ]
          ]
        )
      ]

      #if entry.at("comment", default: none) != none [
        #v(0.25em)
        #text(size: 8.5pt)[#entry.comment]
      ]

      #v(0.2em)
      #text(size: 7pt, fill: gray)[
        #let bits = ()
        #let cn = contrib-name(entry.at("contributor", default: none))
        #if cn != none { bits.push(cn) }
        #if entry.at("added", default: none) != none { bits.push(entry.added) }
        #bits.join(" · ")
      ]
    ]
    #v(0.6em)
  ]
]

// --- Sprachindex --------------------------------------------------------------
#pagebreak()
#heading(level: 1)[Sprachindex]
#v(0.6em)

#let lang-to-entries = {
  let m = (:)
  for entry in data.entries {
    for form in entry.forms {
      let l = form.lang
      if l in m { m.insert(l, m.at(l) + (entry.id,)) }
      else { m.insert(l, (entry.id,)) }
    }
  }
  m
}

#let lang-codes-sorted = {
  let codes = lang-to-entries.keys()
  codes.sorted(key: c => lang-name(c))
}

#columns(2, gutter: 1em)[
  #for code in lang-codes-sorted [
    #block(breakable: false)[
      #text(weight: "bold", size: 10pt)[#lang-name(code)]
      #h(0.3em) #text(size: 8pt, fill: gray)[(#code)]
      #linebreak()
      #set text(size: 8.5pt)
      #lang-to-entries.at(code).map(id => link(label("entry-" + id))[#id]).join(", ")
    ]
    #v(0.4em)
  ]
]

// --- Beiträgerindex -----------------------------------------------------------
#pagebreak()
#heading(level: 1)[Beiträgerindex]
#v(0.6em)

#let contrib-to-entries = {
  let m = (:)
  for entry in data.entries {
    let c = entry.at("contributor", default: none)
    if c == none { continue }
    if c in m { m.insert(c, m.at(c) + (entry.id,)) }
    else { m.insert(c, (entry.id,)) }
  }
  m
}

#let contrib-ids-sorted = {
  contrib-to-entries.keys().sorted(key: id => contrib-name(id))
}

#for id in contrib-ids-sorted [
  #block(breakable: false)[
    #text(weight: "bold", size: 10pt)[#contrib-name(id)]
    #linebreak()
    #set text(size: 8.5pt)
    #contrib-to-entries.at(id).map(eid => link(label("entry-" + eid))[#eid]).join(", ")
  ]
  #v(0.4em)
]
