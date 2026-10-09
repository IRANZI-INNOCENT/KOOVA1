# Required change to `frontend/lib/api.ts`

Inside `makeRequest`, replace the hard-coded JSON header block:

```ts
headers: {
  "Content-Type": "application/json",
  ...(requestOptions.headers || {}),
},
```

with:

```ts
headers: {
  ...(requestOptions.body instanceof FormData
    ? {}
    : { "Content-Type": "application/json" }),
  ...(requestOptions.headers || {}),
},
```

This is required so the browser can set the multipart boundary for Snap to Sell.
