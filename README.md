## TL;DR

We love Tailwind. We believe it's a great technology to quickly build UIs in a robust and maintainable way.

In our team, we recently inherited a UI Component Library built using Vue and Tailwind CSS. After reviewing our requirements and understanding the impact of using Tailwind, we quickly realised that Tailwind CSS has some limitations where it does not fit our use case for a shared UI Component Library.

This analysis doesn't intend to move any criticism, but rather collect feedback to ensure we're making an informed decision.

We would like to present our findings to the community before taking a final decision to ensure we've not missed any solution to resolve our main issues.

## Context

Our team has inherited a Component Library built using Vue 3, Vite and Tailwind CSS. The library is in an `alpha` state and has no clients yet.

- [Reproduction repository](https://github.com/floroz/vite-css-module-treeshakable/tree/tailwind): `git switch tailwind`

- The final output of the tailwind build is called `base.css`

## Requirements

- Vue.js is the only peer dependency of all our clients

- Tailwind, or its toolchain, _should not be required_ in any clients' projects.

- The library should be offering tree-shaking (only bundle the components you are going to use)

## Adding a Prefix to avoid affecting the client's stylesheet

Currently, adding Tailwind classes such as `text-ellipsis` or `font-bold` will lead to the creation of a stylesheet (`base.css`) in the library output that the clients will needs importing:

```css
/* base.css */
.text-ellipsis {
  text-overflow: ellipsis;
}
.font-bold {
  font-weight: 700;
}
```

These classes are common and nothing could prevent a clash if, in the client's build process, another stylesheet is appended to the head where they are also adding `.font-bold` or `text-ellipsis` and therefore breaking our library styles.

One way to mitigate (but not prevent) this issue is to use the [`prefix` in Tailwind Config](https://tailwindcss.com/docs/configuration#prefix).

For example, if we want to prefix our classes with `brink-`, we will need to

- refactor all tailwind classes to add the prefix

Therefore, our previous HTML

```html
<div class="font-bold" />
<div class="text-ellipsis" />
```

will need to be manually refactored to:

```html
<div class="brink-font-bold" />
<div class="brink-text-ellipsis" />
```

Our DX would suffer from this change as our templates would become:

1. more verbose
2. harder to read
3. more cognitive load to detect a Tailwind class

## Treeshakable CSS

### The desired behaviour

One of our main goal in building `brink-ui` is to allow clients to import and consume _only what they need_ from the library, without being forced to load the entire bundle.

A common use case could be the following two clients:

**Client A:**

```ts
import { Button } from "brink-ui";
```

**Client B:**

```ts
import { Dialog } from "brink-ui";
```

Based on the above scenario, we want to make sure that Client A will need to add to their final bundle only the code (js/vue/css) necessary for the `Button`.

In the same way, we want **Client B** to only import the code and styles necessary for those components, without any reference to the `Button`.

### The issue

Unfortunately, if we look into the underlying implementation, we can imagine a simplified scenario where our library components would look like this:

```html
<!-- Button Component -->
<button class="font-bold">Click Me</button>
<!-- Dialog Component -->
<dialog class="text-ellipsis">Hello</dialog>
```

We would once again generate a `base.css` file that our clients will need to import

**Client A:**

```ts
// main.ts
import "brink-ui/dist/base.css";
```

**Client B:**

```ts
// main.ts
import "brink-ui/dist/base.css";
```

However, if we look at the `base.css` file, our Tailwind output will be as follows, even with the _Preflight Plugin Disabled_.

```css
.text-ellipsis {
  text-overflow: ellipsis;
}
.font-bold {
  font-weight: 700;
}
```

Again, this is an overly simplified example, but as you can see the styles belonging to the `Button` and the `Dialog` are merged together, and therefore _both Client A and Client B would need to import and bundle more than they actually use._

### A potential solution using CSS Modules

A workaround to potentially resolve the issue of the classes merged in a single stylesheet by Tailwind would be to use the `@apply` directive within a CSS Modules file to create separate `.css` files.

In our library, this would look like (using Vue.js SFC):

```vue
<template>
  <!-- Button.vue -->
  <button :class="$styles.button">Click me</button>
</template>
<style module>
.button {
  @apply font-bold;
}
</style>
```

```vue
<template>
  <!-- Dialog.vue -->
  <dialog :class="$styles.dialog">Click me</dialog>
</template>
<style module>
.dialog {
  @apply text-ellipsis;
}
</style>
```

Using the `cssCodeSplit` option provided by Vite, our final build output will create

```sh
index.js # entry point
Button.js # transpiled Vue component
Button.module.css # post-processed CSS
Dialog.js
Dialog.module.css
```

Looking at `Button.module.css` and `Dialog.module.css`

```css
/* Button.module.css */
._button_136hp_2 {
  font-weight: 700;
}

/* Dialog.module.css */
._dialog_1gqx3_2 {
  text-overflow: ellipsis;
}

/* base.css */
/* file is now empty */
```

We can see how with this strategy, we are able to remove the merging from the `base.css` and have each component importing its own CSS, therefore allowing consumers to tree shake the unused components and never bundle their linked CSS files.

### Trade-offs of this approach

There are a few issues with this approach:

- We have less control over the growth of bundle size as for each CSS Module or Tailwind CSS classes added under a module, the class and variables will be copied over and over, drastically increasing the CSS bundle size.
  <br />
- One of the main benefits of Tailwind is not having to think and create names for each class. With this approach, we are forced to create synthetic class names just to host the `@apply` directive.
  <br />
- As we start to diverge from the Tailwind default theme, we lose more and more benefits of adopting Tailwind, but remain locked within its constraints.
  <br />
- When external libraries require us to add global styling, we will need to create `:global` nested selector, or other artifices that would cause more confusion and bloating of our style declaration.

## Removing Preflight to avoid @layer base to affect client's stylesheet

We need to [remove the Prelight](https://tailwindcss.com/docs/preflight#disabling-preflight) and `@tailwind base`.

This was not done at the beginning of the project and will require us to now verify each component individually

## Other references

- [Transpilation to CSS Modules / Tree Shaking
  ](https://github.com/tailwindlabs/tailwindcss/discussions/10045)
- [Can I publish a component/library while avoiding duplicate classes?
  ](https://github.com/tailwindlabs/tailwindcss/discussions/9927)

## Open Source UI Component Libraries Build on Tailwind

How do OSS solutions compare in relation to the type of exports that they provide?

- Behaviors: the library provides JS/TS files to provide behaviours to components.
- Components: the library provides fully-fledged solutions ready to use that include behaviours and styles.
- Tailwind Plugin: the library provides a Tailwind plugin for styling (consumers must use Tailwind).
- CSS Stylesheet: the library provides a stylesheet for consumers to import into their applications.

| Name                                                                              | Behaviors | Components | Tailwind Plugin | CSS Stylesheet |
| --------------------------------------------------------------------------------- | --------- | ---------- | --------------- | -------------- |
| [daisyui](https://daisyui.com/docs/install/)                                      | ❌        | ❌         | ✅              | ❌             |
| [flowbite](https://flowbite.com/docs/getting-started/quickstart/#require-via-npm) | ✅        | ❌         | ✅              | ❌             |
| [mambaui](https://github.com/Microwawe/mamba-ui#usage)                            | ❌        | ❌         | ❌              | ✅             |
| [hyperui](https://www.hyperui.dev/)                                               | ❌        | ❌         | ✅              | ❌ \*          |

It seems a common pattern in the Open Source Community for Tailwind UI Library to be exclusively CSS Toolkits to be applied in a headless mode, and not providing exports of Components.

## Other problematic aspects of Tailwind as Componet Libray

I have not investigated in depth these issues but it's important to note them:

- [Tailwind and ShadowDOM stylesheet injection](https://github.com/tailwindlabs/tailwindcss/discussions/1935)

- [CSS class override utility for component composition
  ](https://github.com/tailwindlabs/tailwindcss/discussions/1446)
- Tailwind doesn't support class overriding unless using class management library or `tailwind-merge` utility: [1](https://github.com/tailwindlabs/tailwindcss/discussions/9343), [2](https://github.com/tailwindlabs/tailwindcss/discussions/10224)
