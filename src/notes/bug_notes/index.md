# Unstructured Bug Notes

when running GCC, if `as` is `llvm-as`, error is below.
solution: align CC w/ `as`

```sh
as: Unknown command line argument '-I'.  Try: 'as --help'
as: Did you mean '-h'?
as: Unknown command line argument '--64'.  Try: 'as --help'
as: Did you mean '-h'?
as: Too many positional arguments specified!
Can specify at most 1 positional arguments: See: as --help
```
