# Automation for distributed protocol proofs and protocol benchmarks
(authored by agents unless marked 🧑)

Research checked on October 6, 2026. This report focuses on discovering or checking inductive invariants and on the concrete protocol sets used to evaluate that work. An inductive invariant holds initially and survives every allowed step; together with an implication to the desired property, it proves that no reachable state violates that property. Safety means a bad event never happens. Liveness means a desired event eventually happens. A finite model check is a proof only for the checked instance unless a separate argument extends it to arbitrary instances.

**My synthesis:** evaluate three separate tasks: translating human intent into a faithful protocol/property, finding supporting invariants, and checking the resulting proof. Most of the tools below assume the first task has already been done. An LLM can propose invariants; the checker must establish initialization, preservation, and implication for the actual model. Model reachability tests and deliberately faulty variants help detect specifications that pass because they exclude useful behavior.

**How to use the benchmark inventory:** protocol names identify families, not interchangeable tasks. Keep the exact file, revision, target property, supplied auxiliary invariants, and assumptions. Alternate encodings, strengthened models, and separate properties are recorded separately where the artifact does so. A tool's shipped examples need not equal its paper's evaluated set. Per-protocol properties below are plain-English interpretations of cited formulas unless explicitly quoted; they do not imply a liveness proof.

The web-search tool was attempted and failed with HTTP 404. Research continued using live arXiv/publisher/author pages, GitHub source archives/APIs, Zenodo, and OpenAlex searches. Relevant PDFs were downloaded only from open sources, checked for the `%PDF` header, and read using `pdftotext`. Repository inspection supplies exact manifests where paper tables omit file variants. Missing source locations or unresolved metadata are stated as gaps rather than filled by guesswork.

A few recurring terms: **SMT** solvers decide logical formulas, with limits for unrestricted quantified logic. **IC3/PDR** grows an inductive proof by blocking states that could lead to a violation. **Ghost state** records information needed only for a proof, such as past requests. **Refinement** proves that a detailed system implements a simpler specification. A **cutoff** is a justified finite bound sufficient for a parameterized claim; a small experiment alone does not establish one. **EPR** is a decidable fragment of first-order logic, usually expressed with an existential block followed by a universal block and no functions that create new terms.

## Benchmark download map

These are paper evaluation sets or explicitly labeled repository manifests. The detailed sections give every model name and its property; counts should not be added because many models recur.

| suite | size and download |
|---|---|
| I4 | 7 models; [I4](https://github.com/GLaDOS-Michigan/I4) |
| DistAI | 14; [protocols](https://github.com/VeriGu/DistAI/tree/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols) |
| SWISS | 27 models, 28 table rows; [inputs/configurations](https://github.com/secure-foundations/SWISS/tree/348b9c4f9b0b2f124b50c8f420d071f4bc0789b3/benchmarks) |
| DuoAI | 27; [protocols](https://github.com/VeriGu/DuoAI/tree/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols) |
| FOL-IC3 | 19 pinned source files; [PLDI 2020](https://github.com/wilcoxjay/mypyvy/tree/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol) |
| P-FOL-IC3 | 30 paper models; [branch](https://github.com/wilcoxjay/mypyvy/tree/p-fol-ic3) |
| primal-dual Houdini | 20, including 10 unsafe; [fixed VM and instructions](https://doi.org/10.5281/zenodo.5703081) |
| IC3PO / ivybench | 29 original paper cases; 54 advertised / 58 current Ivy files; [collection](https://github.com/aman-goel/ivybench) |
| Endive | 30 comparison rows, including 2 without TLA+ translation; [fixed artifact](https://github.com/will62794/endive-artifact) |
| IC3Syn | 29; code/proof archive not located; [paper](https://arxiv.org/abs/2605.24619) |
| LMGPA | 26 protocol proofs; [modules](https://github.com/YUH-Z/lmgpa/tree/c27bf4f657c10254b8df8c66ca37f1cdbbf66f1e/benchmarks/distributed_ind_inv) |
| Scimitar final paper | 5; [live code](https://github.com/will62794/scimitar); cited fixed artifact unavailable |
| Kondo | 10; [source](https://github.com/GLaDOS-Michigan/Kondo) |
| Basilisk | 16; [artifact](https://github.com/GLaDOS-Michigan/Basilisk) |
| Sift | 6 systems; [source](https://github.com/GLaDOS-Michigan/Sift) |
| Paxos Made EPR | 6 variants; original archive not confirmed; [related encodings](https://github.com/aman-goel/ivybench) |
| ByMC / syncTA | 13 asynchronous/randomized + 16 synchronous families; [ByMC inputs](https://github.com/konnov/fault-tolerant-benchmarks), [syncTA](https://github.com/istoilkovska/syncTA) |
| inductive sequentialization | 7; [Civl](https://github.com/boogie-org/boogie/tree/fcecf73a49d11ad3ab16729abd03169e5ecfd938/Test/civl) |
| structured reduction 2026 | 4 principal cases; [Civl](https://github.com/boogie-org/boogie/tree/fcecf73a49d11ad3ab16729abd03169e5ecfd938/Test/civl) |
| bounded horizon | 9 journal rows, 7 conference rows; historical archive unavailable |
| ConsL cutoff bounds 2017 | 9 cases; [open paper](https://link.springer.com/content/pdf/10.1007/978-3-319-63390-9_12.pdf); historical source unavailable |
| cutoff automation 2022 | 7; source archive not located |
| QSM-Cutoff | 19; [inputs](https://github.com/QSM-Cutoff/ivybench) |
| Message Chains | 19 paper cases; [partial current source](https://github.com/FedericoAureliano/upverifier) |
| Veil CAV 2025 | 16, with support proofs; [fixed archive](https://doi.org/10.5281/zenodo.15208271) |
| DissProve | 7; source archive not located |

## Classical inference tools and shared suites

These tools start from a formal transition system and a formal safety condition. **Inference:** they are useful proof back ends for the proposed agent pipeline; they do not themselves infer the user's intended property from a vague description.

### DistAI

**DistAI: Data-Driven Automated Invariant Learning for Distributed Protocols**, Jianan Yao, Runzhou Tao, Ronghui Gu, Jason Nieh, Suman Jana, Gabriel Ryan, OSDI 2021, pp. 405–421. [Paper](https://www.usenix.org/conference/osdi21/presentation/yao); [PDF](https://www.usenix.org/system/files/osdi21-yao.pdf); [download code/suite](https://github.com/VeriGu/DistAI); [mirror inspected](https://github.com/will62794/DistAI).

It simulates small instances, enumerates formulas consistent with the samples, and checks/refines them with Ivy. The [README](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/README.md) states: “It takes a simulation-learning-refinement workflow.” Its suite declaration is “The 14 distributed protocols in Ivy.” Full names: async lock server (`multi_lock_server`), chord ring maintenance (`chord`), database replication (`database_chain_replication`), decentralized lock (`decentralized_lock`), distributed lock (`distributed_lock`), hashed sharding (`shard`), leader election (`leader`), learning switch (`switch`), lock server (`lock_server`), Paxos (`paxos`), permissioned blockchain (`blockchain`), Ricart-Agrawala (`Ricart-Agrawala`), simple consensus (`consensus`), two-phase commit (`two_phase_commit`). Each is downloaded under `protocols/NAME/NAME.ivy`; original properties follow in the manifest below.

### DuoAI

**DuoAI: Fast, Automated Inference of Inductive Invariants for Verifying Distributed Protocols**, Jianan Yao, Runzhou Tao, Ronghui Gu, Jason Nieh, OSDI 2022, pp. 485–501. [Paper](https://www.usenix.org/conference/osdi22/presentation/yao); [PDF](https://www.usenix.org/system/files/osdi22-yao.pdf); [download code/suite](https://github.com/VeriGu/DuoAI).

The [README](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/README.md) says “applies top-down/bottom-up refinement” It allows formulas with both universal and existential quantifiers. Paper Table 1 (p. 497) lists 27 protocols; §7 (p. 496) reports “solving all but 1 of the 27 protocols.” Vertical Paxos runs out of memory in that experiment. This is a safety benchmark: consensus agreement is different from proving that consensus eventually happens. The complete suite is listed below, with the safety property read from each linked `.ivy` file. 

| Problem (source link) | Safety condition in plain words |
|---|---|
| [`chord_ring_maintenance`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/chord_ring_maintenance/chord_ring_maintenance.ivy) | ring connectivity, encoded as absence of error |
| [`client_server_ae`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/client_server_ae/client_server_ae.ivy) | each received response matches a sent request |
| [`client_server_db_ae`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/client_server_db_ae/client_server_db_ae.ivy) | each received response matches a sent request, through a database |
| [`consensus_epr`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/consensus_epr/consensus_epr.ivy) | all decisions agree |
| [`consensus_forall`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/consensus_forall/consensus_forall.ivy) | all decisions agree, with ghost state for universal invariants |
| [`consensus_wo_decide`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/consensus_wo_decide/consensus_wo_decide.ivy) | at most one leader |
| [`database_chain_replication`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/database_chain_replication/database_chain_replication.ivy) | transaction ordering and atomicity constraints |
| [`decentralized_lock`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/decentralized_lock/decentralized_lock.ivy) | at most one lock holder |
| [`distributed_lock`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/distributed_lock/distributed_lock.ivy) | at most one holder in an epoch |
| [`fast_paxos`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/fast_paxos/fast_paxos.ivy) | all decisions agree |
| [`flexible_paxos`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/flexible_paxos/flexible_paxos.ivy) | all decisions agree |
| [`hybrid_reliable_broadcast`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/hybrid_reliable_broadcast/hybrid_reliable_broadcast.ivy) | honest acceptance requires an honest initial receiver |
| [`learning_switch_quad`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/learning_switch_quad/learning_switch_quad.ivy) | routing relation satisfies order constraints |
| [`learning_switch_ternary`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/learning_switch_ternary/learning_switch_ternary.ivy) | routing relation satisfies order constraints |
| [`lock_server_async`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/lock_server_async/lock_server_async.ivy) | at most one holder of a lock |
| [`lock_server_sync`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/lock_server_sync/lock_server_sync.ivy) | at most one client connected to a server |
| [`multi_paxos`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/multi_paxos/multi_paxos.ivy) | agreement within each instance |
| [`paxos`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/paxos/paxos.ivy) | all decisions agree |
| [`ring_leader_election`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/ring_leader_election/ring_leader_election.ivy) | at most one leader |
| [`sharded_key_value_store`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/sharded_key_value_store/sharded_key_value_store.ivy) | unique node and value for each stored key |
| [`sharded_kv_no_lost_keys`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/sharded_kv_no_lost_keys/sharded_kv_no_lost_keys.ivy) | a message exists or every key has an owner (literal disjunction matters) |
| [`stoppable_paxos`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/stoppable_paxos/stoppable_paxos.ivy) | agreement within instances plus stop ordering constraints |
| [`ticket_lock`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/ticket_lock/ticket_lock.ivy) | at most one thread in the critical section |
| [`toy_consensus_epr`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/toy_consensus_epr/toy_consensus_epr.ivy) | all decisions agree |
| [`toy_consensus_forall`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/toy_consensus_forall/toy_consensus_forall.ivy) | all decisions agree, with ghost state |
| [`two_phase_commit`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/two_phase_commit/two_phase_commit.ivy) | commit/abort consistency and commit requires unanimous yes votes |
| [`vertical_paxos`](https://github.com/VeriGu/DuoAI/blob/ecd37c418ef56202ca332d5bca113e8e7c8c8fac/protocols/vertical_paxos/vertical_paxos.ivy) | all decisions agree |

### SWISS

**Finding Invariants of Distributed Systems: It's a Small (Enough) World After All**, Travis Hance, Marijn Heule, Ruben Martins, Bryan Parno, NSDI 2021, pp. 115–131. [Paper](https://www.usenix.org/conference/nsdi21/presentation/hance); [PDF](https://www.usenix.org/system/files/nsdi21-hance.pdf). It enumerates small quantified formulas, checks them with SMT, and combines a broad search for helpful formulas with a search that finishes the proof. §5.1 (p. 123) says its sources are “the I4 benchmarks”, first-order separators benchmarks, and “six Paxos variants”.

**Full Table 1 list (p. 124), including the guided run:** sdl; ring-election; learning-switch-ternary; lock-server-sync; two-phase-commit; chain; chord; distributed-lock; toy-consensus-forall; consensus-forall; consensus-wo-decide; learning-switch-quad; lock-server-async; sharded-kv; ticket; toy-consensus-epr; consensus-epr; client-server-ae; client-server-db-ae; sharded-kv-no-lost-keys; hybrid-reliable-broadcast; paxos; flexible-paxos; multi-paxos; multi-paxos*; fast-paxos; stoppable-paxos; vertical-paxos. `multi-paxos*` repeats a protocol with human guidance: the Table 1 caption says “the user provides a correct template”. Thus there are 27 distinct protocol models and 28 rows, not 28 independent tasks. DuoAI uses the same central families, but encodings and experimental assumptions differ. The authoritative [SWISS repository and inputs](https://github.com/secure-foundations/SWISS/tree/348b9c4f9b0b2f124b50c8f420d071f4bc0789b3/benchmarks) were subsequently located through the primal-dual Houdini artifact documentation. The README supplies run commands and per-model `.config` files. Related models exist in DuoAI/mypyvy/I4/Paxos made EPR, but these do not necessarily preserve the exact SWISS encoding.

### I4

**I4: Incremental Inference of Inductive Invariants for Verification of Distributed Protocols**, Haojun Ma, Aman Goel, Jean-Baptiste Jeannin, Manos Kapritsos, Baris Kasikci, Karem A. Sakallah, SOSP 2019, pp. 370–384. [Code/download](https://github.com/GLaDOS-Michigan/I4); [suite converted into Ivy/PYV/VMT](https://github.com/aman-goel/ivybench/tree/d2c9298fdd099001c71a34bc2e118db6f07d8404/i4). It finds invariants for finite instances with Averroes, generalizes them, and asks Ivy to check induction for all instance sizes. The [README](https://github.com/GLaDOS-Michigan/I4/blob/0c53ceb865487c5fda3e91fb9e379baf9840b2de/README.md) says “if it does not, go back to step 1 and increase the model size.” Thus finite checking is candidate generation, not the final argument for arbitrary size.

**Full seven-model suite:** chord_ring_maintenance (connectivity/no error), database_chain_replication (transaction ordering/atomicity), distributed_lock (exclusive lock ownership per epoch), leader_election_in_ring (unique leader), learning_switch (routing consistency), lock_server (unique client per server), two_phase_commit (consistent commit/abort). The literal source properties are linked in the ivybench manifest below.

### FOL-IC3 and mypyvy

**First-Order Quantified Separators**, Jason R. Koenig, Oded Padon, Neil Immerman, Alex Aiken, PLDI 2020, pp. 703–717. [Paper DOI](https://doi.org/10.1145/3385412.3386018); [artifact](https://doi.org/10.1145/3395650); [pinned implementation/download](https://github.com/wilcoxjay/mypyvy/tree/3887c3102644ca3db34b0d0c04765658869315a8); [separator dependency](https://github.com/jrkoenig/folseparators/tree/pldi20-artifact). The pinned README describes `--logic=fol` as “for quantifier alternation” and `universal` as “for universal only.” FOL-IC3 searches for formulas separating good and bad finite structures, within an IC3 proof search.

**Pinned `examples/fol` has 19 files:** bosco_3t_safety; client_server_ae; client_server_db_ae; consensus_epr; consensus_forall; consensus_wo_decide; firewall; hybrid_reliable_broadcast_cisa; learning_switch; lockserv; paxos_epr; raft; ring_id; ring_id_not_dead; sharded_kv; sharded_kv_no_lost_keys; ticket; toy_consensus_epr; toy_consensus_forall. This is the repository manifest, not a claim that all 19 were successfully proved. `ivybench/mypyv` selects 16; Bosco, Paxos, and Raft are not in that subdirectory.

The [current mypyvy README](https://github.com/wilcoxjay/mypyvy) calls it “A language for symbolic transition systems, inspired by Ivy.” It supports checking supplied invariants, inference via UPDR, bounded model checking, and traces. Current `examples/` is larger than the pinned FOL-IC3 suite; do not report its many duplicate variants as independent protocol families.

### IC3PO and its shared ivybench collection

**On Symmetry and Quantification: A New Approach to Verify Distributed Protocols**, Aman Goel, Karem Sakallah, NFM 2021, pp. 131–150. [Paper](https://arxiv.org/abs/2103.14831); [implementation](https://github.com/aman-goel/ic3po); [benchmark download](https://github.com/aman-goel/ivybench). It learns a finite invariant and uses symmetry to generate quantifiers and check a size sufficient for an unbounded proof. The abstract (p. 1) says “the required prefix is automatically inferred without any search”.

**Towards an Automatic Proof of Lamport's Paxos**, Aman Goel, Karem A. Sakallah, FMCAD 2021, pp. 112–122. [Paper](https://arxiv.org/abs/2108.08796); [Paxos models](https://github.com/aman-goel/ivybench/tree/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos). It uses spatial symmetry, ordered rounds, and hierarchical strengthening. The abstract (p. 1) reports an invariant that “identically matches the human-written one”. This scope includes proof structure and auxiliary assertions; it should not be interpreted as solving raw Paxos from prose.

The [ivybench README](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/README.md) says “54 safety checking problems”. **Repository observation:** the six advertised groups total 54, but current `multisig/ivy` adds four files, making 58 physical Ivy inputs. Several are alternative encodings of the same underlying protocol. Each group below lists every Ivy filename and safety property read from its source. `mypyv` is the repository's spelling.

#### `distai` (2 Ivy files)

| Input | Safety condition |
|---|---|
| [`Ricart-Agrawala`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/distai/ivy/Ricart-Agrawala.ivy) | at most one node in critical section |
| [`blockchain`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/distai/ivy/blockchain.ivy) | honest nodes agree whether each block is confirmed at each time |

#### `ex` (14 Ivy files)

| Input | Safety condition |
|---|---|
| [`decentralized-lock`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/decentralized-lock.ivy) | at most one lock holder (per epoch for distributed variant) |
| [`decentralized-lock_abstract`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/decentralized-lock_abstract.ivy) | at most one lock holder (per epoch for distributed variant) |
| [`distributed_lock_abstract`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/distributed_lock_abstract.ivy) | at most one lock holder (per epoch for distributed variant) |
| [`distributed_lock_maxheld`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/distributed_lock_maxheld.ivy) | holder epoch is at least every node epoch |
| [`lockserv_automaton`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/lockserv_automaton.ivy) | at most one lock holder (per epoch for distributed variant) |
| [`majorityset-leader-election`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/majorityset-leader-election.ivy) | at most one leader |
| [`naive_consensus`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/naive_consensus.ivy) | all decisions agree |
| [`quorum-leader-election`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/quorum-leader-election.ivy) | at most one leader |
| [`ring`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/ring.ivy) | leader has maximum identifier |
| [`ring_id_not_dead_limited`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/ring_id_not_dead_limited.ivy) | leader exists or pending/unsent work remains |
| [`ring_not_dead`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/ring_not_dead.ivy) | leader exists or pending/unsent work remains |
| [`simple-decentralized-lock`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/simple-decentralized-lock.ivy) | at most one lock holder (per epoch for distributed variant) |
| [`simple-election`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/simple-election.ivy) | at most one leader |
| [`toy_consensus`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/ex/ivy/toy_consensus.ivy) | all decisions agree |

#### `i4` (7 Ivy files)

| Input | Safety condition |
|---|---|
| [`chord_ring_maintenance`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/i4/ivy/chord_ring_maintenance.ivy) | ring connectivity, encoded as absence of error |
| [`database_chain_replication`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/i4/ivy/database_chain_replication.ivy) | transaction ordering and atomicity constraints |
| [`distributed_lock`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/i4/ivy/distributed_lock.ivy) | at most one holder in an epoch |
| [`leader_election_in_ring`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/i4/ivy/leader_election_in_ring.ivy) | at most one leader |
| [`learning_switch`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/i4/ivy/learning_switch.ivy) | routing consistency |
| [`lock_server`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/i4/ivy/lock_server.ivy) | at most one lock holder (per epoch for distributed variant) |
| [`two_phase_commit`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/i4/ivy/two_phase_commit.ivy) | commit/abort consistency and commit requires unanimous yes votes |

#### `multisig` (4 Ivy files)

| Input | Safety condition |
|---|---|
| [`multisig-all`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/multisig/ivy/multisig-all.ivy) | cancel only after expiry; authorized signatures and proposal required for payment |
| [`multisig-all_simple`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/multisig/ivy/multisig-all_simple.ivy) | cancel only after expiry; authorized signatures and proposal required for payment |
| [`multisig-majority`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/multisig/ivy/multisig-majority.ivy) | cancel only after expiry; authorized signatures and proposal required for payment |
| [`multisig-majority_simple`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/multisig/ivy/multisig-majority_simple.ivy) | cancel only after expiry; authorized signatures and proposal required for payment |

#### `mypyv` (16 Ivy files)

| Input | Safety condition |
|---|---|
| [`client_server_ae`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/client_server_ae.ivy) | each received response matches a sent request |
| [`client_server_db_ae`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/client_server_db_ae.ivy) | each received response matches a sent request, through a database |
| [`consensus_epr`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/consensus_epr.ivy) | all decisions agree |
| [`consensus_forall`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/consensus_forall.ivy) | all decisions agree, with ghost state for universal invariants |
| [`consensus_wo_decide`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/consensus_wo_decide.ivy) | at most one leader |
| [`firewall`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/firewall.ivy) | inbound traffic requires an internal node previously contacting its source |
| [`hybrid_reliable_broadcast`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/hybrid_reliable_broadcast.ivy) | honest acceptance requires an honest initial receiver |
| [`learning_switch`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/learning_switch.ivy) | routing consistency |
| [`lockserv`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/lockserv.ivy) | at most one lock holder |
| [`ring_id`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/ring_id.ivy) | at most one leader |
| [`ring_id_not_dead`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/ring_id_not_dead.ivy) | leader exists or pending/unsent work remains |
| [`sharded_kv`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/sharded_kv.ivy) | unique key ownership/value; no-loss variant uses a disjunction |
| [`sharded_kv_no_lost_keys`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/sharded_kv_no_lost_keys.ivy) | a message exists or every key has an owner (literal disjunction matters) |
| [`ticket`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/ticket.ivy) | at most one thread in critical section |
| [`toy_consensus_epr`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/toy_consensus_epr.ivy) | all decisions agree |
| [`toy_consensus_forall`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/mypyv/ivy/toy_consensus_forall.ivy) | all decisions agree, with ghost state |

#### `paxos` (10 Ivy files)

| Input | Safety condition |
|---|---|
| [`Consensus`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/Consensus.ivy) | chosen values agree |
| [`FlexiblePaxos`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/FlexiblePaxos.ivy) | decisions agree |
| [`MultiPaxos`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/MultiPaxos.ivy) | decisions agree |
| [`Paxos`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/Paxos.ivy) | decisions agree |
| [`PaxosImplicit`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/PaxosImplicit.ivy) | decisions agree |
| [`PaxosSimple`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/PaxosSimple.ivy) | decisions agree |
| [`Voting`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/Voting.ivy) | votes/decisions agree |
| [`oopsla17_flexible_paxos`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/oopsla17_flexible_paxos.ivy) | decisions agree (per instance for multi/stoppable variants) |
| [`oopsla17_multi_paxos`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/oopsla17_multi_paxos.ivy) | decisions agree (per instance for multi/stoppable variants) |
| [`oopsla17_paxos`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/paxos/ivy/oopsla17_paxos.ivy) | decisions agree (per instance for multi/stoppable variants) |

#### `tla` (5 Ivy files)

| Input | Safety condition |
|---|---|
| [`Consensus`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/tla/ivy/Consensus.ivy) | chosen values agree |
| [`Simple`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/tla/ivy/Simple.ivy) | if all nodes finish, some output equals one |
| [`SimpleRegular`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/tla/ivy/SimpleRegular.ivy) | if all nodes finish, some output equals one |
| [`TCommit`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/tla/ivy/TCommit.ivy) | no simultaneous committed and aborted resource managers |
| [`TwoPhase`](https://github.com/aman-goel/ivybench/blob/d2c9298fdd099001c71a34bc2e118db6f07d8404/tla/ivy/TwoPhase.ivy) | no simultaneous committed and aborted resource managers |

The preceding source links preserve the exact input files. Some contain supplied strengthening or proof certificates alongside the intended property; these must be removed or explicitly counted as human guidance when evaluating inference.

### Comparability warning supported by the papers

DuoAI Table 1 (p. 497), footnote c, states that a comparison input had “3 bugs”. Footnote i states that IC3PO evaluations “manually provided clauses”. These are claims by the DuoAI authors about other tools' evaluations. The IC3PO paper should be read alongside that criticism. **Inference:** evaluation must freeze exact commits and distinguish raw specifications, additional predicates, invariant templates, and strengthening assertions. Counting protocol names alone conceals different amounts of human guidance.

### IC3PO paper's actual 29-protocol experiment (distinct from the larger repository)

Table 2, §8 (pp. 12–13 of arXiv PDF) reports the following complete set: tla-consensus; tla-tcommit; i4-lock-server; ex-quorum-leader-election; pyv-toy-consensus-forall; tla-simple; ex-lockserv-automaton; tla-simpleregular; pyv-sharded-kv; pyv-lockserv; tla-twophase; i4-learning-switch; ex-simple-decentralized-lock; i4-two-phase-commit; pyv-consensus-wo-decide; pyv-consensus-forall; pyv-learning-switch; i4-chord-ring-maintenance; pyv-sharded-kv-no-lost-keys; ex-naive-consensus; pyv-client-server-ae; ex-simple-election; pyv-toy-consensus-epr; ex-toy-consensus; pyv-client-server-db-ae; pyv-hybrid-reliable-broadcast; pyv-firewall; ex-majorityset-leader-election; pyv-consensus-epr. Table 2's row is “No. of problems solved (out of 29)”; IC3PO's entry is 29. [Experiment release](https://github.com/aman-goel/nfm2021exp) is referenced by the paper (p. 16); exact release download not inspected because GitHub API rate limiting started. `pyv-` here corresponds to the `mypyv/` group of ivybench.

### DistAI complete property manifest

| Input | Safety condition |
|---|---|
| [`Ricart-Agrawala`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/Ricart-Agrawala/Ricart-Agrawala.ivy) | at most one node in critical section |
| [`blockchain`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/blockchain/blockchain.ivy) | honest nodes agree whether each block is confirmed at each time |
| [`chord`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/chord/chord.ivy) | ring connectivity/no error |
| [`consensus`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/consensus/consensus.ivy) | all decisions agree |
| [`database_chain_replication`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/database_chain_replication/database_chain_replication.ivy) | transaction ordering and atomicity constraints |
| [`decentralized_lock`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/decentralized_lock/decentralized_lock.ivy) | at most one lock holder |
| [`distributed_lock`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/distributed_lock/distributed_lock.ivy) | at most one holder in an epoch |
| [`leader`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/leader/leader.ivy) | at most one leader |
| [`lock_server`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/lock_server/lock_server.ivy) | at most one lock holder (per epoch for distributed variant) |
| [`multi_lock_server`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/multi_lock_server/multi_lock_server.ivy) | at most one holder per lock |
| [`paxos`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/paxos/paxos.ivy) | all decisions agree |
| [`shard`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/shard/shard.ivy) | unique node and value per stored key |
| [`switch`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/switch/switch.ivy) | routing consistency |
| [`two_phase_commit`](https://github.com/will62794/DistAI/blob/3c2b90122585cf1e785e7e31fb64ccfc4982655f/protocols/two_phase_commit/two_phase_commit.ivy) | commit/abort consistency and commit requires unanimous yes votes |

### FOL-IC3 pinned properties

| Input | Safety condition |
|---|---|
| [`bosco_3t_safety`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/bosco_3t_safety.pyv) | nonfaulty agreement and validity, including ultimate consensus |
| [`client_server_ae`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/client_server_ae.pyv) | each received response matches a sent request |
| [`client_server_db_ae`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/client_server_db_ae.pyv) | each received response matches a sent request, through a database |
| [`consensus_epr`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/consensus_epr.pyv) | all decisions agree |
| [`consensus_forall`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/consensus_forall.pyv) | all decisions agree, with ghost state for universal invariants |
| [`consensus_wo_decide`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/consensus_wo_decide.pyv) | at most one leader |
| [`firewall`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/firewall.pyv) | inbound traffic requires an internal node previously contacting its source |
| [`hybrid_reliable_broadcast_cisa`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/hybrid_reliable_broadcast_cisa.pyv) | honest acceptance requires honest initial reception |
| [`learning_switch`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/learning_switch.pyv) | routing consistency |
| [`lockserv`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/lockserv.pyv) | at most one lock holder |
| [`paxos_epr`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/paxos_epr.pyv) | decisions agree (per instance for multi/stoppable variants) |
| [`raft`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/raft.pyv) | at most one committed value at each log index |
| [`ring_id`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/ring_id.pyv) | at most one leader |
| [`ring_id_not_dead`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/ring_id_not_dead.pyv) | leader exists or pending/unsent work remains |
| [`sharded_kv`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/sharded_kv.pyv) | unique key ownership/value; no-loss variant uses a disjunction |
| [`sharded_kv_no_lost_keys`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/sharded_kv_no_lost_keys.pyv) | a message exists or every key has an owner (literal disjunction matters) |
| [`ticket`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/ticket.pyv) | at most one thread in critical section |
| [`toy_consensus_epr`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/toy_consensus_epr.pyv) | all decisions agree |
| [`toy_consensus_forall`](https://github.com/wilcoxjay/mypyvy/blob/3887c3102644ca3db34b0d0c04765658869315a8/examples/fol/toy_consensus_forall.pyv) | all decisions agree, with ghost state |

FOL artifact properties not shared by the DuoAI table: firewall restricts inbound traffic to previously contacted outsiders; Bosco asserts agreement and validity for nonfaulty nodes; Raft asserts agreement of committed values at each log index. Ring `not_dead` is a state invariant saying a leader exists or work remains; it is not an eventual leader-election proof. Linked formal assertions are the authority when these plain-English summaries omit details.

### Ivy as the interactive verification foundation

**Ivy: Safety Verification by Interactive Generalization**, Oded Padon, Kenneth L. McMillan, Aurojit Panda, Mooly Sagiv, Sharon Shoham, PLDI 2016, pp. 614–630. [DOI](https://doi.org/10.1145/2908080.2908118); [code](https://github.com/microsoft/ivy). The [repository description](https://github.com/microsoft/ivy) says “the human protocol designer and the automated tool interact to expose errors and prove correctness.” Ivy checks inductive invariants using SMT and helps people generalize counterexamples. **Inference:** an agent can replace part of that interaction, while the checker still decides whether its proposed invariant proves the formal target. The broad Ivy examples directory is an evolving collection, not the fixed 14/27/54-case suites described above.

For the no-lost-keys task, the short literal excerpt is `transfer_msg` or `forall K. exists N. owner(N,K)`. The full file quantifies the first alternative existentially over node, key, and value: existence of any transfer message makes the stated target true. **Inference:** an evaluation should preserve this exact target instead of silently replacing it with the stronger per-key no-loss property.

### Current mypyvy `examples/misc/pd` complete directory manifest

This is a repository observation, not a verified match to the POPL 2022 experiment subset. Download: [the `pd` directory](https://github.com/wilcoxjay/mypyvy/tree/cd80557ae11f5958c7c81dbecf3b24f7a3b16c1f/examples/misc/pd). Names containing `unsafe` are deliberately faulty variants. The suffixes `forall`, `epr`, `choosable`, and `dnf` distinguish encodings or invariant vocabularies rather than new algorithms.

`cache`, `cache_unsafe`, `consensus_epr`, `consensus_forall`, `consensus_unsafe`, `consensus_unsafe2`, `fast_paxos_epr`, `fast_paxos_forall`, `fast_paxos_forall_choosable`, `flexible_paxos_epr`, `flexible_paxos_forall`, `flexible_paxos_forall_choosable`, `lockserv`, `lockserv_cnf`, `lockserv_unsafe`, `paxos_epr`, `paxos_forall`, `paxos_forall_choosable`, `paxos_forall_choosable_unsafe`, `paxos_forall_choosable_unsafe2`, `paxos_forall_choosable_unsafe_no_intersection`, `ring-id`, `ring`, `sharded-kv-retransmit`, `sharded-kv-retransmit_unsafe`, `sharded-kv`, `sharded-kv_unsafe`, `sharded-kv_unsafe2`, `stoppable_paxos_dnf_epr`, `stoppable_paxos_dnf_forall`, `stoppable_paxos_dnf_forall_choosable`, `stoppable_paxos_epr`, `stoppable_paxos_forall`, `stoppable_paxos_forall_choosable`, `tlb_safety`, `tlb_safety_prime`, `vertical_paxos_epr`, `vertical_paxos_forall`, `vertical_paxos_forall_choosable`.

There are 39 physical `.pyv` files in that directory at the inspected checkout. Protocol families: cache coherence, consensus, lock service, ring election, sharded key-value transfer (with retransmission variants), TLB safety, and Paxos/flexible/fast/stoppable/vertical Paxos. For precise targets, [each linked model](https://github.com/wilcoxjay/mypyvy/tree/cd80557ae11f5958c7c81dbecf3b24f7a3b16c1f/examples/misc/pd) marks the assertion using `safety`; unsafe models intentionally allow violating that target.

| `pd` family (including variants) | Safety target read from source |
|---|---|
| cache | an unmodified, valid cache entry equals memory |
| consensus | decisions agree |
| lockserv | at most one lock holder |
| ring / ring-id | at most one leader |
| sharded-kv / retransmit | unique node and value per key |
| tlb_safety / prime | error state is unreachable |
| Paxos families | all decisions agree, per instance where indexed |

### P-FOL-IC3: full 30-model experiment recovered

**Inferring Invariants with Quantifier Alternations: Taming the Search Space Explosion**, Jason R. Koenig, Oded Padon, Sharon Shoham, Alex Aiken, TACAS 2022, pp. 338–356. [Open publisher PDF](https://link.springer.com/content/pdf/10.1007/978-3-030-99524-9_18.pdf), [implementation branch](https://github.com/wilcoxjay/mypyvy/tree/p-fol-ic3), [inspected branch snapshot](https://github.com/wilcoxjay/mypyvy/tree/14269ba7c343ff51fdb737588b80806f5eed0c9d). The paper uses breadth-first lemma search and a restricted formula shape that permits both conjunctions and disjunctions. Section 6.1, printed p. 349: “All our examples are safe transition systems with a known human-written invariant.” Its experimental set has 30 models, not the PLDI 2020 artifact's 19 files.

**Complete Table 1, printed p. 350:** lockserv; toy-consensus-forall; ring-id; sharded-kv; ticket; learning-switch; consensus-wo-decide; consensus-forall; cache; paxos-forall; flexible-paxos-forall; stoppable-paxos-forall; fast-paxos-forall; vertical-paxos-forall; firewall; sharded-kv-no-lost-keys; toy-consensus-epr; ring-id-not-dead; consensus-epr; client-server-ae; client-server-db-ae; hybrid-reliable-broadcast; paxos-epr; flexible-paxos-epr; multi-paxos-epr; stoppable-paxos-epr; fast-paxos-epr; vertical-paxos-epr; block-cache-async; bosco-3t-safety.

Properties for lock/leader/consensus/routing/firewall/client-server/sharding cases follow the narrow tables above. Paxos variants target agreement; Multi-Paxos targets agreement per instance; Stoppable Paxos also excludes decisions after a decided stop marker. `ring-id-not-dead` says a leader, pending message, or unsent identifier still exists; it is an invariant, not eventual election. `cache` requires a non-invalid, non-modified cached value to equal memory. `block-cache-async` contains safety obligations relating cache and synchronization states to an abstract storage model. Bosco contains honest-node agreement and validity under its fault/threshold assumptions. These last readings are from the corresponding `.pyv` safety declarations. Download inputs from mypyvy `examples/fol` and `examples/pd` in the branch snapshot; the exact experiment checkout versus current branch still needs confirmation.

### Primal-dual Houdini: full fixed 20-task evaluation

**Induction Duality: Primal-Dual Search for Invariants**, Oded Padon, James R. Wilcox, Jason R. Koenig, Kenneth L. McMillan, Alex Aiken, POPL/PACMPL 6, 2022, pp. 1–29. [DOI](https://doi.org/10.1145/3498712), [fixed artifact](https://doi.org/10.5281/zenodo.5703081), [artifact instructions](https://zenodo.org/api/records/5703081/files/induction-duality-popl-2022-artifact.txt/content), [code and model snapshot](https://github.com/wilcoxjay/mypyvy/tree/5dcbb19/examples/pd). It couples a candidate-invariant elimination algorithm, Houdini, with a mathematically dual search over states. The Crossref publisher abstract calls it “primal-dual Houdini”. The publisher PDF request returned HTTP 403; the artifact instructions and source snapshot were read instead.

The artifact says its Table 2 uses “20 benchmarks (10 safe and 10 unsafe)”. The complete table-to-file mapping below is transcribed from the authors' artifact. Unsafe variants deliberately break a protocol while preserving a safety target, so an evaluation should require a counterexample rather than a proof. The source snapshot contains all listed input filenames; its supplied invariant declarations must be distinguished from the safety target.

| paper task → source stem | target property / status |
|---|---|
| ring → ring | unique leader; safe |
| cons → consensus | decision agreement; safe |
| paxos → paxos_forall_choosable | Paxos agreement; safe |
| spaxos → stoppable_paxos_forall_choosable | agreement and stopping order; safe |
| paxos-h → paxos_forall | Paxos agreement, alternate representation; safe |
| spaxos-h → stoppable_paxos_forall | agreement and stopping order, alternate representation; safe |
| locksrv → lockserv | unique lock holder; safe |
| skv → sharded-kv | unique owner/value per key; safe |
| skvr → sharded-kv-retransmit | same with retransmission; safe |
| cache → cache | valid unmodified cache lines equal memory; safe |
| cons-u1 → consensus_unsafe | decision agreement; unsafe |
| cons-u2 → consensus_unsafe2 | decision agreement; unsafe |
| paxos-u1 → paxos_forall_choosable_unsafe_no_intersection | agreement without required quorum intersection; unsafe |
| paxos-u2 → paxos_forall_choosable_unsafe2 | agreement; unsafe |
| paxos-u3 → paxos_forall_choosable_unsafe | agreement; unsafe |
| locksrv-u → lockserv_unsafe | unique lock holder; unsafe |
| skv-u1 → sharded-kv_unsafe | unique owner/value per key; unsafe |
| skv-u2 → sharded-kv_unsafe2 | unique owner/value per key; unsafe |
| skvr-u → sharded-kv-retransmit_unsafe | same with retransmission; unsafe |
| cache-u → cache_unsafe | valid unmodified cache lines equal memory; unsafe |

For exact multi-tool experiment inputs and logs, download the Zenodo VM (`induction-duality-popl-2022-artifact.ova`, about 5.45 GB). The instructions identify `popl-2022-experiments/inputs` and record mypyvy commit `5dcbb19`, SWISS `348b9c4`, IC3PO experiment commit `9d3a54b`, and DistAI `0ec9389`. This resolves the fixed experiment subset; a changing repository's larger example inventory remains a different object.

## TLA+ invariant inference, LLM proof assistance, and protocol benchmark sets

Research checked 6 October 2026 using live author sites, arXiv PDFs, USENIX PDFs, GitHub repository clones, and Crossref metadata. All principal papers below were read as PDF text. **Inference:** a useful evaluation separates finding an invariant, proving that supplied invariant inductive for every system size, and proving refinement to a desired external specification. These papers evaluate different stages.

### Endive: TLA+ candidates, followed by an unbounded proof

**Plain and Simple Inductive Invariant Inference for Distributed Protocols in TLA+**, William Schultz, Ian Dardik, Stavros Tripakis, FMCAD 2022. [Paper](https://arxiv.org/abs/2205.06360), [code and benchmarks](https://github.com/will62794/endive/tree/8b6f2abd1988eeb308f965813635e9871f253e2d/benchmarks), [archived evaluation](https://github.com/will62794/endive-artifact).

Endive samples candidate lemmas from a user-provided predicate grammar, checks them on finite instances, and greedily selects lemmas that eliminate induction counterexamples. The resulting invariant needs a TLAPS proof for an unbounded protocol. The repository cautions: “This generated inductive invariant is not necessarily a true inductive invariant” ([README](https://github.com/will62794/endive#example-usage)); its continuation attributes this to probabilistic counterexample sampling. The paper reports “an inductive invariant for 25 of the 29 protocol benchmarks” (§IV-C, p. 6). Its table contains 30 rows: the shared 29-case Ivy suite plus MLDR; two rows have no TLA+ translation, so distinguish the comparison universe from runnable TLA+ cases.

**Full FMCAD 2022 comparison suite, Table I p. 5:** tla-consensus; tla-tcommit; i4-lock-server; ex-quorum-leader-election; pyv-toy-consensus-forall; tla-simple; ex-lockserv-automaton; tla-simpleregular; pyv-sharded-kv; pyv-lockserv; tla-twophase; i4-learning-switch; ex-simple-decentralized-lock; i4-two-phase-commit; pyv-consensus-wo-decide; pyv-consensus-forall; pyv-learning-switch; i4-chord-ring-maintenance (**n/a TLA+**); pyv-sharded-kv-no-lost-keys; ex-naive-consensus; pyv-client-server-ae; ex-simple-election; pyv-toy-consensus-epr; ex-toy-consensus; pyv-client-server-db-ae; pyv-hybrid-reliable-broadcast (**n/a TLA+**); pyv-firewall; ex-majorityset-leader-election; pyv-consensus-epr; mldr.

The following properties are direct readings of the named TLA+ definitions, not assertions of liveness. Download [benchmark source](https://github.com/will62794/endive/tree/8b6f2abd1988eeb308f965813635e9871f253e2d/benchmarks). Each row identifies source filenames; prefixes above identify historical tool origins, not separate protocol semantics.

| Problem/source | Safety property in plain words |
|---|---|
| Consensus.tla; toy_consensus.tla; toy_consensus_epr.tla; toy_consensus_forall.tla; naive_consensus.tla; consensus_epr.tla; consensus_forall.tla; Paxos.tla | at most one decided/chosen value |
| TCommit.tla; TwoPhase.tla | no resource manager aborts while another commits |
| two_phase_commit.tla | commit and abort do not coexist; commit requires all yes votes; abort requires its abort flag |
| lockserver.tla | different clients cannot hold the same lock |
| lockserv.tla; lockserv_automaton.tla; simple_decentralized_lock.tla | at most one node holds the lock |
| quorum_leader_election.tla; majorityset_leader_election.tla; simple_election.tla; consensus_wo_decide.tla | at most one leader |
| Simple.tla; SimpleRegular.tla | if all processes finish, at least one output equals 1 |
| sharded_kv.tla | a key/value pair cannot reside at two different nodes |
| sharded_kv_no_lost_keys.tla | either a transfer message exists, or every key has an owner |
| client_server_ae.tla; client_server_db_ae.tla | each received response matches an appropriate request |
| learning_switch.tla; learning_switch_i4.tla | routing reachability is reflexive, transitive, antisymmetric, and comparable for routes from the same source |
| firewall.tla | traffic sent into an internal node has an earlier internal sender witness |
| MongoLoglessDynamicRaft.tla | OnePrimaryPerTerm: at most one primary in a term |

Exact examples: `Consensus.tla` defines `Inv == /\ TypeOK /\ Cardinality(chosen) \leq 1`; `lockserv.tla` defines `Mutex == \A x,y \in Node : (holds_lock[x] /\ holds_lock[y]) => (x = y)`; `TwoPhase.tla` describes “two RMs have not arrived at conflicting decisions.” These code quotations establish the row interpretations. The live repository also includes Peterson mutual exclusion and Paxos beyond the original evaluated suite; do not silently count them as FMCAD 2022 benchmark rows.

### IC3Syn: a direct 2026 LLM invariant search result

**Synthesizing Inductive Invariants for Distributed Protocols via IC3 and Large Language Models**, Weining Cao, Guangyuan Wu, Yuan Yao, Hengfeng Wei, Taolue Chen, Xiaoxing Ma, arXiv preprint, 23 May 2026. [Paper](https://arxiv.org/abs/2605.24619). No publicly downloadable implementation or proof artifact was located in the paper or GitHub repository-name search `IC3Syn` on 6 October 2026. This limits independent reproduction.

The IC3 controller gives an LLM concrete states to block; the LLM proposes TLA+ clauses; TLC/Apalache validate finite-instance steps; TLAPS subsequently proves the unbounded result. Table 1 p. 9 reports all 29 solved. Section 7.2 p. 11 limits the synthesis loop to finite instances. The unbounded-proof claim must be reported separately from finite discovery: §7.2 says “TLAPS proves that the discovered invariants are inductive for unbounded protocol instances.”

**Full 29-case suite, Table 1 p. 9:** tla-consensus; tla-tcommit; i4-lock-server; ex-quorum-leader-election; pyv-toy-consensus-forall; tla-simple; ex-lockserv-automaton; tla-simpleregular; pyv-sharded-kv; pyv-lockserv; tla-twophase; i4-learning-switch; ex-simple-decentralized-lock; i4-two-phase-commit; pyv-consensus-wo-decide; pyv-consensus-forall; pyv-learning-switch; pyv-sharded-kv-no-lost-keys; ex-naive-consensus; pyv-client-server-ae; ex-simple-election; pyv-toy-consensus-epr; ex-toy-consensus; pyv-client-server-db-ae; pyv-firewall; ex-majorityset-leader-election; pyv-consensus-epr; mldr; pyv-paxos-epr.

The shared 28 cases are the translated endive suite; the added `pyv-paxos-epr` comes from IC3PO and was adapted to TLA+ (§6.1). Properties follow the preceding source-property table; added Paxos requires agreement on chosen values. Baseline times and success are the paper authors' reproductions, not our measurements. MLDR's row is 4525 seconds and 16 clauses; added Paxos is 1806 seconds and 9 clauses. Table 1 counts clauses excluding TypeOK and including safety clauses. The paper's Endive rerun solves 24 shared cases, unlike Endive's original result; §7.1 acknowledges difficulty reproducing the original expert predicate pool.

The end-to-end result still needs careful wording. MLDR proof claim (§7.1 p. 11): over 3,000 proof lines, primarily completed by LLM agents with minimal human intervention; exact quote: “not a single line of proof was directly written by a human.” Its proof advancement used a scaffold and Codex automation; integration into a fully automatic pipeline is ongoing work. **Inference:** this is strong evidence that invariant discovery plus structured proof decomposition can make protocol verification feasible for agents, but not evidence that vague natural-language requirements were automatically turned into the right specification.

### LMGPA: prove supplied invariants rather than discover them

**Towards Language Model Guided TLA+ Proof Automation**, Yuhao Zhou, Stavros Tripakis, arXiv December 2025/revised February 2026; TACAS 2026 DOI [10.1007/978-3-032-26204-2_32](https://doi.org/10.1007/978-3-032-26204-2_32). [Paper](https://arxiv.org/abs/2512.09758), [tool and full suite](https://github.com/YUH-Z/lmgpa), [archived artifact](https://doi.org/10.5281/zenodo.18637323).

An LLM decomposes difficult TLAPS obligations into smaller claims; symbolic provers verify them. The given invariant is already part of the input. Quote (§4.2 p. 11): “26 inductiveness proofs of candidate inductive invariants of distributed protocols.” Alongside these are 93 translated mathematical theorems, for 119 total. Its strongest protocol result is 50.0% with DeepSeekV3.2-Exp, versus 38.5% symbolic-only and 0.0% direct generation for that model (Table 1 p. 13). This is a different task from synthesizing a missing invariant.

**Full 26 protocol files** in [`benchmarks/distributed_ind_inv`](https://github.com/YUH-Z/lmgpa/tree/c27bf4f657c10254b8df8c66ca37f1cdbbf66f1e/benchmarks/distributed_ind_inv): `1_Consensus`; `2_TCommit`; `3_lockserver`; `4_quorum_leader_election`; `5_toy_consensus_forall`; `6_Simple`; `7_lockserv_automaton`; `8_SimpleRegular`; `9_sharded_kv`; `10_lockserv`; `11_TwoPhase`; `13_simple_decentralized_lock`; `14_two_phase_commit`; `15_consensus_wo_decide`; `16_consensus_forall`; `19_sharded_kv_no_lost_keys`; `20_naive_consensus`; `21_client_server_ae`; `22_simple_election`; `23_toy_consensus_epr`; `24_toy_consensus`; `25_client_server_db_ae`; `27_firewall`; `28_majorityset_leader_election`; `29_consensus_epr`; `30_MongoLoglessDynamicRaft`. Each is a `.tla` module. Properties are the same named endive properties above. This suite leaves out both learning switches, chord, and hybrid broadcast from the original comparison table.

### Scimitar: distinguish the final interactive paper from an older automatic draft

**Interactive Safety Verification of Distributed Protocols by Inductive Proof Decomposition**, William Schultz, Edward Ashton, Heidi Howard, Stavros Tripakis, NASA Formal Methods 2026. [Final author PDF](https://will62794.github.io/assets/papers/nfm26-interactive-verif.pdf), [DOI](https://doi.org/10.1007/978-3-032-28079-4_1), [Scimitar repository](https://github.com/will62794/scimitar).

The tool gives a user small induction failures tied to a particular lemma and action, and hides irrelevant state variables. Quote (abstract p 1): “an inductive proof graph, which is built incrementally by a human verifier.” It uses bounded TLC/Apalache counterexamples and verifies final invariants with TLAPS (§5 p. 14). The cited artifact `https://github.com/will62794/nfm26-artifact` was **unavailable** (GitHub repository not found) when checked; the live Scimitar repo remains downloadable.

**Full final paper suite** (Table 1 p. 15 and §5 p. 14):

| Protocol and guarantee | spec/proof LOC; lemmas |
|---|---|
| SimpleConsensus: no conflicting decided values | 111/18; 8 |
| TwoPhase: no conflicting commit/abort decisions | 192/140; 16 |
| AbstractRaft: committed entries consistent across nodes (`StateMachineSafety`) | 220/138; 10 |
| Bakery: no two processes simultaneously in critical section | 283/116; 27 |
| AsyncRaft: committed indices agree (`NoLogDivergence`) | 638/920; 39 |

Effort quote (§5.1 p. 17): “approximately 3 human weeks of effort.” This is AsyncRaft invariant development. It is not an automatic 21-hour proof. The older [author draft](https://will62794.github.io/assets/papers/interpretable-verification-2024.pdf), titled **Interpretable Safety Verification of Distributed Protocols by Inductive Proof Decomposition**, has an automatic synthesis evaluation for AsyncRaft `LogMatching`, 33 lemma nodes, 173 grammar predicates, around 21h. Its metadata contains a template conference header and must not be cited as the final NFM 2026 result.

The live Scimitar repository contains many experiments outside the final paper's five. A machine-extracted full configuration inventory is appended below; file presence is not evidence the problem was solved.

### Kondo and Basilisk: prove protocols with richer logic using structure

**Inductive Invariants That Spark Joy: Using Invariant Taxonomies to Streamline Distributed Protocol Proofs**, Tony Nuda Zhang, Travis Hance, Manos Kapritsos, Tej Chajed, Bryan Parno, OSDI 2024. [Paper](https://www.usenix.org/conference/osdi24/presentation/zhang-nuda), [Kondo download](https://github.com/GLaDOS-Michigan/Kondo). Kondo generates routine network/history/ownership facts and transfers a user-written synchronous proof to asynchronous execution. The developer still provides protocol-specific invariants and synchronous proof. **Full evaluated suite, Table 1 p. 848:** Echo Server; Ring Leader Election; Simplified Leader Election; Two-Phase Commit; Paxos; Flexible Paxos; Distributed Lock; ShardedKV; ShardedKV-Batched; Lock Server. Guarantees appear in the Basilisk shared suite below. Human proof-size examples from Table 1: Paxos has 631 specification lines, 20 supplied invariant clauses, 557 synchronous proof lines, and 220 lines of modified asynchronous lemmas. Flexible Paxos has 633/20/554/226 in the same categories; Ring Leader Election has 183/1/56/0. These are artifact sizes, not elapsed person time.

**Basilisk: Using Provenance Invariants to Automate Proofs of Undecidable Protocols**, Tony Nuda Zhang, Keshav Singh, Tej Chajed, Manos Kapritsos, Bryan Parno, OSDI 2025. [Paper](https://www.usenix.org/conference/osdi25/presentation/zhang-tony), [complete artifact](https://github.com/GLaDOS-Michigan/Basilisk), [archive](https://zenodo.org/records/15392830). Dafny-based static analysis generates invariants tying values to the protocol steps that created them. Humans prove the resulting invariant implies safety. Section 6.2 p. 11 says humans still write the safety proof. Scope quote (§6.4 p. 12): “Basilisk is designed to prove the safety of crash fault tolerant distributed protocols.” Its next sentence excludes liveness and Byzantine fault tolerance. Generated invariant search does not equal a fully automatic safety proof.

**Full evaluated 16-case Basilisk suite and guarantees** (Appendix B pp 16-17, download directories under [`basilisk/`](https://github.com/GLaDOS-Michigan/Basilisk/tree/394ce1412df9c6e59efe6a00207f0f468400aa61/basilisk)):

| Problem | Guarantee |
|---|---|
| Echo Server | received responses are a subset of that client's sent messages |
| Ring Leader Election | at most one elected leader |
| Simple Leader Election | at most one elected leader |
| Paxos | no two hosts learn different values |
| Paxos-Combined | agreement, with each host carrying all three Paxos roles |
| Paxos-Dynamic | agreement, with hosts increasing ballots and retrying |
| Flexible Paxos | agreement |
| Distributed Lock | at most one lock holder |
| ShardedKV | each key owned by at most one host |
| ShardedKV-Batched | same, with arbitrary-size batches |
| Lock Server | at most one client holds the lock |
| Two-Phase Commit | decisions agree with coordinator; commit only if all vote yes; all yes requires commit |
| Three-Phase Commit | same three safety assertions |
| Reduce | returned sum equals sum of all hosts' input segments |
| Raft Leader Election | at most one leader per term |
| Multi-Paxos | agreement at every log index |

Verbatim property anchor (Appendix B p. 17): “Each term has at most one leader.” Table 1, p. 11, reports specification/total proof lines of 418/486 for Paxos, 418/483 for Flexible Paxos, and 447/565 for Multi-Paxos. All 16 rows have zero supplied inductive invariant clauses. Paxos-Dynamic, Raft Leader Election, and Multi-Paxos each use two human provenance hints; the remaining cases use zero. Additional monotonicity annotations and ownership labels still needed. The live repo also contains `twoPhaseCommitMultiTransaction` and `twoPhaseCommit_paper-version`; these are beyond/different variants of the evaluated sixteen.

### Sift: refinement from protocol down to executable systems

**Sift: Using Refinement-guided Automation to Verify Complex Distributed Systems**, Haojun Ma, Hammad Ahmad, Aman Goel, Eli Goldweber, Jean-Baptiste Jeannin, Manos Kapritsos, Baris Kasikci, USENIX ATC 2022. [Paper](https://www.usenix.org/conference/atc22/presentation/ma), [all source and executable-system benchmarks](https://github.com/GLaDOS-Michigan/Sift). It divides refinement into intermediate layers that IC3PO/Ivy can prove. Users choose layers and provide hints/abstractions; this is related proof automation, not arbitrary invariant discovery from an untouched full system.

**Full six-system suite, §7 p. 158/Table 1 p. 159:** Leader Election (`leader/`), Distributed Lock (`toy_lock/`), Two-Phase Commit (`2pc/`), Sharded Hash Table (`sht/`), Raft (`raft/`), MultiPaxos (`multipaxos/`). Guarantees: refinement to unique leader, unique lock, consistent commit, abstract key-value map, and consensus/shared-log specifications respectively. Table 1 human effort: under 5 minutes each for Leader Election, Distributed Lock, and Two-Phase Commit; under 30 minutes for SHT; one person-month for Raft; three person-weeks for MultiPaxos. Exact quote (§7.5 p. 160): “complete the proof of Raft in one person month.” It additionally uses earlier manual spec-to-abstract-layer proofs for Raft and MultiPaxos (Table 1 labels those rows `manual`). Source and generated C++ are accessible via repository README commands.

### Adjacent 2026 LLM result that is not a protocol benchmark

**CIll: CTI-Guided Invariant Generation via LLMs for Model Checking**, Yuheng Su, Tianjun Bu, Qiusong Yang, Yiwei Ci, Enyuan Tian, arXiv 2026. [Paper](https://arxiv.org/abs/2602.23389), [artifact](https://github.com/gipsyh/cill-exp). It uses induction counterexamples and bounded counterexamples to refine LLM-generated invariants, with IC3 and k-induction. Its full evaluated target list (Table 1 p. 14) is `nerv`, `picorv32`, `serv`, three RISC-V cores, not distributed protocols. Do not classify this as an Ivy/TLA+ protocol success merely because Ivy appears in related work. **Inference:** its verifier-guided search architecture is relevant, its benchmark population is not a replacement for distributed protocol evaluation.

### Gaps and search record

Searched OpenAlex, GitHub repository API, arXiv, author publication lists, and USENIX for LLM+Ivy, LLM+TLA+, LLM+TLAPS, LLM protocol invariants, IC3Syn, Scimitar, Basilisk, Kondo, Sift, and Lemur-related work. Found direct 2026 protocol invariant synthesis in IC3Syn and supplied-invariant TLAPS proof generation in LMGPA. No independently downloadable IC3Syn proof/code artifact was located; cited NFM 2026 archive repository returned repository-not-found. No verified claim of liveness for the above invariant suites was located. Bibliography mentions Lemur, but its C-program verification population should be distinguished from protocol inference. Lemur and Veil appear in the additional workflows section.

### Full live Scimitar configuration inventory (not an evaluated success list)

Repository snapshot checked 6 October 2026: f1b902dc0801cf435cb9dd6e6be495d5ed121787. Download all from [benchmarks](https://github.com/will62794/scimitar/tree/f1b902dc0801cf435cb9dd6e6be495d5ed121787/benchmarks). Each row pairs exact configuration basename with the named target predicate; property wording must be read from its `.tla` definition, especially generic names such as `Inv` and `Correctness`. Deliberately broken grammars and protocols remain listed so the manifest is complete.

| configuration path (without `.config.json`) | target property |
|---|---|
| `AbstractDynamicRaft` | `StateMachineSafety` |
| `AbstractRaft` | `H_StateMachineSafety` |
| `Allocator` | `H_ResourceMutex` |
| `AsyncRaft` | `H_NoLogDivergence` |
| `AsyncRaftUniversalMsg` | `H_LogMatching` |
| `AsyncRaft_small_logs` | `H_LogMatching` |
| `AsyncRaft_small_logs_broken` | `H_LogMatching` |
| `Bakery` | `H_MutualExclusion` |
| `Bakery_lemmas` | `H_MutualExclusion` |
| `Ben_or83` | `AgreementInv` |
| `Boulanger` | `H_MutualExclusion` |
| `Consensus` | `Inv` |
| `EPaxos` | `H_Consistency` |
| `ElasticConsensus` | `OneMasterPerTerm` |
| `FlexiblePaxos` | `Inv` |
| `GermanCache` | `CtrlProp1` |
| `Hermes` | `HConsistent` |
| `LamportMutex` | `Mutex` |
| `LamportMutex_broken_grammar` | `Mutex` |
| `LeastCircularSubstring` | `Correctness` |
| `MongoLoglessDynamicRaft` | `Safety` |
| `Paxos` | `Inv` |
| `Simple` | `PCorrect` |
| `SimpleConsensus` | `H_NoConflictingValues` |
| `SimpleRegular` | `PCorrect` |
| `TCommit` | `TCConsistent` |
| `TwoPhase` | `H_TCConsistent` |
| `Zab` | `H_PrefixConsistency` |
| `ZeusReliableCommit` | `RConsistentInvariant` |
| `basic_consensus` | `H_NoConflictingValues` |
| `client_server_ae` | `Inv` |
| `client_server_db_ae` | `Correctness` |
| `consensus_epr` | `H_NoConflictingValues` |
| `consensus_epr_broken_grammar` | `H_NoConflictingValues` |
| `consensus_epr_broken_grammar_2` | `H_NoConflictingValues` |
| `consensus_epr_known_lemmas` | `H_NoConflictingValues` |
| `consensus_epr_known_lemmas_missing1` | `H_NoConflictingValues` |
| `consensus_forall` | `Safety` |
| `consensus_wo_decide` | `Safety` |
| `duoai/chord_ring_maintenance` | `ErrorFree` |
| `duoai/client_server_ae` | `Correctness` |
| `duoai/client_server_db_ae` | `Correctness` |
| `duoai/consensus_epr` | `H_NoConflictingValues` |
| `duoai/consensus_forall` | `ConsensusInv` |
| `duoai/consensus_wo_decide` | `ConsensusInv` |
| `duoai/database_chain_replication` | `LinSafety` |
| `duoai/decentralized_lock` | `Inv` |
| `duoai/distributed_lock` | `LockInv` |
| `duoai/flexible_paxos_epr` | `ConsensusInv` |
| `duoai/learning_switch_quad` | `Correctness` |
| `duoai/learning_switch_ternary` | `Correctness` |
| `duoai/lock_server_async` | `Mutex` |
| `duoai/lock_server_sync` | `Inv` |
| `duoai/paxos_epr` | `ConsensusInv` |
| `duoai/ring_leader` | `LeaderSafety` |
| `duoai/sharded_key_value_store` | `Correctness` |
| `duoai/sharded_kv_no_lost_keys` | `Correctness` |
| `duoai/ticket_lock` | `MutualExcl` |
| `duoai/toy_consensus_epr` | `ConsensusInv` |
| `duoai/toy_consensus_forall` | `ConsensusInv` |
| `duoai/two_phase_commit` | `Inv` |
| `firewall` | `Inv` |
| `learning_switch` | `Safety` |
| `learning_switch_i4` | `Safety` |
| `lockserv` | `Mutex` |
| `lockserv_automaton` | `Mutex` |
| `lockserver` | `Inv` |
| `majorityset_leader_election` | `Safety` |
| `naive_consensus` | `Safety` |
| `peterson` | `Mutex` |
| `quorum_leader_election` | `Inv` |
| `sharded_kv` | `Safety` |
| `sharded_kv_no_lost_keys` | `Safety` |
| `simple_decentralized_lock` | `Inv` |
| `simple_election` | `Safety` |
| `toy_consensus` | `Inv` |
| `toy_consensus_epr` | `Safety` |
| `toy_consensus_forall` | `Inv` |
| `two_phase_commit` | `Safety` |

Repository manifests checked at these commits: endive `8b6f2abd1988eeb308f965813635e9871f253e2d`; LMGPA `c27bf4f657c10254b8df8c66ca37f1cdbbf66f1e`; Basilisk `394ce1412df9c6e59efe6a00207f0f468400aa61`; Sift `a76729730c6698f5bd03d73f4d966048b29c9f92`; Kondo `1d6c43e475cadfdf7a10bfb5137cd777ccf2138f`.

## Decidability, parameterized verification, and refinement

These techniques solve different parts of automation. EPR makes *checking a supplied proof* decidable. ByMC proves specially structured protocols for arbitrary participant counts. Civl lets a person replace complicated concurrent executions with simpler programs, and checks those replacements. My inference: evaluation should separate finding an invariant, preparing a representation in which checking works, and finding a refinement/sequentialization.

### Paxos Made EPR

**Paxos Made EPR: Decidable Reasoning about Distributed Protocols**, Oded Padon, Giuliano Losa, Mooly Sagiv, Sharon Shoham, OOPSLA/PACMPL 1 article 108, 2017. [Paper](https://arxiv.org/abs/1710.07191), [DOI](https://doi.org/10.1145/3140568). Read PDF including sections 4–8. Abstract quote: “The steps of the transformations are also mechanically checked, ensuring the soundness of the method.” Section 8 quote: “Z3 diverged in this case for all”. The latter refers to their attempted unbounded checks of original first-order models; it does not claim Z3 fails for every possible encoding.

People supply models, invariants, and systematic transformations; the checker verifies proof obligations in effectively propositional logic (EPR). EPR is a first-order fragment whose satisfiability is decidable. This is proof checking and representation design, not autonomous invariant discovery. Full case list: Paxos, Multi-Paxos, Vertical Paxos, Fast Paxos, Flexible Paxos, Stoppable Paxos; safety/agreement (no two different chosen values, per instance where applicable). Section 8 discusses original first-order versus transformed EPR encodings. Download location verified for related reusable encodings: [ivybench](https://github.com/aman-goel/ivybench), whose README explicitly cites this paper as its Paxos source. The paper’s §8 footnote 7 points to `http://www.cs.tau.ac.il/~odedp/paxos-made-epr.html`; the HTTPS version now returns 404. SWISS supplies related six-variant input models, but a verified copy of the original complete artifact remains missing.

### ByMC and threshold automata

**Survey on Parameterized Verification with Threshold Automata and the Byzantine Model Checker**, Igor Konnov, Marijana Lazić, Ilina Stoilkovska, Josef Widder, LMCS 19(1):5, 2023. [Paper/PDF](https://arxiv.org/abs/2011.14789), [publisher](https://lmcs.episciences.org/10824), [tool](https://github.com/konnov/bymc), [all benchmark sources](https://github.com/konnov/fault-tolerant-benchmarks). Read sections 3–7 and Tables 4/6. Section 6.1 quote: “All benchmarks discussed in this paper” are available in the linked repository. Section 7.2 quote: “we use ByMC to verify its one-round safety in the parameterized case”. This limits the Tendermint claim to one round, not full multi-round consensus.

The representation counts messages and participants, and guards actions by threshold tests. It supports arbitrary participant/fault counts under resilience conditions such as n>3t. Safety and liveness use different procedures; randomized termination has a specific round-rigid adversary restriction. Models and assumptions remain human inputs.

Table 4's complete asynchronous/randomized algorithm list:

| problem | verified property / scope |
|---|---|
| FRB (folklore reliable broadcast) | safety and liveness |
| STRB (Srikanth–Toueg reliable broadcast) | safety and liveness |
| ABA (asynchronous Byzantine agreement) | safety and liveness |
| NBACG (Guerraoui nonblocking atomic commit) | safety and liveness |
| NBACR (Raynal nonblocking atomic commit) | safety and liveness |
| CBC (conditional consensus, paper label) | safety and liveness |
| CF1S (one-step consensus folklore) | safety and liveness |
| C1CS (one-step consensus) | safety and liveness |
| BOSCO | safety and liveness |
| Ben-Or | safety and almost-sure termination under round-rigid adversaries |
| RABC (randomized asynchronous Byzantine consensus) | safety and that restricted termination |
| kSet | safety and that restricted termination |
| RS-BOSCO | safety and that restricted termination |

Table 4 distinguishes six tool generations; these are the best supported properties across generations, not success by every generation. [isola18 directory](https://github.com/konnov/fault-tolerant-benchmarks/tree/c9e8de463e0a6bc378d8f05270ffc7db043e79e6/isola18) gives Promela/threshold-automaton versions; [random19](https://github.com/konnov/fault-tolerant-benchmarks/tree/c9e8de463e0a6bc378d8f05270ffc7db043e79e6/random19) gives randomized variants. Concrete source filename `cc.ta` is the conditional-consensus model; keep paper abbreviation CBC and artifact label distinct.

Table 6's complete synchronous set follows. The property readings below come from `properties` declarations in the [syncTA algorithm modules](https://github.com/istoilkovska/syncTA/tree/9224ef50d5ada4782d0a1d5723531ebe43149584/algorithms): consensus agreement means correct nodes do not finish with conflicting values; validity prevents a decision contradicting unanimous correct inputs. Set-agreement models instead limit the number of distinct results to k. Broadcast unforgeability prevents acceptance without an initial sender witness. The per-file resilience/fault assumptions are essential.

| case | safety target and paper result |
|---|---|
| FloodSet | agreement and validity; verified |
| FairCons | agreement and validity; verified |
| PhaseKing | agreement and validity; verified |
| PhaseQueen | agreement and validity; verified |
| HybridKing | agreement and validity under hybrid faults; verified |
| ByzKing | agreement and validity under Byzantine faults; verified |
| OmitKing | agreement and validity under omission faults; verified |
| HybridQueen | agreement and validity under hybrid faults; no successful check in Table 6 |
| ByzQueen | agreement and validity under Byzantine faults; verified |
| OmitQueen | agreement and validity under omission faults; verified |
| FloodMin | k-set agreement and validity; verified tested encodings |
| FloodMinOmit | same under omission faults; verified |
| kSetOmit | set agreement and validity under omission faults; no successful check in Table 6 |
| STRB | broadcast unforgeability; verified |
| HybridRB | unforgeability under hybrid faults; verified |
| OmitRB | unforgeability under omission faults; verified |

Successful checks combine a diameter bound with bounded model checking. The synchronous checker is a separate prototype, not integrated into ByMC (§6.4). Download all synchronous encodings from [syncTA](https://github.com/istoilkovska/syncTA); `algorithms`, `boundable`, and `counterexamples` distinguish ordinary inputs, cases with theoretical bounds, and intentionally erroneous encodings. The live repository also includes corrected or additional encodings; the table above records the survey's evaluated set. [lmcs20](https://github.com/konnov/fault-tolerant-benchmarks/tree/c9e8de463e0a6bc378d8f05270ffc7db043e79e6/lmcs20) adds Tendermint one-round safety as `tendermint-1round-safety.ta` and `Tendermint_1round_safety.tla`.

### Civl and inductive sequentialization

Official [Civl site](https://civl-verifier.github.io/) identifies two design principles: quote “Layered Refinement” and “Structured Programs”. It states “Civl decomposes proof checking into modular verification conditions that are automatically verified by a theorem prover/SMT solver.” It links distributed samples [Paxos](https://github.com/boogie-org/boogie/tree/fcecf73a49d11ad3ab16729abd03169e5ecfd938/Test/civl/paxos), [2PC](https://github.com/boogie-org/boogie/blob/fcecf73a49d11ad3ab16729abd03169e5ecfd938/Test/civl/samples/2pc.bpl), [Chang–Roberts](https://github.com/boogie-org/boogie/blob/fcecf73a49d11ad3ab16729abd03169e5ecfd938/Test/civl/samples/ChangRoberts.bpl). This is a program/refinement benchmark complement to transition-system invariant suites.

**Inductive Sequentialization of Asynchronous Programs**, Bernhard Kragl, Constantin Enea, Thomas A. Henzinger, Suha Orhun Mutluergil, Shaz Qadeer, PLDI 2020. [PDF](https://civl-verifier.github.io/papers/pldi 2020.pdf), [DOI](https://doi.org/10.1145/3385412.3385980), [source suite](https://github.com/boogie-org/boogie/tree/fcecf73a49d11ad3ab16729abd03169e5ecfd938/Test/civl). Read sections1,5. Quote section 1: “The induction argument in IS is based on a user-provided”. Quote section 5.3: “We prove that there can be at most one leader.” The latter is Chang–Roberts's property. User supplies a simpler interleaving and commutativity evidence; checked induction makes this reduction sound.

Complete Table 1 (LOC columns include boilerplate in Civl/Boogie, not application source):

| problem | guarantee; total/IS/implementation LOC; seconds |
|---|---|
| Broadcast consensus | agreement; 396/108/121;1.0 |
| Ping-Pong | increasing received numbers and correct acknowledgments;281/91/106;0.9 |
| Producer-Consumer | increasing dequeued numbers;225/65/93;0.9 |
| N-Buyer | promised contributions cover ordered item's price;681/251/256;2.6 |
| Chang-Roberts | at most one elected leader;377/117/135;1.1 |
| Two-phase commit | consistent commit/abort decision;553/181/222;1.4 |
| Paxos | agreement;1168/534/302;4.2 |

Property descriptions above follow section 5; no liveness result is asserted. Table 1 counts IS applications respectively 2,1,1,4,2,4,1. No human-hour measurement found.

**Layered Concurrent Programs**, Bernhard Kragl, Shaz Qadeer, CAV 2018. [PDF](https://civl-verifier.github.io/papers/cav2018.pdf), [DOI](https://doi.org/10.1007/978-3-319-96145-3_5). Section 6 quote: “around fifty smaller programs (including a ticket lock and a lock-free stack)”. Large cases: concurrent garbage collector and data-race detector. This establishes the layered program model and mechanically checked relationships between layers; the paper is not an automatic invariant synthesizer.

**Refinement for Structured Concurrent Programs**, Bernhard Kragl, Shaz Qadeer, Thomas A. Henzinger, CAV 2020. [PDF](https://civl-verifier.github.io/papers/cav 2020.pdf). Section 6 quote: “The open-source Civl verifier is a stable tool”. It supports proof decomposition using program structure, yield invariants and permissions. No fixed complete protocol benchmark list identified in this paper.

**The Civl Verifier**, Bernhard Kragl, Shaz Qadeer, FMCAD 2021. [PDF](https://civl-verifier.github.io/papers/fmcad 2021.pdf). Read section 6. Quote: “a Paxos implementation”. Gives tool overview and retained case studies, including garbage collection, Paxos and locks. Exact full test suite is a changing repository, not a fixed protocol benchmark; use a pinned commit when evaluating.

**Reduction for Structured Concurrent Programs**, Namratha Gangamreddypalli, Constantin Enea, Shaz Qadeer, ESOP 2026. [PDF](https://civl-verifier.github.io/papers/esop 2026.pdf), [sources](https://github.com/boogie-org/boogie/tree/fcecf73a49d11ad3ab16729abd03169e5ecfd938/Test/civl). Read section 8/Fig 12. Quote abstract: “these two foundational strategies can be composed arbitrarily”. Quote section 8: “approximately 50 further examples”. Full paper case set: Snapshot (linearizable snapshot;119 total LOC,82 implementation+spec,0.4s), ABD (atomic register/linearizability;389,206,1.4s), FLASH coherence (cache coherence;608,401,5s), 2PC (consistent transaction decision;146,111,1.8s). The paper combines sequential reduction of parallel calls with reduction inside procedures. My inference: these can test whether agents discover useful proof structure, beyond finding conjuncts.

### Cutoff and bounded instantiation leads

**Cutoff Bounds for Consensus Algorithms**, Ognjen Marić, Christoph Sprenger, David Basin, CAV 2017, pp. 217–237. [Open PDF](https://link.springer.com/content/pdf/10.1007/978-3-319-63390-9_12.pdf), [DOI](https://doi.org/10.1007/978-3-319-63390-9_12). Read §§2, 5, 6 and Table 2, p. 233. ConsL describes round-based algorithms in a benign asynchronous communication abstraction; a translation produces Promela and LTL for Spin. Its bounds justify checking a small process count, rather than merely assuming small tests suffice. The abstract reports “bounds of 5 or 7”. Table 2 checks agreement and termination for every row. Section 2.1 defines termination as “Every process eventually decides on a value.” Its abstraction lets failed processes keep receiving/processing but suppresses their sent messages, so this progress claim must retain its communication assumptions.

| complete Table 2 case | cutoff process count; guarantee |
|---|---|
| Paxos | 5; uniform agreement and termination |
| Paxos (3 rounds) | 5; uniform agreement and termination |
| Chandra–Toueg | 5; uniform agreement and termination |
| Algorithm from Consensus Refined (Marić, Sprenger, Basin, DSN2015) | 5; uniform agreement and termination |
| 1/3-rule | 7; uniform agreement and termination |
| Coordinated uniform voting | 5; uniform agreement and termination |
| Simplified coordinated uniform voting | 5; uniform agreement and termination |
| Uniform voting (variant) | 5; uniform agreement and termination |
| Ben-Or | 5; agreement and termination in the ConsL abstraction |

The paper’s tool/model download pointer is `http://www.infsec.ethz.ch/research/software/consl-verifier`; the attempted modern HTTPS page returned 404. **Gap:** the original generated model download was not recovered. This termination check should not be relabeled as a proof of Ben-Or's probability-one termination under arbitrary adversaries.

**Bounded Quantifier Instantiation for Checking Inductive Invariants**, Yotam M. Y. Feldman, Oded Padon, Neil Immerman, Mooly Sagiv, Sharon Shoham, TACAS 2017 pp 76–95. [DOI](https://doi.org/10.1007/978-3-662-54577-5_5). Metadata confirmed in EPR paper references. EPR paper section 9 describes bounding quantifier instantiation as an alternative to enforce decidable proof checking. The full journal version is LMCS 15(3):18, 2019 [PDF](https://arxiv.org/abs/1710.08668). Read section 7.3/Table 1. Quote: “Bound 1 successfully proves the invariant inductive in all correct examples”. This bounds quantifier instantiation depth, not participant count. Table 1 complete rows: Client-server (response has matching request), List reverse (next edges reversed), Learning switch (each routing node has successor), Hole-punching firewall with ghost (external peer previously contacted internally), Hole-punching firewall ∃ time (same), Trusted chain correct, Leader-election ring correct, Trusted chain incorrect, Leader-election ring incorrect. Correct ring case checks an invariant used towards termination, not a complete liveness proof. Trusted-chain invariant concerns all nodes eventually marked trusted after pending messages disappear; the checked safety formulation requires all nodes trusted when no messages remain, plus strengthened invariants (section 6.2). The two incorrect rows test partial counterexamples and solver termination. Conference2017 Table 1 lacks the two trusted-chain rows; therefore it has 7 rows. Full code pointer in the journal bibliography is http://www.cs.tau.ac.il/research/yotam.feldman/papers/tacas17/ but currently redirects to a missing GitHub Page; original named Ivy files are provided in figure captions (`client_server_ae.ivy`, `client_server_db_ae.ivy`, `ring_leader_termination.ivy`). Download artifact availability remains a gap.

### Search gaps

Web search tool returns HTTP404; DBLP gives a bot challenge; Semantic Scholar429; OpenAlex's shared-IP free daily budget exhausted. Primary GitHub, arXiv PDFs and Civl site work. Unresolved: complete Message Chains artifact (the names and properties are recovered below), Bakery open PDF/artifact, original six-variant EPR artifact, historical bounded-horizon artifact URL, CAV 2017 cutoff numerical bounds/protocol list, cutoff 2022 source download. QSM-Cutoff is assessed in the next section. These are explicit gaps, not evidence that the work does not exist.

### Cutoff automation with seven concrete protocols

**Automating and Mechanizing Cutoff-based Verification of Distributed Protocols**, Shreesha G. Bhat, Kartik Nagar, arXiv 2022 (venue unconfirmed). [PDF](https://arxiv.org/abs/2211.15175). Read sections3–6/Table 2. Section 6 quote: “We use Z3 [12] as our backend SMT solver.” Quote section 6.1: “we cannot have two nodes where one decides to commit and the other aborts”. The latter is the2PC property. The approach proves that a small modified system simulates arbitrary instances, then verifies that small system; it synthesizes mappings and simulation obligations using static analysis. Three cases need human changes. No source repository found in paper.

Complete Table 2:

| problem | guarantee; cutoff; total synthesis+verification milliseconds; automatically synthesized? |
|---|---|
| Sharded Key Value Store | one owner/value per key;2;20;yes |
| Leader Election in a Ring | at most one leader;2;30;yes |
| Centralized Lock Server | at most one lock owner;2;40;yes |
| Ricart Agrawala | mutual exclusion;2;30;yes |
| Basic Key Value Store | one owner/value per key;2;20;no |
| Two Phase Commit | no commit/abort disagreement;3;40;no |
| Distributed Lock Server | no two owners in the same epoch;2;30;no |

Important scope: the measured time is proving the cutoff/synthesizing simulation, not the entire end-to-end cost of model checking a finite instance. Basic store needs a precondition about prior transfers, distributed lock server needs changed stale-message behavior and a maximum-epoch mapping, and 2PC needs a third failure-simulating node. My inference: good agent evaluation should require reporting these changes and why they preserve the intended property.

**Towards an Automatic Proof of the Bakery Algorithm**, Aman Goel, Stephan Merz, Karem A. Sakallah, FORTE 2023 pp 21–28. [DOI](https://doi.org/10.1007/978-3-031-35355-0_2), [author publications](https://aman-goel.github.io/research.html). Title and metadata confirmed with Crossref, author site, and the publisher abstract. The abstract says “automatically compute inductive invariants for two versions of the algorithm” using IC3PO, starting from TLA+ specifications. The target is mutual exclusion for shared-variable processes. Open PDF, names of the two exact versions, and full proof artifacts were not retrieved; no liveness claim is inferred.

### Message Chains / UPVerifier: full 19-case paper set recovered

**Message Chains for Distributed System Verification**, Federico Mora, Ankush Desai, Elizabeth Polgreen, Sanjit A. Seshia, OOPSLA/PACMPL 7 article 300, 2023, pp. 2224–2250. [Author's open PDF](https://people.eecs.berkeley.edu/~sseshia/pubdir/oopsla23.pdf), [paper page](https://people.eecs.berkeley.edu/~sseshia/pubs/b2hd-mora-oopsla23.html), [UPVerifier code](https://github.com/FedericoAureliano/upverifier), [inspected revision](https://github.com/FedericoAureliano/upverifier/tree/7216a71e321e50cb48fc0458d23de9a833ff4f54). Read §6 and Table 1, pp. 300:19–24.

A message chain records the messages that caused a later message. Keeping that history can express causal facts directly instead of requiring people to invent ghost state for each proof. This is automatic bookkeeping for checking supplied proofs, plus specification mining from examples; it is not a general automatic invariant-discovery result. The compiler handles a P-like language. The repository README describes “Unbounded Verification of P(-like) Programs.”

**Complete evaluated set:** Table 1 contains the following 16 reused models. Their safety properties correspond to the shared mypyvy set, with translations detailed in §6.1. They are all checked for arbitrary system size in the model, not full production implementations.

| case | target |
|---|---|
| ring-id | unique leader |
| toy-consensus-forall | decision agreement |
| consensus-wo-decide | unique leader |
| sharded-kv | unique owner/value per key |
| learning-switch | routing order/reachability consistency |
| consensus-forall | decision agreement |
| lockserv | unique lock holder |
| ticket | mutual exclusion |
| firewall | inbound external sender has prior internal contact |
| sharded-kv-no-lost-keys | a transfer exists or every key has an owner |
| client-server-ae | response matches the client's request |
| toy-consensus-epr | decision agreement |
| client-server-db-ae | same correspondence through a database |
| ring-id-not-dead | leader exists or unfinished message/work exists |
| consensus-epr | decision agreement |
| hybrid-reliable-broadcast | accepted message has initial-reception witness under the fault assumptions |

The additional three cases are:

| case | target; stated model/proof size |
|---|---|
| Tor / Onion Routing Network (§6.2.4) | a complete chain starts at a client, passes nonzero intermediate nodes to the desired server, and returns through intermediates to that same client; no anonymity theorem is claimed |
| GlobalClock (§6.4.1) | same-node earliest times are nondecreasing; a later request's latest bound exceeds an earlier request's earliest bound; disjoint ordered intervals imply request order; 150 lines |
| Two-Phase Commit Multi-Version Concurrency Control (§6.4.2) | reads see the latest committed version; ordered reads see nondecreasing versions; announced success requires all participant votes; 250 lines |

The paper's model/proof sizes are literal data from §6.4. Verification times are under 2 seconds for GlobalClock and about 12 minutes for 2PC-MVCC. A property anchor in §6.4.2, p. 300:23, is “we only read the latest committed transactions”. 

**Download limitation:** the current linked repository has `examples/chain_replication.smp`, `client_server_ae.smp`, `client_server_db_ae.smp`, `firewall.smp`, `fuzz.smp`, `ring_id.smp`, `ring_id_not_dead.smp`, and `submit.smp`, with execution data. It does not ship a full current manifest of all 19 evaluated models. The original 16 mypyvy sources are downloadable from the PLDI 2020 branch, but those are not identical UPVerifier translations. No complete fixed UPVerifier benchmark archive was located, including the industrial cases. The paper nevertheless establishes their names and guarantees.

### QSM-Cutoff: a full 19-model 2025 set

**QSM-Cutoff: Systematic Derivation of Quantified Cutoff Formulas for Distributed Protocols**, Yun-Rong Luo, Aman Goel, Karem Sakallah, CAV 2025, pp. 263–286. [Open PDF](https://link.springer.com/content/pdf/10.1007/978-3-031-98682-6_14.pdf), [tool, scripts and CAV logs](https://github.com/QSM-Cutoff/QSM-Cutoff), [inputs](https://github.com/QSM-Cutoff/ivybench). The PDF and repository README were read. 

The method enumerates reachable finite states while exploiting symmetry, minimizes their logical description, and increases domain sizes until its saturation test succeeds. Section 7, pp. 278–280, evaluates the complete 19-case list below. The listed domain sizes are the paper's Table 4 data, not generally applicable bounds for other encodings. The caption defines `#A` as strengthening assertions needed to prove safety; the paper reports safety checks using its resulting formulas. **Scope distinction:** identifying the strongest reachable-state characterization for every size remains a conjecture. Section 9, p. 282, calls for “a formal proof showing that the cutoff formula Rc is, in fact, a reachability invariant”. This does not erase the separately checked inductive safety proofs.

| case | Table 4 cutoff domain sizes; safety target |
|---|---|
| Consensus | value=3; chosen-value agreement |
| naive consensus | node=3, quorum=3, value=3; decision agreement |
| toy consensus | node=3, quorum=3, value=3; decision agreement |
| toy consensus forall | node=5, quorum=10, value=3; decision agreement |
| toy consensus epr | node=3, quorum=3, value=3; decision agreement |
| consensus epr | node=3, quorum=3, value=2; decision agreement |
| lock server | server=1, client=3; unique holder/client per server |
| lockserv | node=3; unique lock holder |
| lockserv automaton | node=3; unique lock holder |
| simple-decentralized-lock | node=3; unique lock holder |
| client server ae | node=1, request=1, response=1; responses match requests |
| Ricart-Agrawala | node=2; mutual exclusion |
| sharded kv | node=3, key=1, value=2; unique owner/value per key |
| sharded kv no lost keys | node=3, key=1, value=2; transfer exists or every key has an owner |
| firewall | node=3; inbound external sender has previous internal contact witness |
| TCommit | resource manager=2; no conflicting abort/commit |
| TwoPhase | resource manager=1; no conflicting abort/commit |
| simple-election | acceptor=3, quorum=3, proposer=3; unique elected leader |
| quorum-leader-election-wo-maj | node=5, node-set=10; unique leader |

Properties are interpretations of the shared Ivy models listed elsewhere; use this fork's exact files to reproduce the results. Ordered ballot/epoch/ticket protocols such as Paxos and Bakery are future extensions in §9, not members of this evaluated set.

### Veil: proofs in Lean with automatic first-order checks

**Veil: A Framework for Automated and Interactive Verification of Transition Systems**, George Pîrlea, Vladimir Gladshtein, Elad Kinsbruner, Qiyuan Zhao, Ilya Sergey, CAV 2025. [Paper](https://verse-lab.org/papers/veil-cav25.pdf), [repository](https://github.com/verse-lab/veil), [fixed CAV artifact](https://doi.org/10.5281/zenodo.15208271), [source snapshot](https://github.com/verse-lab/veil/tree/4820f53).

Veil turns a protocol and supplied invariants into proof obligations, tries SMT solvers, and permits interactive Lean proofs for the remainder. This paper evaluates checking supplied invariants, rather than discovering them. Its abstract, p. 1, says: “Veil provides an interactive verification mode”.

The evaluation contains **16 cases**, including alternate encodings of the same protocol. Section 4.1, p. 8: “1704 non-empty, non-comment lines of Lean code”; “85 actions and 185 invariants”. The paper gives 100 lines per file on average These are aggregate specification/proof figures, not implementation size or invariant-discovery effort.

The complete Figure 5 list follows. Properties are my plain-English readings of the archived `safety` or named `invariant` statements in [Benchmarks/Veil](https://github.com/verse-lab/veil/tree/4820f53/Benchmarks/Veil). This fixed snapshot matters: the current repository has different examples. All guarantees below concern safety.

| archived case | checked property |
|---|---|
| Blockchain | honest nodes agree on block/transaction confirmation; prescribed broadcasts cause confirmation |
| ChordRingMaintenance | the model’s ring-maintenance error flag stays false; inspect its error-setting action for the exact topology condition |
| DecentralizedLock | at most one node holds the lock |
| MultiSigAll | payment was proposed and authorized by all signers; cancellation occurs after expiration |
| MultiSigMajority | payment was proposed and authorized by a quorum; cancellation occurs after expiration |
| PaxosEPR | decisions across nodes and rounds choose the same value |
| PaxosFirstOrder | same decision agreement, with a different logical encoding |
| Rabia | binary and full-value decision consistency; supplementary lemmas are in RabiaMore |
| ReliableBroadcast | honest recipients agree; votes and deliveries correspond to the honest sender’s initial value |
| RicartAgrawala | at most one node holds the critical-section privilege |
| Ring | elected leader is greatest in the identifier order, hence unique |
| SCP | intertwined Stellar nodes cannot confirm conflicting values |
| SuzukiKasami | at most one node is in its critical section |
| SuzukiKasamiInts | same exclusion property, using integer sequence numbers |
| TwoPhaseCommit | commit and abort do not coexist; commit requires every yes vote; abort requires its flag |
| VerticalPaxosFirstOrder | agreement across decisions under configuration changes |

`RabiaMore.lean` and `SCPTheory.lean` are support proofs, not additional Figure 5 cases. Download the archived source zip from the Zenodo record or GitHub commit. `Benchmarks/Ivy` supplies the corresponding Ivy comparison files.

**2026 LLM case study:** Ilya Sergey, “Verifying Distributed Protocols in Veil,” February 9, 2026, [author’s account](https://proofsandintuitions.net/2026/02/09/distributed-verification-veil/#ai-powered-inference-of-inductive-invariants). The section reports that “most of the auxiliary invariants” for FloodSet were obtained with Claude Code. The prompt asks the agent to make `#check_invariants` succeed using verifier counterexamples. This is one documented case, not a comparative benchmark. Its guarantees are agreement and validity: every decided value originated at a node. [Source](https://github.com/verse-lab/veil/blob/veil-2.0-preview/Examples/Synchronous/FloodSet.lean).

The same account’s concluding remarks says the generated protocol definitions were “missing crucial parts, making them vacuously correct but also useless.” **Inference:** successful invariant discovery is insufficient evidence of faithful specification synthesis; evaluate those tasks separately.

### DissProve: start at a forbidden outcome and work backward

**DissProve: Automated Verification of Asynchronous Distributed Protocols with Affine Communication**, Christian Fontenot, Gowtham Kaki, Bor-Yuh Evan Chang, arXiv 2026, [paper](https://arxiv.org/abs/2606.24003). Downloaded and read the paper, including §6/Table 1, pp. 22–23. The tool takes P actor code and a forbidden state, then tries to show that no execution reaches it. “Affine” here restricts communication histories to bounded communication rounds, while allowing unbounded actors and history length; this is a restriction of the method, not a claim about every protocol.

Section 6, p. 22: “No additional user-provided specifications or invariants are needed to verify these properties”. Table 1’s complete seven-case evaluation is below; source sizes are quoted table entries, in lines of P code. The table describes consensus and mutual exclusion checks. The paragraph below it assigns consensus to One-Shot, Two-Phase Commit, and Atomic Broadcast, and mutual exclusion to the other cases.

| case | guarantee and P source lines |
|---|---|
| One-Shot Election | consensus, 56 |
| Bakery | mutual exclusion, 99 |
| Dekker’s Algorithm | mutual exclusion, 68 |
| Drinking Philosophers | mutual exclusion, 58 |
| Two-Phase Commit | consensus on commit outcome/value, 55 |
| Barrier Lock | mutual exclusion, 49 |
| Atomic Broadcast | consensus, 80 |

The checked paper has no artifact URL. GitHub repository search for `DissProve` returned zero repositories during this review. **Gap:** cannot supply a verified download location for its benchmark programs; the paper itself gives the full evaluation list. These are actor implementations in P, not interchangeable with the Ivy/TLA+ encodings bearing the same names.

### Lemur: a useful architecture, with no protocol benchmark

**Lemur: Integrating Large Language Models in Automated Program Verification**, Haoze Wu, Clark Barrett, Nina Narodytska, ICLR 2024; first arXiv version 2023. [Paper](https://arxiv.org/abs/2310.04870), [code and data](https://github.com/wu-haoze/Lemur-program-verification). It uses an LLM to propose intermediate proof goals and a conventional verifier to establish them or provide feedback. Section 5.2, p. 8: “The benchmark set contains 133 benchmarks”, each pairing a C program with an assertion. Section 5.3 tests 47 selected SV-COMP C programs. These are sequential program benchmarks, so there is no distributed protocol list to report for Lemur. **Inference:** its proposal/check/feedback architecture transfers to protocol invariants; its published scores do not measure that transfer.

## Evaluation recommendations and remaining gaps

**My recommendations:** use several tasks, because each tests a different failure mode.

1. Supply a fixed protocol and safety target, hide auxiliary invariants, and require an unbounded inductive proof. The shared Ivy/mypyvy sets provide comparable small cases. Report supplied grammars, templates, ghost predicates, abstraction steps, timeouts, solver versions, and human edits.
2. Use the primal-dual artifact's unsafe variants alongside safe tasks. A useful agent must return a reproducible violation when the protocol is wrong. Add specification mutations and useful-state reachability checks to detect trivial or overly restrictive specifications.
3. Give a supplied invariant but omit its proof. LMGPA measures this distinct task; compare with symbolic-only proof checking, then measure the extra benefit from agent decomposition.
4. Add richer P/Dafny/Lean cases and refinement tasks from Message Chains, Basilisk, Kondo, Sift, Civl, and Veil. Count protocol-specific proof hints and abstractions as input, rather than calling every solver invocation an automatic proof.
5. Evaluate liveness separately, preserving fairness, fault, threshold, timing, and adversary assumptions. ByMC provides relevant progress tasks. Agreement or mutual exclusion alone does not establish termination, availability, or eventual election.

**Remaining gaps:** complete fixed UPVerifier translations/industrial models; downloadable IC3Syn proofs/code; cited Scimitar NFM 2026 archive; DissProve and cutoff2022 source archives; original six-variant EPR artifact; historical bounded-horizon archive; CAV 2017 cutoff paper's full benchmark list and bounds; open Bakery paper and its two exact model versions; open I4 and primal-dual paper PDFs. P-FOL-IC3's branch and paper list were found, but the exact experiment commit still needs confirmation. These are gaps in this review, not claims that artifacts never existed. Human effort is reported only where a source states it; file size alone is not effort.

Repository source links with file manifests use inspected or retrieved revisions. Versioned paper artifacts are preferred for experiment reproduction. Additional repository pins:

- [VeriGu/DistAI](https://github.com/VeriGu/DistAI/tree/3c2b90122585cf1e785e7e31fb64ccfc4982655f): `3c2b90122585cf1e785e7e31fb64ccfc4982655f`
- [will62794/DistAI](https://github.com/will62794/DistAI/tree/3c2b90122585cf1e785e7e31fb64ccfc4982655f): `3c2b90122585cf1e785e7e31fb64ccfc4982655f`
- [VeriGu/DuoAI](https://github.com/VeriGu/DuoAI/tree/ecd37c418ef56202ca332d5bca113e8e7c8c8fac): `ecd37c418ef56202ca332d5bca113e8e7c8c8fac`
- [aman-goel/ivybench](https://github.com/aman-goel/ivybench/tree/d2c9298fdd099001c71a34bc2e118db6f07d8404): `d2c9298fdd099001c71a34bc2e118db6f07d8404`
- [secure-foundations/SWISS](https://github.com/secure-foundations/SWISS/tree/348b9c4f9b0b2f124b50c8f420d071f4bc0789b3): `348b9c4f9b0b2f124b50c8f420d071f4bc0789b3`
- [GLaDOS-Michigan/I4](https://github.com/GLaDOS-Michigan/I4/tree/0c53ceb865487c5fda3e91fb9e379baf9840b2de): `0c53ceb865487c5fda3e91fb9e379baf9840b2de`
- [wilcoxjay/mypyvy](https://github.com/wilcoxjay/mypyvy/tree/cd80557ae11f5958c7c81dbecf3b24f7a3b16c1f): `cd80557ae11f5958c7c81dbecf3b24f7a3b16c1f`
- [will62794/endive](https://github.com/will62794/endive/tree/8b6f2abd1988eeb308f965813635e9871f253e2d): `8b6f2abd1988eeb308f965813635e9871f253e2d`
- [YUH-Z/lmgpa](https://github.com/YUH-Z/lmgpa/tree/c27bf4f657c10254b8df8c66ca37f1cdbbf66f1e): `c27bf4f657c10254b8df8c66ca37f1cdbbf66f1e`
- [GLaDOS-Michigan/Basilisk](https://github.com/GLaDOS-Michigan/Basilisk/tree/394ce1412df9c6e59efe6a00207f0f468400aa61): `394ce1412df9c6e59efe6a00207f0f468400aa61`
- [GLaDOS-Michigan/Sift](https://github.com/GLaDOS-Michigan/Sift/tree/a76729730c6698f5bd03d73f4d966048b29c9f92): `a76729730c6698f5bd03d73f4d966048b29c9f92`
- [GLaDOS-Michigan/Kondo](https://github.com/GLaDOS-Michigan/Kondo/tree/1d6c43e475cadfdf7a10bfb5137cd777ccf2138f): `1d6c43e475cadfdf7a10bfb5137cd777ccf2138f`
- [will62794/scimitar](https://github.com/will62794/scimitar/tree/f1b902dc0801cf435cb9dd6e6be495d5ed121787): `f1b902dc0801cf435cb9dd6e6be495d5ed121787`
- [istoilkovska/syncTA](https://github.com/istoilkovska/syncTA/tree/9224ef50d5ada4782d0a1d5723531ebe43149584): `9224ef50d5ada4782d0a1d5723531ebe43149584`
- [QSM-Cutoff/ivybench](https://github.com/QSM-Cutoff/ivybench/tree/34dfddd61214805b64bb9a29ab7f8a0e2d3d1bb0): `34dfddd61214805b64bb9a29ab7f8a0e2d3d1bb0`
- [konnov/fault-tolerant-benchmarks](https://github.com/konnov/fault-tolerant-benchmarks/tree/c9e8de463e0a6bc378d8f05270ffc7db043e79e6): `c9e8de463e0a6bc378d8f05270ffc7db043e79e6`
- [boogie-org/boogie](https://github.com/boogie-org/boogie/tree/fcecf73a49d11ad3ab16729abd03169e5ecfd938): `fcecf73a49d11ad3ab16729abd03169e5ecfd938`
