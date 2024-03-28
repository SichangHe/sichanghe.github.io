<!-- toc -->
# Pandoc

[How to use Pandoc to produce a research paper](https://opensource.com/article/18/9/pandoc-research-paper)

create `paper.pdf` from `paper.md` and `paper.bib`

```sh
pandoc --pdf-engine latexmk -C --bibliography=paper.bib \
-M reference-section-title=Bibliography \
-V classoption=twocolumn -V papersize=a4paper -V fontsize=12pt \
-V geometry:margin=0.1in -V mainfont=Times \
-s paper.md -o paper.pdf
```

deal with CJK

```sh
pandoc --pdf-engine xelatex -C --bibliography=paper.bib \
-M reference-section-title=Bibliography \
-V classoption=twocolumn -V papersize=a4paper -V fontsize=12pt \
-V geometry:margin=0.1in -V mainfont=Times -V CJKmainfont='Songti SC' \
-s paper.md -o paper.pdf
```

using HTML as intermedia and `wkhtmltopdf` to create PDF

```sh
pandoc -s paper.md -o paper.pdf -t html5 \
-V margin-top=0 -V margin-bottom=0 -V margin-left=0 -V margin-right=0
```

word count

```sh
pandoc --lua-filter ~/.config/helper.lua/wc.lua input
```

convert `docx` to `md`:

```sh
cat INPUT_FILENAME.docx | pandoc --from docx --to markdown_strict \
    --extract-media=. -o OUTPUT_FILENAME.md &&
    sed -i -e 's/\\\_/_/g' \
        -e 's/\\\\\[/[/g' \
        -e 's/\\\\\]/]/g' \
        -e 's/\\\\\*/*/g' \
        -e 's/\\\\left\\\\\\\\ /\\\\left\\\\{/g' \
        -e 's/&gt;/>/g' \
        -e 's/&lt;/</g' \
        OUTPUT_FILENAME.md
```
