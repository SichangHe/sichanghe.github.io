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

## [The Recovery Manager of the System R Database Manager](https://dl.acm.org/doi/pdf/10.1145/356842.356847), Jim Gray, Paul McJones, Mike Blasgen, Bruce Lindsay, Raymond Lorie, Tom Price, Franco Putzolu, Irving Traiger, ACM Computing Surveys, 1981

## [Disconnected Operation in the Coda File System](https://dl.acm.org/doi/pdf/10.1145/146941.146942), James J. Kistler M. Satyanarayanan, ACM Transactions on Computer Systems, 1992

## [Eraser: A Dynamic Data Race Detector for Multithreaded Programs](https://dl.acm.org/doi/pdf/10.1145/265924.265927), Stefan Savage, Michael Burrows, Greg Nelson, and Patrick Sobalvarro, Thomas Anderson, ACM Transactions on Computer Systems, 1997

## [Improving the reliability of commodity operating systems](https://dl.acm.org/doi/abs/10.1145/945445.945466), Michael M. Swift, Brian N. Bershad, Henry M. Levy, SOSP, 2003

## [Cores that don’t count](https://dl.acm.org/doi/pdf/10.1145/3458336.3465297), Peter H. Hochschild, Paul Turner, Jeffrey C. Mogul, Rama Govindaraju, Parthasarathy, Ranganathan, David E. Culler, Amin Vahdat, HotOS, 2021

## [The Design and Implementation of a Log-Structured File System](https://dl.acm.org/doi/pdf/10.1145/146941.146943), Mendel Rosenblum, John K. Ousterh, ACM Transactions on Computer Systems, 1992

## [Rethink the sync](https://dl.acm.org/doi/abs/10.1145/1394441.1394442), Edmund B. Nightingale, Kaushik Veeraraghavan, Peter M. Chen, Jason Flinn, TOCS, 2008

## [Caching in the Sprite Network File System](https://dl.acm.org/doi/pdf/10.1145/35037.42183), Michael N. Nelson, Brent B. Welch, John K. Ousterho, ACM Transactions on Computer Systems, 1988

## [Outatime: Using Speculation to Enable Low-Latency Continuous Interaction for Mobile Cloud Gaming](https://dl.acm.org/doi/abs/10.1145/2742647.2742656), Kyungmin Lee, David Chu, Eduardo Cuervo, Johannes Kopf, Yury Degtyarev, Sergey Grizan, Alec Wolman, Jason Flinn, MobiSys, 2015

## [A low-bandwidth network file system](https://dl.acm.org/doi/abs/10.1145/502034.502052), Athicha Muthitacharoen, Benjie Chen, David Mazières, SOSP, 2001

## [Coz: finding code that counts with causal profiling](https://dl.acm.org/doi/abs/10.1145/2815400.2815409), Charlie Curtsinger, Emery D. Berger, SOSP, 2015

## [Horcrux: Automatic JavaScript Parallelism for Resource-Efficient Web Computation](https://www.usenix.org/system/files/osdi21-mardani.pdf), Shaghayegh Mardani, Ayush Goel, Ronny Ko, Harsha V. Madhyastha, Ravi Netravali, OSDI, 2021

## [Shielding Applications from an Untrusted Cloud with Haven](https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-baumann.pdf), Andrew Baumann, Marcus Peinado, Galen Hunt, OSDI, 2014

## [Difference Engine: Harnessing Memory Redundancy in Virtual Machines](https://dl.acm.org/doi/pdf/10.1145/1831407.1831429), Diwaker Gupta, Sangmin Lee, Michael Vrable, Stefan Savage, Alex C. Snoeren, George Varghese, Geoffrey M. Voelker, Amin Vahdat, Communications of the ACM, 2010

## [Deciding when to forget in the Elephant file system](https://dl.acm.org/doi/pdf/10.1145/319151.319159), Douglas S. Santry, Michael J. Feeley, Norman C. Hutchinson, Alistair C. Veitch, Ross W. Carton, Jacob Ofir, SOSP, 2017

## [Energy-aware adaptation for mobile applications](https://dl.acm.org/doi/pdf/10.1145/319344.319155), Jason Flinn, M. Satyanarayanan, SOSP, 1999

## [Wide-area cooperative storage with CFS](https://dl.acm.org/doi/abs/10.1145/502059.502054), Frank Dabek, M. Frans Kaashoek, David Karger, Robert Morris, Ion Stoica, SIGOPS OSR, 2001

## [Cluster-Based Scalable Network Services](https://dl.acm.org/doi/pdf/10.1145/268998.266662), Armando Fox, Steven D. Gribble, Yatin Chawathe, Eric A. Brewer, Paul Gauthier, SOSP, 1997

## [Improving MapReduce Performance in Heterogeneous Environments](https://www.usenix.org/legacy/event/osdi08/tech/full_papers/zaharia/zaharia.pdf), Matei Zaharia, Andy Konwinski, Anthony D. Joseph, Randy Katz, Ion Stoica, OSDI, 2008

## [Efficient Memory Disaggregation with Infnswap](https://www.usenix.org/system/files/conference/nsdi17/nsdi17-gu.pdf), Juncheng Gu, Youngmoon Lee, Yiwen Zhang, Mosharaf Chowdhury, Kang G. Shin, NSDI, 2017

## [Hints for Computer System Design](https://dl.acm.org/doi/pdf/10.1145/800217.806614), Butler W. Lampson, SOSP, 1983

## [On system design](https://dl.acm.org/doi/10.1145/1167515.1167513), Jim Waldo, SIGPLAN Notices, 2006
