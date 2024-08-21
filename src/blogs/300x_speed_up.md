<!-- toc -->
# ~300× Speed Up in Rust: Finding Inexact Matches in Nested Sets

I optimized my route analyzer to get 300× faster.
It analyzed around 800 million routes within 3 hours.[^cpu]
The exact multiply of speedup does not matter; rather,
I find it valuable to discuss the data structure changes, profiling,
and algorithm experiments, the major gains, and the wasted effort.

No, I did not rewrite a Python implementation to gain a trivial 50× speedup;
I started with a multithreaded Rust implementation.
I bet I would have lost all my hair if I had tried to
squeeze out this much performance from some garbage-collected language!

Note that I aim this article at any programmer at the intermediate level or
above.
Despite the Rust-like pseudocode,
you should feel at home if you are familiar with the syntax of Python or
any other C-family language. Let's start!

The main bottleneck of the route analyzer lay in finding inexact matches of
routes' IP address prefixes in nested sets.
In our research,
this matching is a core functionality for matching routes on
the Internet against public routing policies.
The technicality of the research does not matter here.
Instead,
let's look at the context from a programming perspective to
understand the optimizations!

## Simplified background

As the pseudocode below illustrates,
our task is to `impl`ement the `match_nested_set` method (`fn`)
on the `Matcher` data `struct`ure.[^real-code]
This method should output whether the Matcher's (IP address)
prefix (`self.prefix` of type `IpNet`)
matches a nested set of prefixes called `name`.
Additionally,
it should accept a Range Operator `op` that
can modify how the prefix matching is done.

```rust
struct Matcher {
    prefix: IpNet,
#     sets: BTreeMap<u32, Vec<IpNet>>,
#     nested_sets: BTreeMap<String, NestedSet>,
}

impl Matcher {
    fn match_nested_set(self, name: String, op: RangeOperator) -> bool {
        unimplemented!()
    }
}
```

The example pseudocode below checks if
the prefix `193.254.30.0/24` matches the nested set `CUSTOMERS` when
we apply the Range Operator `Plus`.
The nested set `CUSTOMERS` has a member `69` that
contains the prefix `193.254.0.0/16`.
Since `193.254.0.0/16` contains `193.254.30.0/24`,
and `Plus` specifies the "contains" relationship,
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
        if visited.contains(name) {
            return false;
        }
        visited.push(name);
        let Some(nested_set) = self.nested_sets.get(name) else {
            return false;
        };
        for set in nested_set.sets {
            if self.match_set(set, op) {
                return true;
            }
        }
        for nested2_set in nested_set.nested_sets {
            if self.match_nested_set(nested2_set, op, visited) {
                return true;
            }
        }
        false
    }

    fn match_set(
        self,
        num: u32,
        op: RangeOperator,
    ) -> bool {
        let Some(set) = self.sets.get(num) else {
            return false;
        };
        set.iter()
            .any(|prefix| prefix_and_op_matches(prefix, op, self.prefix))
    }
}
```

Explanations:

1. `visited` tracks the nested set names we have checked to
    prevent infinite recursions from nested sets that contain each other.
1. Using Rust's `let else` syntax, we look up `name` in the nested sets,
    and either bind the result to the variable,
    or return `false` early if `name` is not found.[^real-unrec]
    We apply the same trick to `num`.
1. The `set.iter().any` expression uses a common declarative pattern.
    It loops through the `prefix` elements in `set`,
    calls `prefix_and_op_matches` on each of them,
    and returns `true` iff one of the calls returns `true`.
1. Helper function `prefix_and_op_matches` checks if
    `prefix` matches Range Operator `op` and another prefix.

## Standard data structure changes

For starters,
profiling and standard data structure changes were the lowest-handing fruit.
Although I lost the exact performance record of early implementations,
my benchmark code checked only 256 routes and clearly took minutes to run.
Therefore, I realized that the naive implementation would not scale,
and immediately started profiling the benchmark code to find where most of
the time was spent.

Surprisingly, [Cargo-FlameGraph]
showed that most of the time was spent on checking if
set names have been visited (`visited.contains`).
Since `visited` was a vector (a.k.a.
array list), its linear search compounded with recursion to a cubic growth.
I chose to use vectors because I thought most nested sets would have less than
ten members, in which case linear search would be fine,
but my assumption was clearly wrong.
I changed `visited` to use `HashSet` and boosted the speed by about 10×.

The other effective change was to replace the maps.
`Matcher` contains two B-tree maps,
which are amazing sorted binary trees with $O(\log n)$ lookup time complexity.
However, hash maps have $\Theta(1)$ lookup.
Therefore, it was a no-brainer to try replacing `BTreeMap` with `HashMap`.
I recall this find-replace change causing the `get` calls to
occupy seemingly larger areas in the flame graph!
However, I also saw a 30% faster benchmark, so the hash map was indeed faster.

The hash map being only slightly faster than the B-tree map was no surprise.
The B-tree map is cache-efficient,
and avoids the somewhat expensive string hashing.
This means, for smaller maps, the B-tree may be faster.
Though,
it turned out that my maps are large enough and
my string keys are small enough, such that the hash map won.

These trivial changes turned out to be clear wins,
and show some basics of performance optimization:

- Code profiling helps check our assumptions of run-time complexities.
- Data structure choices can greatly affect performance,
    and both asymptotic complexity analysis and benchmarking help pick them.

## Avoiding redundant work

Besides the bottleneck from `visited`,
further profiling showed our recursion calls all ended up at a slow expression:

```rust
set.iter()
    .any(|prefix| prefix_and_op_matches(prefix, op, self.prefix))
```

This classic linear search naturally reminded me of binary search.
Though,
a regular binary search does not suffice because
range operators make prefix matching inexact,
therefore individual checks made sense.

However, range operators do not permit arbitrary matches;
they at most relax the matching to specific ranges.
Meanwhile, sorting brings similar prefixes close to each other.
Combining these two facts,
I created an optimized algorithm based on binary search:

```rust
fn match_ips(prefix: IpNet, prefixs: [IpNet], op: RangeOperator) -> bool {
    let center = prefixs.binary_search(prefix).map_or_else(identity, identity);
    // Check center.
    if let Some(value) = prefixs.get(center) {
        if prefix_and_op_matches(value, op, prefix) {
            return true;
        }
    }
    // Check right.
    for value in prefixs[(center + 1).min(prefixs.len())..] {
        if prefix_and_op_matches(value, op, prefix) {
            return true;
        }
        if !prefix.is_sibling(value) {
            break;
        }
    }
    // Check left.
    for value in prefixs[..(center.saturating_sub(1)).max(prefixs.len())]
        .iter()
        .rev()
    {
        if prefix_and_op_matches(value, op, prefix) {
            return true;
        }
        if !prefix.is_sibling(value) {
            break;
        }
    }
    false
}
```

Function `match_ips` first obtains a starting point `center` using a regular
binary search on the sorted `prefixes`;
the prefix at `center` is the most similar to `prefix`.
From there, we search rightward and then leftward in the prefix list,
until they are no longer siblings with `prefix`—a necessary condition for
matches.

Although this custom binary search is rather a hack out of intuition than
a mathematically proven algorithm,
I verified it against 26 million routes and got the same results as that of
linear search. Hence, I deem it correct.

Prof. Italo Cunha also suggested using a prefix
[trie](https://en.wikipedia.org/wiki/Trie) in place of the vector,
but benchmarks indicated it was only about half as fast as
the binary search,[^trie-slow] so I stuck with what we have.
In theory, the trie may be imbalanced,
causing long cache-unfriendly traversals, especially for large prefix sets.
Vectors are obviously the most cache-friendly…
which brings up the motivation for another optimization.

Conceptually,
our custom binary search saves us from checking the prefixes far from `center`,
thus we should gain more efficiency with larger, flattened prefix sets.
However,
flattening nested prefix sets results in large vectors and duplicated prefixes,
which bloats memory and hurts cache efficiency.
After empirical testing, I chose to flatten the nested prefix sets once,
which yielded a best, 2× speedup.[^flatten-code]

## Custom data structure

At this point,
the analyzer was processing 26 million routes in 48 minutes,[^trie-slow]
or 9.3 routes per millisecond, a tolerable speed.
However,
I was too impatient to wait more than one day to analyze 800 million routes.

After reading about Bloom filters,
it was tempting for me to eliminate more bottlenecks from the `visited` set.
Recall that `visited` was a `HashSet` that stores the seen sets' names to
prevent infinite recursion:

```rust
# fn match_nested_set(
#     self,
    name: String,
#     op: RangeOperator,
    visited: HashSet<String>,
# ) -> bool {
    if visited.contains(name) {
        return false;
    }
    visited.insert(name);
    // …
# }
```

This proves expensive because of hashing and memory access.
First,
`visited.contains` hashes `name` and tries to look for it in the hash table,
which would probably fail because nested sets containing each other are rare.
Then,
`visited.insert` hashes `name` again and finds a bucket in the hash table to
store it.

With this analysis,
I initially hypothesized that the repeated probing could be a major bottleneck.
I knew that Rust's standard library `HashSet` does quadratic probing, i.e.,
when a hash collision occurs during lookup or insertion,
it hops around the hash table until it finds an empty slot.
As we encounter numerous names,
I guessed that `visited` was often somewhat full when
we looked up unseen names,
causing it to probe around until it finds an empty slot,
which seems inefficient.
Thus,
I thought a Bloom filter could help by providing an early rejection when
a name is not in `visited`.

Therefore, I implemented
[BloomHashSet](https://docs.rs/route_verification_bloom/latest/route_verification_bloom/struct.BloomHashSet.html)
for an insertion-optimized set.
I reuse the hash table from
[HashBrown's "raw"
module](https://docs.rs/hashbrown/latest/hashbrown/raw/index.html),
and added a bit vector for the Bloom filter.
Initially, I used a Bloom filter package that hashed each name four times,
but soon realized hashing is slow.
Thus, I only hash once ($k=1$)
and reuse the hash for both the Bloom filter and the hash table.
To achieve a false positive rate of $\varepsilon=6\%$,
I gave the Bloom filters 16× capacity compared to the hash table ($m/n=16$).
Experiments revealed that I need to preallocate an astonishing capacity of
$2^{14}$ for the hash tables to hold all the prefixes in large nested sets.
Finally,
I reuse the same hash for both the lookup and the insertion.[^bloom-code]

These efforts provided an around 10% speedup,
which is not worth it in my opinion.
The preallocation and hash reuse, the trivial parts,
probably provided most of the speedup, not the Bloom filter, the fancy part.
After further reading HashBrown's source code,
I realized my initial probing hypothesis makes little sense:

- hash collision is extremely rare with preallocation,
- HashBrown reveals multiple buckets for the same hash, and
- HashBrown's quadratic probing is basically adding $1,2,3,\cdots$,
    so it is inexpensive and cache-friendly.

Lessons learned:

- When modifying based on profiling results,
    try to understand performance bottlenecks on a finer granularity.
    This involves investigating deeper into the profiling results and
    the source code, including for your dependencies.
- Preallocate your data structures for easy and significant gains.

## Tenable caching

We have gone a long way removing performance bottlenecks, however,
the overall algorithm remains—we are still calling recursive functions in
a loop:

```rust
fn match_nested_set(/* … */) -> bool {
    // …
#     for set in nested_set.sets {
#         if self.match_set(set, op) {
#             return true;
#         }
#     }
    for nested2_set in nested_set.nested_sets {
        if self.match_nested_set(nested2_set, op, visited) {
            return true;
        }
    }
#     false
}
```

Effectively, this recursion flattens each nested set on the fly.
When talking to Prof. Harsha Madhyastha,
I explained how caching the flattened prefix sets is untenable because of
their massive sizes.
Indeed,
attempting to flatten every nested set to
their prefixes consumed all 300 GiB of RAM and caused our server to hang!
Hence,
further flattening prefix sets is clearly infeasible—not a satisfying answer!

After being unhappy for a few days,
I suddenly rediscovered a tenable caching strategy—flattening outside-in
instead of inside-out.
Flattening prefixes takes too much memory because each prefix (`IpNet`)
is 18 bytes and they are numerous,
but sets are represented with 32-bit numbers and are much fewer.
Although flattening nested sets to
their set `num`bers does not leverage our custom binary search,
it eliminates the recursion calls,
along with the major overhead of tracking `visited` (R.I.P.
`BloomHashSet`),
thus achieving the effect of partially caching the set flattening process.

Below are two of the few surviving flame graphs that shows the differences in
profiling. `match_nested_set` is called `filter_as_set`.
The monolithic bar on the left of each graph is data loading,
and clearly shows the left graph took much more time besides data loading.

| Before flattening the nested sets                                                        | After flattening the nested sets                                                      |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [![Flamegraph before Flattening the nested sets.][flamegraph-before]][flamegraph-before] | [![Flamegraph after Flattening the nested sets.][flamegraph-after]][flamegraph-after] |

With this caching optimization,
the analyzer achieved its current performance of
processing 779 million routes in 2 hour 49 minutes,[^current-perf]
or 76.9 routes per millisecond.
This speed is 8× that of the first version using binary search,
and over 300× that of the initial version if you do the arithmetic.

Notice how most current optimizations are very basic:

- using faster standard data structures,
- customize well-known algorithms to suit the problem,
- preallocation, and
- flattening nested loops.

So are the ideas behind them:

- profile-guided optimization (PGO),
- asymptotic time complexity analysis, and
- caching.

Last but not least, the moderate CPU, memory,
and conceptual overhead of Rust made these optimizations somewhat easy.

## About this article

I procrastinated on finishing this article for two whole months because
it is quite non-trivial to write!
My goal is to separate out the optimization experience from
the research context and Rust programming, but, as you can see,
they are tightly coupled.

I started by trying to lay down a simplified explanation of
the routing analysis problem with several mathematical definitions,
and even drew a diagram to illustrate their relationships.
However,
I soon realized that few people would want to read such definition-heavy text.
Therefore,
I resorted to throw away most of the routing context by
renaming the variables and functions.
For ease of reading,
I converted the topic to a programming problem and explained it with
pseudocode.

I am moderately happy about the outcome of these efforts.

[^cpu]: I ran the experiments on a server with dual EPYC 7763 64-Core processors with
hyper-threading turned off to avoid IOMMU issues.

[^real-code]: These are simplified Rust-like pseudocode based on [my real
code](https://github.com/SichangHe/internet_route_verification/blob/752e19d1c8ab6665a67c69eeffcc9885c60a37ea/route_policy_cmp/src/bgp/filter.rs#L137).
I removed the inessential references (`&` or `&mut`)
and parsing code to be friendly to readers unfamiliar with
Rust. I also changed the names to avoid explaining the research context.

[^real-unrec]: In the real code, we record any missing entries instead of ignoring them.

[^trie-slow]: This Pull Request shows the trie is slower:
[Replace `Vec<IpNet>` with trie `IpTrie` to
improve `filter_as_set`
bottleneck](https://github.com/SichangHe/internet_route_verification/pull/18).
I ran these experiments on the same server but with hyper-threading turned on,
which may yield higher speed.

[^flatten-code]: Here is [the real code for flattening nested sets
once](https://github.com/SichangHe/internet_route_verification/blob/db614215017aeb616526d13d211c24ab0dfa9719/route_policy_cmp/src/bgp/query.rs#L85).

[^bloom-code]: Here is [the real code for integrating
`BloomHashSet`](https://github.com/SichangHe/internet_route_verification/blob/bac23c12ae6732246add5d56ac4ed91710eff38d/route_policy_cmp/src/bgp/filter.rs#L125).

[^current-perf]: Here is the Issue that records the current performance: [RIBs processing
performance](https://github.com/SichangHe/internet_route_verification/issues/157).

<!--
## Appendix A: Flamegraphs

After distinguishing special cases.
[![After distinguishing special
cases][flamegraph-distinguish-spec]][flamegraph-distinguish-spec]

After flattening prefixes of nested sets' direct members.
[![After flattening prefixes of
nested sets' direct
members][flamegraph-use-as-set-routes]][flamegraph-use-as-set-routes]

After flattening each set to its prefixes. [![After flattening each set to its
prefixes][flamegraph-use-routes-for-each-as]][flamegraph-use-routes-for-each-as]
-->

---

Started *2024-05-30*, finished *2024-07-29*.

{{ #include footer.md }}

[Cargo-FlameGraph]: https://github.com/flamegraph-rs/flamegraph
[flamegraph-after]: https://github.com/SichangHe/internet_route_verification/assets/84777573/33a7354f-a47a-4c8f-a905-c717bbd38f62
[flamegraph-before]: https://github.com/SichangHe/internet_route_verification/assets/84777573/6a869975-a764-45f8-9f14-a27498f3e1f8

<!--
[flamegraph-distinguish-spec]: https://github.com/SichangHe/internet_route_verification/assets/84777573/1a7ef5c2-1727-49bf-ae99-a196a95bbfca
[flamegraph-use-as-set-routes]: https://github.com/SichangHe/internet_route_verification/assets/84777573/095af07b-98d8-4f7a-b44f-050454a037d1
[flamegraph-use-routes-for-each-as]: https://github.com/SichangHe/internet_route_verification/assets/84777573/8be94a7a-c913-4df7-bb99-7f095d848376
-->
