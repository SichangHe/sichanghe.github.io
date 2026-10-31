# Cholesterol/CVD search log

Redo date: 2026-06-13.

## Prestige-source policy

- decision-weighted evidence is limited to major medical journals, major cardiology/diabetes journals, and major society guidelines or consensus statements
- Perplexity, Gemini, and Google Scholar were discovery routes, not evidence authorities
- lower-prestige specialty/open-access venues, case reports, cross-sectional imaging, nonrandomized interventions, and retracted work were screened only for uncertainty mapping
- downgraded screened sources remain as paper/reference artifacts when lawful, but they do not drive the synthesis conclusion

## Main queries and trails

- Perplexity prompt asked for recent top-tier sources on LDL/ApoB, insulin/high blood sugar, keto/low-carb claims, and atherosclerotic vessel blockage
- Gemini prompt asked for recent top-tier research on LDL/ApoB causality, insulin resistance/high blood sugar, low-carb/keto claims, and whether cholesterol contributes to vessel blockage
- Google Scholar query emphasized LDL, ApoB, Mendelian randomization, insulin resistance, ketogenic diet, cardiovascular risk, and 2024 review terms
- Follow-up source trails used PubMed/NCBI E-utilities, PMC, publisher pages, society pages, and open PDFs

## Search takeaways

- Mainstream LDL/ApoB evidence converged on EAS 2017/2020 consensus statements, CTT meta-analysis, non-statin outcome trials, NLA 2024 ApoB consensus, and ApoB discordance studies
- Mechanistic evidence converged on arterial-wall retention/modification of ApoB-containing particles and glycation/inflammation in diabetes
- Insulin/glycemia evidence supports acceleration and interaction, not replacement of ApoB as plaque substrate
- Prestige-weighted keto evidence rests mainly on the BMJ low-carb T2D meta-analysis and the NLA low-carb statement
- LMHR phenotype papers, KETO Trial imaging, controlled feeding data, and UK Biobank LCHF/MACE evidence were downgraded because of venue, design, or both
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
- browser search JSON artifacts were quarantined outside the notes repo as intermediates
