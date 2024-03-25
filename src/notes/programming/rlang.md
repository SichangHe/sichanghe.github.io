<!-- toc -->
# R lang

# naming

## character allowed

letter, `.`, `_`

- cannot start with `_`
- cannot start with `..`

# basic syntax

## command separation

`;` or `\n`

## comment

`#` last to the end of line

## assignment

`=`
`assignee <- assigner`
`assigner -> assignee`

# function

## execute from `.R` file

`source("filename.R")`

## manipulate data storage

### show all object

`objects()`

### remove object

`rm(obj1,obj2,…)`

### store to disk

choose `y` when quit `q()`
stored as `.RData`

# data structure

## vector

`c(ele1,ele2,…)`
can also take vector as element, will expand

# package managing

## install package

`install.packages("package_name")`

- install multiple packages\
    use a vector
`install.packages(c("package1","package2",…))`
