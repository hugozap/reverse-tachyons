# Reverse Tachyons

Convert a tachyons class declaration to its CSS (or JavaScript)
equivalent.

# Usage


# Command line

If you install globally (npm install -g reverse-tachyons)
then a cli tool will be available:

```
reverse-tachyons  "w-100 h-100" --js
```

Output
```
->Defaults:
{ height: '100%',
  width: '100%',
  backgroundColor: '#000',
  padding: '0' }

->Not small:
{ width: '100%' }

```

# Api

TODO: please see tests.js

# Why?

Tachyons is a great tool. It can be used for prototyping and  production websites. However sometimes you need to migrate to other CSS systems like inline styles in React or something like Radium.


