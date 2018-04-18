# Reverse Tachyons

Convert a tachyons string to its CSS (or JavaScript)
equivalent.

Useful if you like tachyons conventions but need the 
actual CSS instead.


# Install

```
npm install -g reverse-tachyons

```

# Usage (Command line)

From your terminal type:

```
reverse-tachyons  "w-100 h-100 w-100-ns bg-black pa0" --js

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

## Flags

--js Return a JavaScript Object (useful for inline styles in React

If you omit the flag, a CSS formatted declaration will be returned



