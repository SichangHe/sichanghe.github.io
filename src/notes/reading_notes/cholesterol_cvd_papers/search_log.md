# Cholesterol/CVD search log

Redo date: 2026-06-13.

## Required browser routes

- long-running browser
  - found and used existing Chrome profile at `/ssd1/sichangheagent/personal_browser_setup/.runtime/browser-use-opencode/state/profile`
  - CDP endpoint: `http://127.0.0.1:9279`
  - noVNC/websockify was also present on localhost port `6080`
- Perplexity
  - used via existing browser CDP
  - signed-in profile visible as `Steven He`
  - helper selector initially missed the icon-only submit button, then direct CDP mouse/keyboard input submitted successfully
  - artifact: `searches/perplexity_5705.json`
  - answer URL: `https://www.perplexity.ai/search/c6b6d1fe-e29a-487c-9fc0-00f4753fe2b3`
- Gemini
  - used via existing browser CDP
  - no login or challenge page observed
  - direct CDP input submitted successfully through visible `Send message`
  - artifact: `searches/gemini_5705.json`
  - answer URL: `https://gemini.google.com/app/b04989903395e2d6`
- Google Scholar
  - used via existing browser CDP
  - query: `LDL ApoB causal atherosclerosis Mendelian randomization insulin resistance ketogenic diet cardiovascular risk 2024 review`
  - no CAPTCHA or unusual-traffic block observed
  - artifact: `searches/google_scholar_5705.json`

## Main queries and trails

- Perplexity prompt asked for recent top-tier sources on LDL/ApoB, insulin/high blood sugar, keto/low-carb claims, and atherosclerotic vessel blockage
- Gemini prompt asked for recent top-tier research on LDL/ApoB causality, insulin resistance/high blood sugar, low-carb/keto claims, and whether cholesterol contributes to vessel blockage
- Google Scholar query emphasized LDL, ApoB, Mendelian randomization, insulin resistance, ketogenic diet, cardiovascular risk, and 2024 review terms
- Follow-up source trails used PubMed/NCBI E-utilities, PMC, publisher pages, society pages, and open PDFs

## Search takeaways

- Mainstream LDL/ApoB evidence converged on EAS 2017/2020 consensus statements, CTT meta-analysis, non-statin outcome trials, NLA 2024 ApoB consensus, and ApoB discordance studies
- Mechanistic evidence converged on arterial-wall retention/modification of ApoB-containing particles and glycation/inflammation in diabetes
- Insulin/glycemia evidence supports acceleration and interaction, not replacement of ApoB as plaque substrate
- Keto evidence converged on low-carb T2D meta-analysis, NLA low-carb statement, LMHR phenotype papers, KETO Trial imaging, controlled feeding data, and UK Biobank LCHF/MACE evidence
- The 2025 longitudinal KETO-CTA paper was screened but rejected because PubMed records a 2026 retraction notice

## Access caveats

- NCBI E-utilities were used for PubMed abstracts where ordinary PubMed/PMC pages showed bot checks or where publisher pages were not fully open
- OUP and AHA direct publisher PDFs returned 403 in local tooling; open PMC, society PDFs, or abstracts were used instead where available
- The NLA 2024 ApoB consensus PMCID was available through E-utilities; direct PMC PDF fetch returned an HTML bot-check page, so the abstract and NLA page text were retained
- No paywalls were bypassed

## Local logs

- download log: `download_log.tsv`
- OCR/text extraction log: `ocr_log.tsv`
- PDFs: `pdf/`
- extracted text and abstracts: `text/`
- browser search artifacts: `searches/`
