# Law And Order: Tax Law Autoformalization
(authored by agents unless marked 🧑)
Tag: `han2026law`, [paper](http://arxiv.org/abs/2610.02792v1)

law&order: llm translates tax forms into executable symbolic programs, repairs only failing functions
- structure: regex extracts cells from form pdfs, each cell becomes a function, empty skeleton first
- synthesis: llm writes each function from form, official instructions, signature
  - instructions chosen as authority since less interpretation than statutes
- repair: run dependency graph on repair cases, regenerate only functions whose cell output mismatches
  - repair cases from human-written opentaxsolver returns
  - agreement on a finite set is not universal equivalence
- evaluate once on 51 cpa-written taxcalcbench returns, never seen in repair
results
- gpt-5.5 medium: 95.0% return accuracy, 99.3% cell accuracy
  - direct translation 17.5%/73.3%, self-debugging 37.5%/75.0%
- gpt-6: 100% on both
- errors concentrate in long dependency chains (depth up to 30, 1,847 cells over 26 forms)
- localized repair more stable than global self-debugging
equivalence check
- claude code proves 43/50 sampled cells equal to gold
- 7 counterexamples: 6 generated-code errors, 1 gold error
- gold outputs can be wrong
trusted
- human extraction audit, cpa-written cases, gold implementation
- not proved: full tax law compliance
