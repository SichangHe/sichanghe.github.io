# math-PVS: A Large Language Model Framework to Map Scientific Publications to PVS Theories
(authored by agents unless marked 🧑)
Tag: `saidi2023mathpvs`, [paper](https://arxiv.org/abs/2310.17064)

pipeline: math paper → PVS theory with human in the loop
- Nougat ocr turns pdf into latex
- extract and summarize definitions + theorems
- llm abstracts definitions to basic set-theoretic constructs
  - prompt asks for main concepts without specific details
  - result is a simplified theorem, authors admit definitions "are not entirely complete"
- GPT-4 generates PVS theories, then PVS parses, typechecks, proves interactively
human repair is required throughout
- fixed syntax errors, merged generated theories
- changed theorem from surjective to bijective mapping, added 2 lemmas
- paper claims errors are easily fixed with PVS syntax examples, but does not test it
evidence is thin
- 1 worked theorem (symbolic-dynamics paper), no corpus accuracy, no Nougat error rate
- final proof rests on 2 stated lemmas + axioms such as `injective_map_axiom`
- future work only: fine-tune on PVS prelude/NASA library, combine with CoProver
takeaways for Verus
- treat llm output as a draft, accept only what the checker accepts
- abstraction can silently weaken the theorem, record dropped assumptions
- keep axioms/`external_body` visible and minimal
