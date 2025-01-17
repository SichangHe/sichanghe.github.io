# Unstructured Reading Notes

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
