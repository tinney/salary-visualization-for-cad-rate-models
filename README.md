# salary-visualization-for-cad-rate-models

Salary visualization for comparing CAD exchange-rate models.

## Prerequisites

- [Bun](https://bun.sh/) installed locally

## Run locally

1. Install dependencies:

```bash
bun install
```

2. Start the Vite development server:

```bash
bun run dev
```

3. Open the local URL shown in the terminal. By default, Vite serves the app at:

```text
http://localhost:5173
```

## Production build

Create a production build with:

```bash
bun run build
```

## Preview the production build

After building, preview the generated app locally with:

```bash
bun run preview
```

## Refresh exchange-rate data

To re-fetch the USD/CAD monthly rate data used by the app:

```bash
bun run fetch-rates
```

## Scripts

- `bun run dev` - start the Vite dev server
- `bun run build` - create a production build
- `bun run preview` - preview the production build locally
- `bun run fetch-rates` - fetch the monthly USD/CAD rate dataset