# Unstructured Reading Notes

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
