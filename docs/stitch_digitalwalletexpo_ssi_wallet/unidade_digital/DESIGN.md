# Design System Documentation: Institutional Excellence

## 1. Overview & Creative North Star
### The Creative North Star: "The Democratic Architecture"
This design system moves beyond the traditional "bureaucratic form" to establish a digital environment that feels like a **Sovereign Ledger**. It is designed to be authoritative yet transparent, using a high-end editorial approach to government services. 

We reject the "generic template" look. Instead, we use **The Democratic Architecture** to create a sense of trust through intentional asymmetry, massive typographic scales, and layered depth. The experience should feel like reading a premium broadsheet or visiting a modern gallery—clean, spacious, and undeniably professional. By prioritizing a "Mobile First" modularity, we ensure that the most complex institutional data remains legible and elegant on any device.

---

## 2. Colors & Atmospheric Depth
Our palette is rooted in national identity but executed with tonal sophistication. We move away from "flat" design into a world of subtle environmental light.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections, cards, or containers. 
Boundaries must be created through **Background Color Shifts**. For example, a `surface-container-low` component should sit on a `surface` background. This creates a "soft edge" that feels integrated into the interface rather than "boxed in."

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper or frosted glass.
*   **Base Layer:** `surface` (#fcf9f8)
*   **Secondary Layer:** `surface_container_low` (#f6f3f2) for subtle grouping.
*   **High-Impact Layer:** `surface_container_highest` (#e5e2e1) for prominent functional areas.

### The "Glass & Gradient" Rule
To elevate the institutional feel, use **Glassmorphism** for the primary `gov.br` header and floating action bars. 
*   **Implementation:** Use a semi-transparent `primary_container` with a `backdrop-blur` of 12px-20px. 
*   **Signature Textures:** Apply a linear gradient (from `primary` to `primary_container`) on hero sections. This adds "soul" and depth, preventing the navy blue from feeling stagnant or "default."

---

## 3. Typography
We utilize a dual-typeface system to balance institutional authority with modern readability.

*   **Headers (Raleway/Rawline):** Used for `display`, `headline`, and `title` scales. Raleway’s elegant, slightly geometric curves provide a "Signature" feel. Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for high-impact landing moments to create an editorial, bold statement.
*   **Body (Public Sans):** Used for `body` and `label` scales. This is a neutral, highly legible workhorse. It ensures that complex government information is accessible to all citizens, regardless of their device or vision.

**Editorial Hierarchy:**
*   **Asymmetry:** Align large headlines to the left with generous "negative space" to the right. Do not feel the need to fill every corner; white space is a sign of prestige and clarity.

---

## 4. Elevation & Depth
We define hierarchy through **Tonal Layering** rather than structural lines.

### The Layering Principle
Stacking `surface-container` tiers creates natural lift. 
*   **Example:** A `surface_container_lowest` (#ffffff) card placed on a `surface_container_low` (#f6f3f2) background provides a crisp, legible lift without the need for heavy shadows.

### Ambient Shadows
When a floating element (like a FAB or a Modal) is required:
*   **Blur:** Minimum 24px.
*   **Opacity:** 4% to 8%.
*   **Color:** Use a tinted shadow based on `on_surface` (a very dark navy/grey) to mimic natural light, avoiding the "dirty" look of pure black shadows.

### The "Ghost Border" Fallback
If accessibility requirements (WCAG) demand a border for an input or button, use a **Ghost Border**.
*   **Token:** `outline_variant` at 20% opacity. 
*   **Strict Prohibition:** Never use 100% opaque, high-contrast borders for non-interactive containers.

---

## 5. Components

### The gov.br Header
*   **Style:** `primary` (#003a8c) background. 
*   **Refinement:** Apply a subtle 10% opacity white gradient from the top-left corner to add a "sheen" of quality. The logo must have a minimum touch target of 48px height.

### Buttons
*   **Primary:** `primary` background with `on_primary` text. Use `lg` (0.5rem) roundedness. 
*   **Secondary:** `secondary_container` (#fecc03) background. This provides high-contrast visibility for the main "Call to Action" against the navy blue.
*   **States:** On hover, shift the background to the `fixed_dim` variant rather than adding a border.

### Cards & Lists
*   **The No-Divider Rule:** Forbid the use of horizontal rules (`<hr>`) or divider lines.
*   **Separation:** Use vertical white space (32px or 48px from the spacing scale) or a subtle shift from `surface` to `surface_container_low` to distinguish between list items or content blocks.

### Input Fields
*   **Architecture:** Use `surface_container_highest` for the input track. Use a `label-md` (Public Sans) floating above the field. 
*   **Focus State:** Instead of a thick border, use a 2px "Glow" effect using the `primary_fixed` token with a 4px blur.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Negative Space:** Allow content to breathe. Institutional trust is built through clarity, not density.
*   **Use Tonal Shifts:** Rely on the `surface-container` tokens to guide the eye.
*   **Prioritize Touch:** Ensure every interactive element is at least 44x44px, even if the visual "hit box" looks smaller.

### Don't:
*   **Don't use 1px borders:** This is the quickest way to make the design look like a legacy system.
*   **Don't use pure black (#000000):** Use `on_surface` (#1b1b1c) for text to maintain a premium, softer contrast.
*   **Don't center-align long text:** Keep body copy left-aligned to maintain the editorial "ledger" feel and improve readability for users with cognitive disabilities.
*   **Don't crowd the gov.br logo:** Give the government identity "Sovereign Space"—at least 24px of clear space on all sides.