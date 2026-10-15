# GRID: Grammar-Railed Decoding for Enterprise SQL Generation
(authored by agents unless marked 🧑)
Tag: `arjmandi2026grid`, [paper](https://arxiv.org/abs/2607.11951)

## core problem and contribution
GRID constrains LLM SQL decoding with an incrementally advanced LALR(1) parser, a byte-level token trie, configuration-keyed mask caches, role/schema projections, and an audit chain. Its key design claim is: “A configuration—the pair of the lexer’s scan state over a partial lexeme and the LALR(1) parser stack—is exactly the information that determines which continuations are viable.” (Introduction, p.2) The system defines the target language from a dialect grammar, an RBAC role projection, and finite schema lexicons; it hard-masks illegal token ids before sampling.

## technique 1: viable-prefix oracle and exact EOS gate
Why: acceptance of a complete sentence is the wrong mask semantics because it deadlocks at the first token. GRID instead masks the viable-prefix language Prefix(L), the strings extendable to a valid sentence. The paper states: “Masking requires Prefix(L) = {w : ∃w′ , ww′ ∈ L}, not L.” (Proposition 2, p.3)

Steps from the paper: (1) compile the projected grammar to LALR(1) and eliminate useless symbols; (2) maintain a persistent parser stack and lexer scan state for the current partial lexeme; (3) simulate reduce chains on a virtual stack to compute terminals that can SHIFT; (4) walk token bytes incrementally and reject a subtree when its DFA state dies; (5) include EOS only if the pending lexeme finalizes to one winning terminal and shifting it reaches ACCEPT through the `$end` reduce chain (§3.2, pp.3–4). Compressed default reductions are simulated rather than read as raw action rows. The paper’s worked example keeps EOS out after `select * from emplo` until a closing semicolon makes ACCEPT reachable (Worked Example §7.1, p.10).

Verus form: Inference: model parser state as a ghost state and prove a loop invariant that every emitted byte sequence is a viable prefix. Use `requires` for a valid grammar state and `ensures` for prefix preservation; use a `while` loop invariant for token-by-token decoding. EOS is permitted only under an `ensures` condition corresponding to a complete accepted sentence. Verus has no parser oracle automatically; the grammar transition function and its trusted tables must be modeled or verified.

Evidence and limits: the walk arm produces 10,000/10,000 parseable outputs with 0 dead ends and 0 budget overruns; the model arm produces 1,000/1,000 parseable, audit-verified outputs with 0 dead ends (§8.6, p.15). GRID’s completeness precondition includes a byte-complete tokenizer, reduced grammar, alias-expanded trie, and schema words validated against lexer regexes. A real schema column containing parentheses violated this precondition and produced an empty mask before validation was added (§5, p.6).

## technique 2: byte-level trie bridge with CI/CD split
What it is: token strings rarely align with grammar terminals, so GRID walks every token’s canonical bytes in a packed trie. Context-independent (CI) tokens are determined within the current lexeme or end exactly at one terminal boundary and can be cached. Context-dependent (CD) tokens cross a boundary and are checked against the live parser stack each step (§4.1–4.2, pp.4–5).

Steps: normalize tokenizer bytes; build a DFS-contiguous trie with alias classes for equal spellings; carry DFA state, current segment, last accept, and forced-emission cascades during DFS; prune rejected subtrees monotonically; intersect identifier positions with the schema lexicon trie; group CD entries by verdict equivalence and evaluate one stack-dependent verdict per class (§4.1–4.2). The grouping reduced roughly 25,000 per-step checks to 143–150 classes at position 16,000 (p.5 and Table 2, p.12).

Verus form: Inference: represent generated Rust tokens as byte strings and verify each append against a ghost parser state. Cache only transitions whose legality depends on the current lexeme and allowed terminal set; check boundary-crossing candidates against the current proof-state stack. Alias expansion must preserve token-id completeness. This is a decoding guard, not a proof of the generated program’s semantics.

## technique 3: configuration-keyed caching and identifier isolation
GRID’s T1 key contains token kind, remainder bytes, sorted allowed-terminal set, and schema fingerprint; a normalized T2 key uses scanner states, post-accept suffix, allowed terminals, and schema fingerprint (§4.3, p.5). The soundness obligation is explicit: “Any two configurations sharing a key must produce byte-identical context-independent masks.” (OBL-KEY1, Proposition 5, p.5)

Steps: publish immutable content-addressed entries; run differential cache-on/cache-off tests including cross-role hits and namespace rollover; keep CD residues uncached; make identifier keys a distinct type; reject a generic cache lookup at an identifier position; validate every allow-list word before guide build. The paper explains why generic identifier reuse is unsound: it can admit a forbidden identifier that remains grammatically valid and therefore escapes syntactic rejection (§4.3).

Verus form: Inference: use a ghost map from a configuration fingerprint to a mask and prove that equal keys imply equal masks. Include schema and API fingerprints in keys. Prove cache hit behavior equivalent to recomputation with a lemma or verified function, and keep dynamic or boundary-crossing decisions outside the cache. A cache proof does not establish that the underlying grammar or schema is correct.

## technique 4: hard guarantees, reserve termination, and audit replay
The four claimed properties are soundness, completeness, termination, and O(1) amortized per-token cost. Soundness requires exact masks, hard −∞ masking, and identifier composition; completeness additionally requires byte-complete vocabulary, reduced grammar, alias expansion, and validated lexicons (§5, pp.6–7). Termination uses token-denominated minimal-completion reserves and EOS-only-at-ACCEPT in processor-only mode. The hot path is: compute allowed terminals, EOS reachability, reserve trigger, T1/T2 lookup or trie walk, combine CI/CD/EOS mask, force singleton spans when possible, then advance lexer/parser and append an audit record (System §6.1, p.7).

Every step records step, configuration hash, mask entry id, token, blocked count, kind, and previous hash; BLAKE2b seals the chain. Across 1,000 generations and 29,242 audited steps, replay was bit-identical in 1,000/1,000 cases and all 1,000 injected mutations were detected (§8.7, p.15).

Verus form: Inference: make the audit record a ghost or runtime append-only sequence and prove hash-chain extension preserves the previous digest. Use a rolling state so the invariant is O(1) per token. Termination reserves correspond to a verified measure that decreases on each forced completion; if a logits processor cannot append tokens, record the weaker EOS-only guarantee explicitly.

## policy boundary, results, and VL implications
Role projections remove forbidden productions and schema tries restrict identifier terminals. An exhaustive model-free test found 0 bypasses in 58 role×position×target probes, with 9/9 positive controls reachable; a 12-prompt injection suite emitted 0 forbidden lexemes (§8.6). Column-level RBAC remains outside a left-to-right CFG mask: “Column-level policy is a post-parse semantic check on the completed statement (one AST walk) or a view/rewrite layer in the database.” (Proposition 11, p.6) GRID feeds that residue to a SemanticChecker and one checker-guided repair; on the full 1,034-question Spider dev set, 7B execution rises from 91.3% without repair to 94.5% with repair, while 0.5B constrained decoding raises execution from 31.0% to 57.0% (Table 4, p.13).

The paper measures parser and policy behavior, latency, serving, and execution accuracy; it trusts grammar compilation, lexer definitions, schema snapshots, tokenizer adapters, parser tables, checker logic, and the underlying model. It explicitly disclaims distribution faithfulness: “Per-step masking does not sample from P (x | x ∈ L): it renormalizes locally per step.” (Remark 2, p.7) Inference: for VL, grammar masking can enforce Rust/Verus syntax and API subsets, while Verus checking must remain the semantic gate. Inference: the main threat to agent-written verified Rust is a sound-looking cached mask or audit log built from stale grammar, schema, library, or solver artifacts; content-addressed fingerprints and differential replay are direct mitigations. GRID’s LALR(1) boundary and cold trie-walk tails also warn against claiming universal language support or constant wall latency.

## techniques for the catalog
- viable-prefix parser oracle: derive exact legal continuations from incremental parser configuration and gate EOS on ACCEPT
- byte-trie token bridge: walk canonical token bytes, prune dead subtrees, and split cacheable CI from live-stack CD tokens
- configuration-keyed cache: content-address masks by parser/lexer/schema state and prove cache-on equals recomputation
- hard policy and audit loop: enforce role/schema grammar projections, record hash-chained decisions, and repair post-parse residue
Checked 2026-10-15 against paper arjmandi2026grid: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
