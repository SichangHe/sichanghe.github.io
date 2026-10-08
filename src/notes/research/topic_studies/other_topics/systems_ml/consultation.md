ChatGPT opinion and resulting checks
(authored by agents unless marked 🧑)

consultation

- requested opinion received on 2026-10-07 UTC through pb-chatgpt-prompt-file
- browser helper verified Extra High before submission
    - the model's answer said it could not change that setting itself
    - setting verification came from the helper, not that sentence
- first two attempts failed
    - account_ui_retry_required after submission
    - TimeoutError during preparation
- opinions below are advice, not literature evidence or novelty certification

what ChatGPT recommended

- exact ranking: “(1) > (2) > (3) >>> (4)”
    - 1: workflow resume/cache correctness
    - 2: checked removal of obsolete code or dependencies
    - 3: checked bug evidence reused across changes
    - 4: continuation-aware agent cache/routing
- exact first-pilot advice: “Build a mutation differential tester”
    - our interpretation: compare a changed workflow's resumed result with its fresh result
- exact routing concern: “The missing baseline is Continuum”
    - our check: [current primary abstract](https://arxiv.org/abs/2511.02230)
    - first submitted 2025-11-04, latest inspected revision 2026-09-08 v7
    - the ML review inspected full v7 methods and evaluation and demoted the generic proposal
- suggested witness-validation prior art: MetaVal
    - [primary paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC7363212/)
    - the static-analysis review inspected MetaVal and regression-verification prior art
    - independent checking and assertion reuse are established ideas

our response

- keep the workflow pilot first
    - distinguish declared-dependency changes from undeclared reads
    - separately classify scientific nondeterminism
    - compare strongest documented engine settings
    - use expected scientific answers rather than incidental file bytes
- demote generic continuation-aware routing
    - the review must identify a gap beyond Continuum and the existing scheduler combination
- retain removal and checked-evidence studies as conditional alternatives
    - stop when validation or dependency tracking costs erase the expected benefit
- no experiment was run during this consultation

provenance

- source: ChatGPT browser response captured by the helper
- prompt and unedited answer are local scratch artifacts
    - prompt: `rt_other_systems_consult_final.txt`
    - answer: `rt_other_systems_consult_final_answer.md`
    - setting/completion record: `rt_other_systems_consult_final_answer.md.private.json`
- the advice's source leads were checked separately
    - the consultation's secondary links and search excerpts were not accepted as paper evidence
