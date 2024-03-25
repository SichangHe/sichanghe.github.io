<!-- toc -->
# Visualization

# data type

## item

discrete entry

## attribute

measured property

### attribute type

- nominal (categorical)

    with equality relationship
- ordinal

    with order
- quantitative (numerical)

    with algebra
    - ratio: with meaningful $0$
    - interval

## link

relationship between item

## position

spatial location

## grid

sampling strategy for continuous data

## structured data

- table: item & attribute
    - flat
    - multi-dimensional
- network: item & attribute & link
- field: grid & attribute
- geometry: position

## unstructured data

text, audio, graphics…

# symbolic display

- parallel coordinate
- treemap
- field
- choropleth map
- star plot

## graph

- framework
    - scale
- content
    - mark
- label
    - title
    - axis

## mark

represent item, link

- point
- line
- area

## channel

represent attribute

- position
- color
    - hue
    - saturation
    - luminance
- shape
    - glyph
- tilt
- size
- area
- texture

### characteristic of channel

- selective
- associative
- quantitative
- order
- length

# analysis framework

four level

- domain situation
- data/task abstraction
- visual encoding/interaction idiom
- algorithm

three question

- what
- why
- how

## user task

- query
    - retrieve value
    - find extremum
    - determine range
- search
    - sort
    - filter
- consume
    - compute derived value
    - characterize distribution
    - find anomaly
    - cluster
    - correlate

# graph theory

$G(V,E)$

- independent set: no edge
- clique: all possible edge
- path: all edge can be consecutively traversed
- tree: no cycle
- network
- unconnected graph
- biconnected graph: no articulation point
    - articulation point: break the graph if deleted
- bipartite graph: edge between only vertex for two set

## centrality

quantity to measure vertex importance

### degree of vertex

number of connected node

- in-degree/ out degree for directed graph

### betweeness of vertex

sum of number of shortest path through the vertex
divided by number of shortest path between each pair of vertex

$$
B(i)=∑_{a,b}\frac{g_{aib}}{g_{ab}}
$$

### closeness of vertex

sum of geodesic distance between the vertex and every other

$$
C(i)=∑_jd(i,j)
$$

#### geodesic distance between vertex

number of edge between them on the shortest path

### eigenvector of vertex

adjacency matrix dot vector of degree

### clustering coefficient

# time
