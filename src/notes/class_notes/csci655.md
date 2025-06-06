# Advanced Operating Systems

- reliability
    - things fail: storage, communication, bug in code, datacenter,
        CPU/other hardware
        - dependency library
    - security vuln.: spectre, meltdown, buffer overflow, attack (DDoS)
    - incompatibility: version change
- performance
    - non-scalable algo.
    - congestion
    - deadlock
    - out of memory
    - GC pause
    - hypervisor pause

## [How to read a paper](https://dl.acm.org/doi/abs/10.1145/1273445.1273458), Srinivasan Keshav, SIGCOMM CCR, 2007

- 3 pass: intro + heading, overall grasp, reproduce
- survey: start from reference section of recent searched paper;
    find prominent author/conference

## *An Evaluation of The Ninth SOSP Submissions or How (and How Not) to Write A Good Systems Paper*, Roy Levin, David D. Redell

- paper category: implementation, theory, idea, measurement, survey,
    simulation
- know related work: old & new, peer-reviewed
- not readily solved by existing approach (or w/ tweak)

## [RAID: High-Performance, Reliable Secondary Storage](https://dl.acm.org/doi/pdf/10.1145/176979.176981), Peter M. Chen, Edward K. Lee, Garth A. Gibson, Randy H. Katz, David A. Patterson, ACM Computing Surveys, 1994

- disk array for performance&reliability&cost
- compare architecture: RAID level 0-6
- motivation: processor much faster but disk is bottleneck of overall perf
    - large disk array exponentially likely to fail
    - array of disk improve bandwidth for big I/O & latency for small I/O
- data striping: distribute data across multiple disk for parallel
- data interleaving granularity
    - fine-grained: every I/O use all disk, but is blocking & cause seek for
        all disk
    - coarse-grained: parallel request
- method to handle redundant info
    - compute: parity, e.g., Hamming/Reed-Solomon code
        - bottleneck on disk storing parity bit
        - P+Q redundancy (Reed-Solomon): 2 parity disk to
            defend against ≥2 disk failure
    - distribution: whether concentrate redundant info on few disk
- memory-style ECC not assume controller know which disk bad
- RAID 3&5&6 do inversely better on big I/O, poorer in small I/O (but,
    5&6 are capped)
    - can read fewer disk if write large
        - improve small I/O perf by batching&caching
- block interleaving cannot handle some system crash unless w/ hardware like
    nonvolatile RAM
    - system crash more frequent
    - track if each parity block consistent for recovery perf
- bit rot hard to handle; solution: predict disk about to fail & replace
- correlated disk failure, system crash,
    bit rot greatly increase data loss probability in RAID 5

## [The Recovery Manager of the System R Database Manager](https://dl.acm.org/doi/pdf/10.1145/356842.356847), Jim Gray, Paul McJones, Mike Blasgen, Bruce Lindsay, Raymond Lorie, Tom Price, Franco Putzolu, Irving Traiger, ACM Computing Surveys, 1981

- concurrent SQL database failure recovery
- transaction: ACD (no I)
    - only way to undo transaction is another
- shadowing: CoW, point to new copy at commit
- transaction log for recovery
    - include update value to be idempotent
    - checkpoint to avoid log big
        - recovery: redo forward from checkpoint for committed (winner),
            undo backward for loser

## [Disconnected Operation in the Coda File System](https://dl.acm.org/doi/pdf/10.1145/146941.146942), James J. Kistler M. Satyanarayanan, ACM Transactions on Computer Systems, 1992

- offline access to remote file system
    - shared file for collaboration & larger storage
- local caching for availability
    - prioritize user-specified, recently used; fetch periodically
    - cache entire file instead of block
- reconcile conflict thru replay of log of update
    - aggregate log periodically, only save last update, rm inverse operation
- detect conflict by version number
    - impossible to automatically resolve conflict
- evaluation: benchmark & user trace
    - little conflict during in CMU usage bc not editing same file

## [Eraser: A Dynamic Data Race Detector for Multithreaded Programs](https://dl.acm.org/doi/pdf/10.1145/265924.265927), Stefan Savage, Michael Burrows, Greg Nelson, and Patrick Sobalvarro, Thomas Anderson, ACM Transactions on Computer Systems, 1997

- monitor: force all access to acquire lock, but
    cannot handle dynamic allocation
- happens-before problem: cannot catch when separate access by chance
    - detect synchronization between variable access across thread by
        transitive happens-before
- lock set intersection to track all lock held when accessing each variable
    - allow initialization w/o locking, RW lock, reuse allocation
    - high overhead, but optimize by deduplicating lock set to track
    - mechanism to opt out of checking bc false positive
- binary modification to track set of lock held when
    accessing each static/heap variable

## [Improving the reliability of commodity operating systems](https://dl.acm.org/doi/abs/10.1145/945445.945466), Michael M. Swift, Brian N. Bershad, Henry M. Levy, SOSP, 2003

- device driver/ kernel module responsible for many OS crash
- need backward compatibility → cannot separate address space
- why possible: well-defined OS-driver interface
- extension procedure call (XPC): wrapper of kernel call that
    copy argument/ return value memory back and forth (interpose)
    - separate address space/ page table for driver
    - assume extension/driver not malicious; not defensive
- recovery: deallocate based on object tracking; restart driver
    - page tracking to avoid double free
- reliable: avoid almost all crash
- overhead: higher CPU utilization/ lower performance
    - packet sending higher overhead than receiving bc no batching
    - XPC is main bottleneck bc page table switch cause TLB flush, close to
        page tracking & object tracking
- extensible: lots of shared code among different driver

## [Cores that don’t count](https://dl.acm.org/doi/pdf/10.1145/3458336.3465297), Peter H. Hochschild, Paul Turner, Jeffrey C. Mogul, Rama Govindaraju, Parthasarathy, Ranganathan, David E. Culler, Amin Vahdat, HotOS, 2021

- CPU certain ("mercurial") core certain instruction silent failure
- e.g., faulty encryption cause data loss, mutex malfunction
- storage/network redundancy trick do not apply
- detection: proactive/ passive/ live with
    - hard: intermittent, specific core, after aging,
        under specific frequency&voltage&temperature
    - infeasible overhead: need triple computation to verify
- no known solution

## [The Design and Implementation of a Log-Structured File System](https://dl.acm.org/doi/pdf/10.1145/146941.146943), Mendel Rosenblum, John K. Ousterh, ACM Transactions on Computer Systems, 1992

- motivation: disk seek slow → slow read/write slow; RAM cheap; want to
    utilize write speed
- store all data in append-only log
- cache read & inode map in memory
- metric: write cost: disk access time per storage vs theoretical time
    - superlinear: write cost vs fraction alive in segment cleaned
- segment & clean disk by group of block
    - distinguish hot & cold data;
        prioritize cleaning cold segment bc they may squat segment for long
    - assume temporal locality: factor youngest file age in segment
- evaluation: user trace & micro benchmark

## [Rethink the sync](https://dl.acm.org/doi/abs/10.1145/1394441.1394442), Edmund B. Nightingale, Kaushik Veeraraghavan, Peter M. Chen, Jason Flinn, TOCS, 2008

- synchronous: guarantee durability, ordering; but unacceptably slow
- Ext3 only write to disk cache even in synchronous mode
- externally synchronous: appear to user & device to be synchronous
    - user-centric: does not matter if user cannot see
    - async inside app
    - force commit on effect, e.g., pipe/device write
        - low enough delay for user, hardly noticeable
- 10x faster than Ext3 sync mode in IO benchmark, but slightly slower in
    web server benchmark

## [Caching in the Sprite Network File System](https://dl.acm.org/doi/pdf/10.1145/35037.42183), Michael N. Nelson, Brent B. Welch, John K. Ousterho, ACM Transactions on Computer Systems, 1988

- client disk caching is slower than server memory caching
    - predict (maybe incorrectly) that client won't need disk
- write-back cache for lower write latency & less server/network load
    - defer work: eliminate some overwrite of data
- handle concurrent write conflict: disable cache; versioning
    - writer block other writer until write finish
- handle sequential write share: track last writer & force flush cache on
    new open
    - versioning to avoid stale cache on reopen
- metric: performance, scalability (server&network utilization)

## [Outatime: Using Speculation to Enable Low-Latency Continuous Interaction for Mobile Cloud Gaming](https://dl.acm.org/doi/abs/10.1145/2742647.2742656), Kyungmin Lee, David Chu, Eduardo Cuervo, Johannes Kopf, Yury Degtyarev, Sergey Grizan, Alec Wolman, Jason Flinn, MobiSys, 2015

- run game on server bc better hardware & compatibility & security update
- high delay bc edge computing expensive&less capable, high last mile latency
- target: 30 FPS, or 32ms to reflect user input
- approach: predict future frame for RTT
- navigation prediction
    - Markov chain to predict next action → state → frame
    - server send clipped cube of scene for possible future frame
- impulsive event (e.g., gun fire) speculation
    - subsample all possible state on triggering
    - time-shift trigger to nearby checkpoint tick
- checkpoint: save state object for rollback when prediction wrong
- evaluation
    - user play game, opinion score, game performance
    - frame time, frame rate, bitrate

## [A low-bandwidth network file system](https://dl.acm.org/doi/abs/10.1145/502034.502052), Athicha Muthitacharoen, Benjie Chen, David Mazières, SOSP, 2001

- need: access file across slow link like WAN
- upload changed file on close; multi-edit last client to close file win
- inadequate option
    - compression not exploit small diff
    - log like Coda not handle conflict, not reduce download workload
- variable-size chunking w/ Rabin fingerprint to maximize chunk reuse
    - declare end of chunk when least significant 13 bit of
        fingerprint is certain value
        - 13 bit to aim for 8kB
        - impose max&min chunk size to avoid edge case
- check hash-chunk database before reading/writing
    - write tempfile when starting upload
        - client specify tempfile descriptor for pipelining
- evaluation: run Emacs, Word, GCC, etc.
    - network bandwidth usage
    - app performance
- problem: side channel attack; cache miss if file encrypted

## [Coz: finding code that counts with causal profiling](https://dl.acm.org/doi/abs/10.1145/2815400.2815409), Charlie Curtsinger, Emery D. Berger, SOSP, 2015

- profiling&speeding up multi-threaded program
    - ↗️ longest-running function may not ↗️ program bc not on critical path
- causal profile: what overall impact if speed up certain function by
    certain amount
    - virtual speedup, pause other thread
- track throughput&latency through progress point
- evaluation: profile different program & get speedup like predicted

## [Horcrux: Automatic JavaScript Parallelism for Resource-Efficient Web Computation](https://www.usenix.org/system/files/osdi21-mardani.pdf), Shaghayegh Mardani, Ayush Goel, Ronny Ko, Harsha V. Madhyastha, Ravi Netravali, OSDI, 2021

- motivation: phone have many CPU core, but
    browser JS use 1 core & bottleneck page load
- concolic execution to find every possible control flow
    - fall back to sequential if timeout
- automatically parallelize JS
- metric: total computation time (TCT), page load time (PLT),
    speed index (SI, integrate \#pixel by time)

## [Shielding Applications from an Untrusted Cloud with Haven](https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-baumann.pdf), Andrew Baumann, Marcus Peinado, Galen Hunt, OSDI, 2014

## [Difference Engine: Harnessing Memory Redundancy in Virtual Machines](https://dl.acm.org/doi/pdf/10.1145/1831407.1831429), Diwaker Gupta, Sangmin Lee, Michael Vrable, Stefan Savage, Alex C. Snoeren, George Varghese, Geoffrey M. Voelker, Amin Vahdat, Communications of the ACM, 2010

- modify virtual machine monitor (VMM, or hypervisor) to share memory subpage
- page sharing: point identical memory page at same CoW physical page
- page patching: store a patch (diff) for another similar page, then point to
    it
    - choose not-recently-written-to as reference page
    - choose not-recently-accessed page to patch
- page compression of infrequently accessed page
- track page access+write w/ 2 bit

## [Deciding when to forget in the Elephant file system](https://dl.acm.org/doi/pdf/10.1145/319151.319159), Douglas S. Santry, Michael J. Feeley, Norman C. Hutchinson, Alistair C. Veitch, Ross W. Carton, Jacob Ofir, SOSP, 1999

- want to avoid accidental deletion/overwrite of important file
- trash/ recycle bin not good enough: inadequate checkpoint & less useful if
    soon cleared
- not checkpoint entire file system bc too much overhead & cannot roll back
    to between checkpoint
- feasible bc disk bigger & only some file need tracking
- minimize space overhead: CoW;
    - landmark: user-specified/ heuristic-determined version to keep
- garbage collection: keep one/ keep all/ keep safe

## [Energy-aware adaptation for mobile applications](https://dl.acm.org/doi/pdf/10.1145/319344.319155), Jason Flinn, M. Satyanarayanan, SOSP, 1999

- need: more mobile device, not bigger battery
- more energy-saving technique bring lower energy consumption
- reducing fidelity hardly reduce energy consumption when "think time" high
- system to decrease fidelity as energy deplete
    - exponential smoothing of power consumption expectation based on
        expected half life of battery

## [MAUI: Making Smartphones Last Longer with Code Offload](https://dl.acm.org/doi/pdf/10.1145/1814433.1814441), Eduardo Cuervo, Aruna Balasubramanian, Dae-ki Cho, Alec Wolman, Stefan Saroiu, Ranveer Chandra, Paramvir Bahl, MobiSys, 2010

- motivation: offload code to cloud to increase battery life
    - developer partitioning is manual & static
    - full VM migration transfer too much data especially if task small
- continuously profile & offload .NET function
    - developer annotate pure function "remoteable"
- communication overhead increase dramatically w/ transfer size & RTT
- measure overhead&benefit: linear pre-built model to estimate energy cost
- send state diff to reduce bandwidth

## [Wide-area cooperative storage with CFS](https://dl.acm.org/doi/abs/10.1145/502059.502054), Frank Dabek, M. Frans Kaashoek, David Karger, Robert Morris, Ion Stoica, SIGOPS OSR, 2001

- chord: circle to determine node responsible for data

## [Cluster-Based Scalable Network Services](https://dl.acm.org/doi/pdf/10.1145/268998.266662), Armando Fox, Steven D. Gribble, Yatin Chawathe, Eric A. Brewer, Paul Gauthier, SOSP, 1997

- replace ACID w/ BASE

## [Improving MapReduce Performance in Heterogeneous Environments](https://www.usenix.org/legacy/event/osdi08/tech/full_papers/zaharia/zaharia.pdf), Matei Zaharia, Andy Konwinski, Anthony D. Joseph, Randy Katz, Ion Stoica, OSDI, 2008

- deal with straggler in MapReduce w/ heterogeneous machine

## [Efficient Memory Disaggregation with Infnswap](https://www.usenix.org/system/files/conference/nsdi17/nsdi17-gu.pdf), Juncheng Gu, Youngmoon Lee, Yiwen Zhang, Mosharaf Chowdhury, Kang G. Shin, NSDI, 2017

- tend on more blurry machine boundary: abstraction of shared CPU&memory
    - possible bc RDMA fast
- motivation: huge performance impact if working set data not all in memory
- write swap memory to remote machine; async write to disk for backup

## [Hints for Computer System Design](https://dl.acm.org/doi/pdf/10.1145/800217.806614), Butler W. Lampson, SOSP, 1983

## [On system design](https://dl.acm.org/doi/10.1145/1167515.1167513), Jim Waldo, SIGPLAN Notices, 2006

---

external paper

## [Triangulating Python Performance Issues with Scalene](https://www.usenix.org/system/files/osdi23-berger.pdf), Emery D. Berger, Sam Stern, Juan Altmayer Pizzorno, OSDI, 2023
