<!-- toc -->
# ~300x Speed Up: Finding Inexact Matches in Nested Sets

I optimized my route analyzer and made it around 300 times faster,
analyzing around 800 million routes within 3 hours[^cpu].
The exact multiply of speedup does not matter; rather,
I find it valuable to discuss the data structure changes, profiling,
and algorithm experiments, the major gains, and the wasted effort.
No, I did not rewrite a Python implementation to gain a trivial 50x speedup;
I started with a multi-threaded Rust implementation.

The main bottleneck of the route analyzer lay in finding inexact matches of
IP address prefixes in nested sets.
In our research,
this matching was a core functionality because we used the analyzer to
match routes on the Internet against public routing policies.
The technicality of the research does not matter here,
but some basic context is needed to understand the optimizations.

## Simplified background

My task was to implement the `match_nested_set` method on
the `Matcher` data structure, as the pseudo code below illustrates[^real-code].
This method should output whether the (IP address)
prefix `self.prefix` matches a nested set of prefixes called `name`.
Additionally,
it should accept a Range Operator `op` that
can modify how the prefix matching is done.

```rust
struct Matcher {
    prefix: IpNet,
    sets: BTreeMap<usize, Vec<IpNet>>,
    nested_sets: BTreeMap<String, NestedSet>,
}

impl Matcher {
    fn match_nested_set(self, name: String, op: RangeOperator) -> bool {
        unimplemented!()
    }
}
```

The example pseudo code below checks if
the prefix `193.254.30.0/24` matches the nested set `CUSTOMERS` with
the Range Operator `Plus`.
The nested set `CUSTOMERS` has a member `69` that
contains the prefix `193.254.0.0/16`.
Since `193.254.0.0/16` contains `193.254.30.0/24` and
`Plus` specifies the "contains" relationship,
then the method should return `true`.

```rust
let matcher = Matcher {
    prefix: 193.254.30.0/24,
    sets: BTreeMap(69: 193.254.0.0/16),
    nested_sets: BTreeMap(
        "CUSTOMERS": NestedSet { sets: [69], nested_sets: [] }
    ),
};
matcher.match_nested_set("CUSTOMERS", RangeOperator::Plus)
// => true
```

To understand the problem, I started with a straightforward implementation.

## Naive implementation

```rust
impl Matcher {
    fn match_nested_set(
        self,
        name: String,
        op: RangeOperator,
        visited: Vec<String>,
    ) -> bool {
        let Some(nested_set) = self.nested_sets.get(name) else {
            return false;
        };
        for set in nested_set.sets {
            if self.match_set(set, op, visited) {
                return true;
            }
        }
        for nested_set in nested_set.nested_sets {
            if self.match_nested_set(nested_set, op, visited) {
                return true;
            }
        }
        false
    }

    fn match_set(
        self,
        name: String,
        op: RangeOperator,
        visited: Vec<String>,
    ) -> bool {
        if visited.contains(name) {
            return false;
        }
        visited.push(name);
        let Some(set) = self.sets.get(name) else {
            return false;
        };
        set.iter()
            .any(|prefix| prefix_and_op_matches(prefix, op, self.prefix))
    }
}
```

The pseudo code above is mostly trivial for the average programmers,
except for a few places.

1. Using Rust's `let else` syntax, we look up `name` in the sets,
    and either bind the result to the variable,
    or return `false` early if `name` is not found.
1. `visited` tracks the set names we have checked to
    prevent infinite recursions from nested sets that contain each other.
1. `prefix_and_op_matches` is a helper function that checks if
    a prefix matches the Range Operator and another prefix.

## Standard data structure changes

Profiling and standard data structure changes were the lowest-handing fruit.
Although I lost the exact performance record of early implementations,
my benchmark code checking only 256 routes clearly took minutes to run.
I understood that the naive implementation would not scale,
so I immediately started profiling the benchmark code to find where most of
the time was spent.

Surprisingly, [Cargo-FlameGraph]
showed that most of the time was spent on checking if
set names have been visited (`visited.contains`).
`visited` was a vector,
and its linear search compounded with recursion to a cubic growth.
I chose to use vectors because I thought most nested sets would have less than
ten members, in which case linear search would be fine,
but my assumption was clearly wrong.
I changed `visited` to use `HashSet` and boosted the speed by perhaps 10 times.

The other effective change was to replace the maps.
`Matcher` contains two B-tree maps,
which are amazing sorted binary trees with $O(\log n)$ lookup time complexity.
However, hash maps have amortized $O(1)$ lookup.
Therefore, it was a no-brainer to try replacing `BTreeMap` with `HashMap`.
I recall this find-replace change caused the `get` calls to
occupy seemingly larger areas in the flame graph!
However, I also saw a 30% faster benchmark, so the hash map was faster.

The hash map being only slightly faster than the B-tree map was no surprise.
The B-tree map is cache-efficient,
and avoids the somewhat expensive operation of hashing the number or string,
sometimes multiple times when the hash map would be probing.
This means, for smaller maps, the B-tree may be faster.
Though,
it turned out that my maps are large enough and
my string keys are small enough, such that the hash map won.

These trivial changes turned out to be clear wins,
and show some basics of performance optimization:

- Code profiling helps check our assumptions of run-time complexities.
- Data structure choices can greatly affect performance,
    and both complexity analysis and benchmarking help pick them.

## Repetition reduction

<!-- TODO: Finish this off. -->

<!--
- Prefix matching is inexact.
    Depending on $o$, $(p_i,o)$ may be a match of $p$ if $p_i$ equals $p$,
    contains $p$, or contains but not equals $p$, or,
    $p$ itself must satisfy some condition.
    So, simple lookups like hash table lookup and binary search do not suffice.
- AS Sets can be nested.
    $\mathcal A_i=\{a_1,a_2,\ldots,\mathcal A_{i1},\mathcal A_{i2},\ldots\}$
    may contain both ASes $a_j$ and other AS Sets $\mathcal A_{ij}$.
    So,
    finding a match for $p$ in
    $\mathcal A_i$ may require checking an *unbounded* number of sets.
-->

## Custom data structure

## Tenable caching

<!-- - There are too many prefix ranges.
    Flattening the set of all prefixes for
    each AS Set would eliminate the nesting,
    but I tried that and ran out of all 300GiB of RAM,
    causing the server to hang for a while
    (fortunately my admin did not notice it).
-->

| Before flattening the nested sets                                                        | After flattening the nested sets                                                      |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [![Flamegraph before Flattening the nested sets.][flamegraph-before]][flamegraph-before] | [![Flamegraph after Flattening the nested sets.][flamegraph-after]][flamegraph-after] |

[^cpu]: I ran the experiment on a server with dual EPYC 7763 64-Core processors with
hyperthreading turned off.

[^real-code]: These are simplified pseudo Rust code based on [my real
code](https://github.com/SichangHe/internet_route_verification/blob/752e19d1c8ab6665a67c69eeffcc9885c60a37ea/route_policy_cmp/src/bgp/filter.rs#L137).
I removed the numerous references (`&` or `&mut`) and parsing code,
so readers unfamiliar with Rust can still understand it.
I also changed the names to avoid explaining the research context.

## Appendix A: Flamegraphs

<!-- TODO: Maybe I should iframe these. -->

After distinguishing special cases.
[![After distinguishing special
cases][flamegraph-distinguish-spec]][flamegraph-distinguish-spec]

After flattening prefixes of nested sets' direct members.
[![After flattening prefixes of
nested sets' direct
members][flamegraph-use-as-set-routes]][flamegraph-use-as-set-routes]

After flattening each set to its prefixes. [![After flattening each set to its
prefixes][flamegraph-use-routes-for-each-as]][flamegraph-use-routes-for-each-as]

---

*2024-05-30*

{{ #include footer.md }}

[Cargo-FlameGraph]: https://github.com/flamegraph-rs/flamegraph
[flamegraph-after]: https://github.com/SichangHe/internet_route_verification/assets/84777573/33a7354f-a47a-4c8f-a905-c717bbd38f62
[flamegraph-before]: https://github.com/SichangHe/internet_route_verification/assets/84777573/6a869975-a764-45f8-9f14-a27498f3e1f8
[flamegraph-distinguish-spec]: https://github.com/SichangHe/internet_route_verification/assets/84777573/1a7ef5c2-1727-49bf-ae99-a196a95bbfca
[flamegraph-use-as-set-routes]: https://github.com/SichangHe/internet_route_verification/assets/84777573/095af07b-98d8-4f7a-b44f-050454a037d1
[flamegraph-use-routes-for-each-as]: https://github.com/SichangHe/internet_route_verification/assets/84777573/8be94a7a-c913-4df7-bb99-7f095d848376
