# Implementation Plan - Multi-Component Integration

The goal is to integrate three sophisticated React components into the SportVault project: `InteractiveLogsTable`, `GooeyText`, and `Lamp`. This requires a robust shadcn/ui-like foundation.

## User Review Required

> [!IMPORTANT]
> I will be installing `clsx` and `tailwind-merge` to create the `lib/utils.ts` helper.
>
> For **Tailwind CSS v4** support:
> - I will add the standard shadcn CSS variables to your `@theme` block in `app/globals.css`.
> - I will ensure the `bg-gradient-conic` and other gradient utilities used in the Lamp component are correctly handled by Tailwind v4.

## Proposed Changes

### Dependencies
- Install `lucide-react`.
- Install `clsx` and `tailwind-merge`.

### [NEW] [utils.ts](file:///Users/mani/SportVault/sportvault/lib/utils.ts)
- Create the `cn` utility for class name merging.

### [MODIFY] [globals.css](file:///Users/mani/SportVault/sportvault/app/globals.css)
- Add standard shadcn/ui CSS variables to the Tailwind v4 `@theme`.
- Add any necessary custom utility definitions for gradients if needed by v4.

### [NEW] Base UI Components
- [badge.tsx](file:///Users/mani/SportVault/sportvault/components/ui/badge.tsx)
- [button.tsx](file:///Users/mani/SportVault/sportvault/components/ui/button.tsx)
- [input.tsx](file:///Users/mani/SportVault/sportvault/components/ui/input.tsx)

### [NEW] Feature Components
- [interactive-logs-table-shadcnui.tsx](file:///Users/mani/SportVault/sportvault/components/ui/interactive-logs-table-shadcnui.tsx)
- [gooey-text-morphing.tsx](file:///Users/mani/SportVault/sportvault/components/ui/gooey-text-morphing.tsx)
- [lamp.tsx](file:///Users/mani/SportVault/sportvault/components/ui/lamp.tsx)

### [NEW] [page.tsx](file:///Users/mani/SportVault/sportvault/app/demo/page.tsx)
- Create a comprehensive demo page that presents all three components in a clean, vertical layout.

## Verification Plan

### Automated Tests
- Run `npm run dev` and check for errors.
- Browser test `/demo`:
    - **Lamp**: Verify the glow effect and entry animations.
    - **Gooey Text**: Verify smooth morphing between words.
    - **Logs Table**: Verify all interactive elements (search, filter, expand).

### Manual Verification
- Ensure the `Lamp` component's `bg-slate-950` blends well with the SportVault `bg-sv-bg` (#080808).
