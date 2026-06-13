# Cholesterol/CVD search log

## Requested AI/scholar sources

- Perplexity
  - attempted via headless Chrome URL search
  - result: Cloudflare security verification, unavailable without interactive browser verification
- Gemini
  - attempted via installed `gemini -p`
  - result: OAuth authorization prompt, unavailable without human sign-in
- Google Scholar
  - attempted via headless Chrome search URL
  - result: Google unusual-traffic/CAPTCHA page, unavailable from this network

Because those were unavailable, the evidence search used direct web search, PubMed/PMC, publisher pages, society/guideline PDFs, and source reference trails.

## Main web queries

- `LDL cholesterol causes atherosclerotic cardiovascular disease evidence genetic epidemiologic clinical studies consensus statement European Atherosclerosis Society 2017`
- `2024 2025 guideline LDL cholesterol causal atherosclerotic cardiovascular disease ApoB consensus statement open access`
- `Cholesterol Treatment Trialists Collaboration 1 mmol LDL reduction 22% major vascular events statin meta-analysis`
- `Cholesterol Treatment Trialists diabetes statin meta-analysis 21% proportional reduction major vascular events LDL PubMed`
- `IMPROVE-IT FOURIER ODYSSEY LDL lowering outcome trial ezetimibe PCSK9 NEJM PubMed`
- `Marston apoB-containing lipoproteins myocardial infarction LDL triglycerides JAMA Cardiology 2022 PubMed`
- `Sniderman apoB discordance LDL-C non-HDL-C triglycerides adequate proxies UK Biobank 2024 PubMed`
- `Bempedoic Acid for Primary Prevention of Cardiovascular Events in Statin-Intolerant Patients PMC`
- `Mendelian randomization LDL cholesterol ApoB cardiovascular disease causal evidence 2022 2023 open access`
- `response-to-retention hypothesis apolipoprotein B lipoproteins atherosclerosis mechanistic review open access`
- `hyperglycemia insulin resistance atherosclerosis endothelial dysfunction LDL glycation review PMC 2023`
- `intensive glucose control cardiovascular outcomes type 2 diabetes ACCORD ADVANCE VADT meta-analysis`
- `SGLT2 inhibitors GLP-1 receptor agonists cardiovascular kidney outcome meta-analysis type 2 diabetes guideline`
- `ADA Standards of Care in Diabetes 2026 cardiovascular disease risk management PubMed`
- `ketogenic low carbohydrate high fat diet LDL cholesterol ApoB randomized controlled trial healthy normal weight women`
- `lean mass hyper-responder LDL cholesterol ketogenic diet paper 2022 open access`
- `lean mass hyper-responder case report CTA no plaque 2022 PubMed`
- `carbohydrate restricted diet LDL cholesterol coronary CT angiography lean mass hyper-responder KETO-CTA 2024 2025`
- `Association of a Low-Carbohydrate High-Fat Diet With Plasma Lipid Levels and Cardiovascular Risk JACC Advances 2024`
- `Ketogenic diets not for everyone hypercholesterolemia case series PubMed`
- `National Lipid Association scientific statement low carbohydrate very low carbohydrate ketogenic diets cardiometabolic risk LDL cholesterol`

## Search takeaways

- Mainstream causal evidence converged on EAS 2017/2020 consensus statements, ESC/EAS 2025 update, CTT meta-analysis, and non-statin LDL-lowering outcome trials
- Marker evidence converged on apoB as a cleaner atherogenic particle measure than LDL-C/non-HDL-C/TG when markers are discordant
- Insulin/glycemia evidence converged on glycation/AGE biology, endothelial dysfunction, insulin-resistance remnant/LDL retention, and mixed macrovascular effects of intensive glucose lowering
- Modern diabetes outcome evidence added SGLT2 inhibitor and GLP-1 receptor agonist CV/kidney outcome meta-analyses to distinguish glucose lowering from cardioprotective diabetes drugs
- Keto evidence converged on LMHR phenotype papers, Virta T2D intervention papers, controlled feeding evidence in lean women, KETO Trial imaging, UK Biobank LCHF/MACE cohort evidence, BMJ low-carb T2D meta-analysis, and the NLA low-carb scientific statement
- The longitudinal KETO-CTA paper was screened but rejected as evidence because it is marked retracted

## Access caveats

- Official OUP article fetch for the 2025 ESC/EAS focused update returned 403 in local tooling
- An initially found `api.iscpcardio.org` PDF mirror was discarded from the curated collection because it was not a clearly official ESC/EAS/EHJ endpoint
- PubMed pages sometimes returned recaptcha HTML; primary-trial abstract records were therefore fetched through NCBI E-utilities MEDLINE text

## Local logs

- download log: `download_log.tsv`
- OCR/text extraction log: `ocr_log.tsv`
- PDFs: `pdf/`
- extracted text: `text/`
