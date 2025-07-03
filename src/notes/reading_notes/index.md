# Unstructured Reading Notes

- [Steve Jobs President & CEO, NeXT Computer Corp and
    Apple. MIT Sloan Distinguished Speaker
    Series](https://www.youtube.com/watch?v=Gk-9Fd2mEnI), 1992
    - attack operational productivity w/ software, not management
    - "object"
        reusability made NeXTSTEP attractive bc programmer could write 20% code
        to make the same "mission critical" application
        - translate to "package" reuse today
    - bright people produce stuff reused by others
    - all decision maker should buy into the decision
        - when hiring high-level people: expect them to tell you what to do,
            not the other way around
    - take long term view on people: tolerate short-term mistakes to
        build team
    - view manufacturing as competitive advantage
        - view manufacturing as software engineering but w/ hardware
        - start from the software to design hardware
- Defense: *Automated Reproduction of Bug Reports for Mobile Applications*,
    Zhaoxu Zhang
    - bug report have missing/wrong step
    - split & reorder actions in sentences for steps
    - Markov decision process (MDP) + Q-learning for globally optimal steps
        - ignore hidden state; only consider UI state
    - optional: search w/ Markov chain from UI transition graph (UTG)
    - intermediate representation to help validate non-crash bug reproduction
- WinCC: *A step by step guide for a successful proposal*, Tamim Ahmed
    - find application of thing you worked a lot on
    - can reuse stuff; do not reinvent the wheel
    - proper timeline & cost (talk to financial expert)
- Theory Lunch: *Towards Publicly Verifiable Cryptography: Obfuscation,
    Fully Homomorphic Encryption, and Proof Carrying State*, Miryam Huang
    - computationally impossible to obfuscate a circuit $C$ in
        plain setting s.t.
        new circuit $C'$ reveal no information about $C$'s implementation
        - even w/ quantum computing/state
        - workaround: weaker as indistinguishable obfuscation;
            oracle model to help obfuscater; restrict circuit class
    - in quantum setting, obfuscate $Q:=(C,\psi)$ w/ auxiliary state $\psi$
    - proof for fully homomorphic encryption (FHE)
        - succinct non-interactive argument (SNARG)
    - proof-carrying state (PCS): quantum proof-carrying data (PCD)
        - useful bc quantum state not cloneable
- Theory Lunch: *Proper Learnability and the Role of Unlabeled Data*,
    Julian Asilis
    - proper learning: learned fn $h$ not in hypothesis class $\mathcal H$
        - e.g., majority vote for binary classification,
            multiclass classification
        - why limited hypothesis class: learnablility
    - in PAC learning,
        having infinite unlabeled data does not change statistical difficulty
        of learning
        - but make learnability always proper
    - distributional SRM: regularize distribution of $h\in\mathcal H$
        - e.g., Bayesian learner
- Theory Lunch: *An Equivalence Between Fair Division and
    Wagering Mechanisms*, Jens Witkowski
    - divide multiple kind of goods among multiple agent vs. wagering
        - one-to-one correspondence
    - incentive compatibility: no more profit by lying about preference
    - individual rationality: participant expect non-negative utility
- *Job talk: Expectation vs Reality:
    How Network Abstractions Impact Internet Security*, Paul Pearce
    - routing is abstraction for Internet scanning
        - e.g., different route when using HTTP vs HTTPS
    - ECMP cause packet to go thru different AS → country → censorship
        - ⇒ need to build exact packet for traceroute
        - censorship/ no censorship due to routing bc source IP/port, etc.
    - IPv6 impact overlooked in security community
    - LSTM RL system to generate IPv6 address upper-64 bit
        - domain knowledge for lower-64 bit
        - IMCP6 port scan show many home router
            - accidentally public IP due to no NAT; many CVE
        - ⇒ abstraction change: default deny → default allow
- Theory Lunch: *Vote Delegation through the Lens of Metric Distortion*,
    Alan Grayson York
    - delegating vote to informed voter reduce metric distortion from
        $\theta(\alpha)$ to $\theta(\sqrt{\alpha})$
        - assume 2 candidate for linear preference spectrum
        - if
            informed voter among total is uniformly distributed among
            preference spectrum
        - not if informedness is i.i.d.
    - assume voter delegate vote to informed neighbor voter if expect them to
        vote better
    - limitation: unrealistic assumption
- Guest Talk: *Computational Homogenization for Inverse Design of
    Surface-based Inflatables*, Yingying (Samara) Ren, ISTA
    - goal: simple fabrication state, transform to
        complex&stable target state
    - surface-based inflatable: flat to 3D
    - analyze property of infinite sheet for
        periodic unit cell w/ different parameter using periodic homogenization
        w/ mesh
    - use X/Y scale factor & bending stiffness to
        reverse engineer the pattern needed
- [How to
    Enhance Your Immune System | Dr. Roger
    Seheult](https://www.youtube.com/watch?v=N5DAW8mkJ6Y), Andrew Huberman
    - long-wavelength light in sun benefit health
        - they penetrate skin
        - trigger mitochondria to produce melatonin, antioxidant
        - mitochondria produce less ATP as we age
- [The Science of Scientific
    Writing](https://www.usenix.org/sites/default/files/gopen_and_swan_science_of_scientific_writing.pdf),
    George D. Gopen, Judith A. Swan, American Scientist, 1990
    - writer responsible to make reader understand
    - use structure reader expect
        - verb immediately after subject
        - each unit of discourse should serve single point
        - put emphasized stuff at "stress position", like end of sentence
    - put context & known stuff at "topic position", like beginning
    - use strong action verb
- Thesis proposal: *Incentivizing Efficient Delegation without Payments*,
    Curtis Bechtel
    - delegation motivation: outside contractor (agent) may not optimize for
        employer's (principal) need
    - probing constraint: cost, combination limit, etc.
    - game: principal set constraint; agent probe, propose solution;
        principal accept one best proposal iff satisfy constraint or reject all
    - delegate utility vs non-delegate utility: use agent vs as if
        principal doing task themselves
        - $\alpha$-fraction delegation gap: fraction between utility
    - goal: $\alpha → 1$ w/ more agent in
        competitive delegation w/ stochastic probing
    - if probing has cost (Pandora's Box problem),
        generally no constant $\alpha$ bound
    - strategic delegation reduce to adversarial delegation (agent want to
        minimize principal utility)
- *Intelligent, Robust and Trustworthy AI: Managing GenAI Challenges,
    Next Phase of Hybrid AI Models and Enterprise AI for
    Mission-Critical Applications*, Amit Sheth
    - difficult to detect if text generated
    - RLHF reduce hallucination
    - tweak model to avoid hateful generation
    - neurosymbolic: neural AI combined w/ symbolic cognition AI
        - knowledge graph auxiliary to DL, bring explainability
        - deep infusion
    - what do you have what other do not
- *Scalable $k$-Means Clustering for Large $k$ via
    Seeded Approximate Nearest-Neighbor Search*, Jack Spalding-Jamieson
    - k-nearest neighbor w/ approximate radius
        - metric: recall; impossible to guarantee
        - ∃ sublinear heuristic
        - search graph almost universally best
        - other application: quantization, space partitioning
        - initialization does not matter if $n$ and $k$ large, running Lloyds
    - $k$-means do nearest neighbor search each iteration
    - hierarchical navigable small world (HNSW) perform well
        - start w/ approximate nearest neighbor graph of centroid
        - prune edge to sparsify; randomly sample centroid for higher layer
        - start from highest layer, do greedy local beam search to
            find best centroid on each layer
        - "seed point" to start search: choosing from
            previous assignment give big speedup
- *Full Proportional Justified Representation*, Jiasen Liu
    - representative selection: majority vs cohesion
    - approval-based multi-winner election
    - justified representation (JR):
        large cohesive group should have a winner
        - large cohesive group: portion deserve a winner, has common approval
        - but not fair; too weak
    - strong cohesiveness ($\ell$-cohesive): portion deserve $\ell$ winner,
        has common approval of $\ell$ candidate
    - weak cohesiveness (weakly $(\alpha,\ell)$-cohesive), common approval of
        $\alpha$ candidate; stronger guarantee
    - non-transferable vs transferable (collective) utility: some voter in
        group satisfied (stronger) vs all
    - 4 combination of (strong/weak cohesiveness)
        × (non-transferable/transferable utility)
    - harder (coNP) to verify than finding one solution
    - priceability: voter pay for
        candidate they approve under constant budget
        - priceability imply FPJR
            (full proportional justified representation,
            weak cohesion + transferable utility) by bounding
- *What uniform symmetric distro can a shallow circuit produce*, Kewen Wu
    - circuit: combination of logic gate mapping $m$ input bit to
        $n$ output bit
    - symmetric: output w/ same Hamming weight are equally likely
    - motivation: compute parity (or something else) of
        $n-1$ bit w/ shallow circuit → distro sample
        - parity (xor): only e.g. where computation hard but sampling easy
    - impossible to read 1 bit to decode compressed data
    - only 6 case of shallow circuit (local function) mapping from
        uniform distro to uniform distro
        - equal to at most 2-local
        - cannot output 1 only on 1/3 majority bc deviation from 1/3
        - cannot do majority bc lack of
            cutoff among either independent group (neighborhood) or
            independent bit
- Defense: *Efficiency in Privacy-Preserving Computation via
    Domain Knowledge*, Weizhao Jin (advisor: Srivatsan Ravi)
    - homomorphic encryption on selective model parameters (vis mask) to
        reduce overhead
        - filter by commonly-used formula for parameter sensitivity
        - optimize privacy budget, computed via integration
    - entity resolution: dedup point in 2 dataset
    - simulate ReLU via polynomial function bc HE only support + ×
        - balance degree (slow) and accuracy
    - network path validation: avoid sending info on all node
        - backward propagation to validate path for
            forward speed assuming few malicious
        - XOR hash w/ zero-knowledge proof each pair
- [I Slept With 100 Men in
    One Day | Documentary](https://www.youtube.com/watch?v=mFySAh0g-MI)
    - many man would do anything to have sex
    - OnlyFans is a huge money printer but also a slippery slope
- [The Creator Of Elixir - Top Shelf
    7](https://www.youtube.com/watch?v=-mFJ5rPbY_w)
    - Go has huge foot gun in exchange for ability to write lower level code
    - most problem are solved; should just use library
    - Jose Valim see Rust as functional bc explicit mutability
    - Jose think loop hard in immutable language
    - Jose was bitten by PL paper w/ slow implementation, and
        still does not understand the math in his paper as a coauthor
    - library that
        cannot evolve w/o breaking backward compatibility is either a lie or
        poorly designed
- [Credit card interest and
    interchange fees](https://www.youtube.com/watch?v=OceYCEexDqQ)
    - credit card companies make most money from charging merchant percentage
    - ordinary people pay for the benefit high-end card user get
- [Saagar Enjeti: Trump, MAGA, DOGE, Obama, FDR, JFK,
    History & Politics | Lex Fridman Podcast
    \#454](https://www.youtube.com/watch?v=9xz8i90Hp2A)
    - America spirit highly influenced by
        Scottish-Irish about not trusting authority, fighting, freedom
    - performance as politician is not very correlated with personal life
    - Washington DC is itself a creature not caring about even the president
    - personnel selection is key bc many decision are made by them
    - lower down can brick president order by delaying
    - US immigration is crowded by relative of citizen
    - managerial revolution (virus): not known what is going on lower down
    - true power show when ruling w/o having the position
    - mainstream media ask dummy question at white house
    - stealing election was common and unhinged in US in the last century
- [Dario Amodei: Anthropic CEO on Claude, AGI & the Future of
    AI & Humanity | Lex Fridman Podcast
    \#452](https://www.youtube.com/watch?v=ugvHCXCOmm4)
    - scaling law: model do better w/ bigger network & training time & data;
        not seem to stop
    - model learn local pattern, larger scale pattern, then
        long range correlation, etc. as they grow
    - model feeling dumber likely bc different system prompt, user prompt,
        luck, or perception
    - hard to make model both helpful/polite and concise/safe
    - targeted regulation is needed to
        not have people radically against regulation
    - mechanistic interpretability is a green field in AI
    - constitutional AI for RL: AI to rate AI response based on
        prompt about principle
    - important thing is what ultra good AI can do
    - Amanda Askell is likely the human who talked most to Claude
    - goal is for Claude to be helpful in front of million of people
    - model try to please as many people by default, instead to
        get best result, encourage it to not care
    - clear prompting: explain concept to model when
        talking about what you want, w/ example
    - anthropomorphize w/ model: can ask why model refuse to answer
    - use strong word to make model do something, e.g., never ever vs do not
    - not failing signal failure bc not trying hard enough, but need to
        understand high-risk failure
    - interesting idea: model refuse to talk if boring and just quit
    - best way to measure model ability is bleeding edge research you do
- Defense: *Real-time Multi-Resolution Neural Networks for Hand Simulation*,
    Mianlun Zheng (Advisor: Jernej Barbič)
    - from joint angle, simulate bone, tendon, muscle, vein, nerve, fascia, …
    - application: medical education, robotics, Metaverse,
        physical therapy (committee)
    - average (interpolate) 6 MRI scan of hand pose by
        calculating plastic strain & min energy function for equilibrium
    - pattern matching bad: need huge data; no anatomy (dumb)
    - tendon simulation: rod model; attach bone; emulate force from forearm;
        hook → tunnel to slide through
    - fascia: triangle mesh + cloth solver; fat: FEM simulation; nail:
        rigid point cloud in skin
    - high accuracy: < 1mm error against MRI
    - real-time neural net challenge: nets in graphics slow;
        real-world usage need < 1ms; existing libraries overlook small model
    - need: change level of detail (LOD) for Metaverse
    - animation: deform character to vertices
    - joint angle → linear blend skinning → net to
        reduce residue → real-time output
    - LOD support: more vertex each level; restriction vs prolongation to
        downsample & upsample
        - go up & down by level
        - each level each region (by unity construction)
            separate net → small net → efficient
    - further performance: reduce joint by perturbation simulation;
        PCA reduction for each region
    - hot cache performance: lower output dimension & faster than prior work;
        much faster on high level
- [Measuring context switching and memory overheads for Linux
    threads](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
    - Native POSIX Thread Library (NPTL) & futex several times faster than
        old Linux thread
    - bearable latency: on his i7-4771 in 2018,
        multicore context switching took \~1.5µs, same core switching \~2.5µs,
        launching thread \~5µs, launching process \~22.5µs\
        comparison: memcpy 64 KiB took 3µs, Goroutine switching took 170ns
    - lazy memory: 8 MiB virtual via `ulimit` (VM), \~8 KiB resident (RSS)
        without touching stack
- [Optimal Protocols for Studying & Learning,
    Andrew Huberman](https://www.youtube.com/watch?v=ddq8JIMhz7c)
    - neuroplasticity apply during fast eye movement sleep
    - focus & alertness is how remember; sleep is prerequisite; meditation,
        NSDR are tool
    - testing help remember; test ASAP after exposure
        - best be open-ended, short answer, minimal prompt,
            require critical thinking
        - do not matter for memory if wrong
    - perceived familiarity hinder memory
    - gap effect: pause in talk greatly reinforce memory
- [ChatGPT from Scratch: How to
    Train an Enterprise AI Assistant • Phil Winder • GOTO
    2023](https://www.youtube.com/watch?v=N53Gsz0Gm4c)
    - post-GPT are decoder-only
    - logistic regression is often superb for domain-specific task
    - RLHF degrade performance
    - parameter-efficient fine-tuning (PEFT):
        use adapter alongside frozen model
    - quantization massively reduce RAM usage
    - Falcon-7B LLM: used in demo, said to have cleaned training data,
        open-source
    - fine tuning demo done on V100 in Colab
- [How Smartphones Shrink Our
    Brains](https://www.youtube.com/watch?v=GLD6chdFjA0)
    - anticipation trump focus
    - habit to rely on tool kill memory
    - trying to split attention make though shallow
    - paper is better for thinking (I think large screen help)
