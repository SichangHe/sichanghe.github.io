# ChatGPT consultation: design and evaluation opinions
(authored by agents unless marked 🧑)

provenance

- GPT-5.6 Sol, Pro and Extra High reasoning, 7 October 2026
- successful completed response confirmed by helper diagnostics
  - `lit_b/chatgpt_consult_pro.json`
- [Pro verbatim response](review_b_chatgpt_pro_transcript_20261007.md)
- [Extra High verbatim response](review_b_chatgpt_extra_high_transcript_20261007.md)
  - completed response and selected effort confirmed in `lit_b/chatgpt_consult_fourth.json`
- requested Extra High attempts failed twice after verified selection
  - diagnostics: `lit_b/chatgpt_consult.json` and `lit_b/chatgpt_consult_second.json`
  - subsequent Extra High retry succeeded independently of Pro
- advice below is opinion rather than primary literature evidence

useful recommendations

- grade intent, model assumptions, translation, proof completion and executable-code correspondence separately
  - exact response: “A proof at one link does not validate the others.”
- distinguish human-stated requirements from inferred assumptions and unresolved ambiguity
  - exact response: “An inferred assumption cannot enter the theorem silently.”
- add tests that remove assumptions, weaken properties or erase meaningful requests
  - exact response: “Use paired tasks and hidden mutants.”
  - mutants are deliberate changes designed to expose incorrect acceptance
- explicitly prevent infinite internal activity from masquerading as progress
  - exact response: “a concrete program can take infinitely many internal steps while mapping every step to abstract stuttering”
  - stuttering means the abstract state does not change
- preserve separate outcomes for impossible or underspecified tasks
  - exact response: “prove”, “refute”, “ask for clarification”, “abstain”

our assessment

- agrees with the review's separate-stage evaluation proposal
- multiple candidate specifications and human approval are recommendations, not established necessities
  - conflicts with complete autonomy if human clarification is frequent
  - evaluate their value and human cost rather than assuming them
- the model could not fetch the complete TLA-Verus PDF
  - its research claims are not used to replace the independently audited primary paper
- claims about novelty need wider primary-source comparison before submission

Extra High additions

- opinion: freeze assumptions and properties before downstream proof search
  - exact response: “downstream agents cannot silently repair upstream artifacts”
- opinion: concrete execution assumptions must support the abstract progress assumptions
  - exact response: “concrete scheduler, network, storage, retry, and interference assumptions must imply the fairness/progress assumptions used by the abstract proof”
- suggested leads: tla-rs/AutoMan and TLA-Prover
  - [AutoMan/tla-rs audit](review_b_automan_20261007.md)
  - [TLA-Prover audit](review_b_tla_prover_20261007.md)
  - model claims remain separate from independently inspected evidence
- Extra High could not fetch the complete TLA-Verus PDF
  - our independent primary-paper audit remains the evidence for that paper
