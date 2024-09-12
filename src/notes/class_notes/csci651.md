<!-- toc -->
# Advanced Computer Networking

40 paper + 20hr+ programming project + similar research project

flow: same src/dest

NABC for research: need, approach, benefit, competition

## *The design philosophy of the DARPA Internet protocols*, David D. Clark

- Internet: multiplexed utilization of existing interconnected networks
- Internet was for military
    - anticipate failure
        - fate-sharing: endpoint deal with failure.
            guarantee and easy but inefficient
    - protocol do not tell participant what fail
    - accountability, host attachment, cost efficiency are lowest priority
- to connect existing network, bar is low
    - adopt packet switching; gateway: packet switch
- distributed management was lower goal → the BGP mess
- IP was split from TCP—TCP was too specific and bad for latency
    - when designing, did not anticipate actual challenge
- protocol loose → realization determine what goes
- datagram is the basis of Internet flexibility

## *End-to-end arguments in system design*, J. H. Saltzer, D. P. Reed, D. D. Clark

- handling failure in middle do not void need to do so
    at end—no fundamental effect
- low level check help performance, but need not be perfect
- example: checksum, encryption, dedup, FIFO, transaction
- what end mean depend on application

## *Tussle in Cyberspace: Defining Tomorrow's Internet*, David D. Clark, John Wroclawski, Karen R. Sollins, Robert Braden

- tussle: conflict of interest among party
- need to allow various outcome for place w/ tussle
- should modularize design to separate tussle
- design for choice

## *Congestion Avoidance and Control*, Van Jacobson, Michael J. Karels, SIGCOMM 1988

- obvious window-based transport protocol implementation cause 100x slowdown
- need to get to connection equilibrium → slow start
- preserve equilibrium → round trip timing consider variance
    - goal: keep bottleneck full
    - self-clocking: packet spacing follow ACK → follow bottleneck
- resource limit:
    congestion avoidance w/
    [AI/MD](../cs/networking.html#congestion-window-cwnd)
    - congestion detection: packet loss, ~~delay~~
    - congestion recovery

## *A Binary Feedback Scheme for Congestion Avoidance in Computer Networks*, Kadangode K. Ramakrishnan, Raj Jain, SIGCOMM 1988

- explicit congestion notification (ECN) router add congestion bit to packet,
    returned later in ack
- fair share
- avoid oscillation & congestion collapse
- math model & simulation for policy

## *BBR: Congestion-Based Congestion Control*, Neal Cardwell, Yuchung Cheng, C. Stephen Gunn, Soheil Hassas Yeganeh, Van Jacobson

- avoid timeout
- TCP need to measure ideal window size = bottleneck RTT × bandwidth
- measure RTT: exponential weighted moving average
    (EWMA)—ACK time - sent time
- measure bandwidth: window size & packet loss & ACK rate
- TCP keep probing at equilibrium → oscillation
