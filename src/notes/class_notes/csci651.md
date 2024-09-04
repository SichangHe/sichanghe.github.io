<!-- toc -->
# Advanced Computer Networking

40 paper + 20hr+ programming project + similar research project

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
