# Coding Standards & Best Practices

This document outlines the mandatory coding standards for the `ncompasstv-dashboard` project. All contributors must adhere to these guidelines to ensure code quality, maintainability, and consistency.

## 1. CSS/SASS Architecture

**Rule:** Always use **SASS (SCSS)** and the **BEM (Block Element Modifier)** naming convention.

### 1.1 SASS (SCSS)

- All style files must use the `.scss` extension.
- Use SASS features like nesting, variables, and mixins responsibly.
- Avoid deep nesting (maximum 3 levels deep).

### 1.2 BEM Naming Convention

We strictly follow the **BEM** methodology for naming CSS classes.

- **Block**: The main component (e.g., `card`, `menu`, `button`).
- **Element**: A child of the block, denoted by two underscores `__` (e.g., `card__title`, `menu__item`).
- **Modifier**: A variation of the block or element, denoted by two hyphens `--` (e.g., `button--primary`, `menu__item--active`).

**Example:**

```scss
// Good
.card {
    &__header {
        background-color: #f0f0f0;
    }

    &__content {
        padding: 20px;
    }

    &__button {
        background-color: blue;

        &--disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }
}
```

```html
<!-- Good -->
<div class="card">
    <div class="card__header">Title</div>
    <div class="card__content">
        <button class="card__button card__button--disabled">Submit</button>
    </div>
</div>
```

**Bad:**

```css
/* Avoid ID selectors and generic class names */
#myCard { ... }
.header { ... }
.active { ... } /* Too generic, use modifier like .card--active */
```

### 1.3 Tailwind CSS Integration

We integrate Tailwind CSS to speed up styling while maintaining BEM structure.

- **Use `@apply`**: Do not clutter HTML with extensive Tailwind utility classes. Instead, use Tailwind's `@apply` directive within your SASS/BEM classes.
- **Mix**: It is acceptable to mix standard SASS properties with `@apply` where appropriate.

**Example:**

```scss
// Good
.button {
    @apply px-4 py-2 bg-blue-500 text-white rounded;

    &:hover {
        @apply bg-blue-700;
    }
}
```

```html
<!-- Good -->
<button class="button">Click Me</button>

<!-- Bad -->
<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">Click me</button>
```

## 2. Documentation (JSDocs)

**Rule:** Mandatory **JSDoc** comments for all classes, methods, functions, and interfaces.

Documentation serves as the single source of truth for code intent and usage.

### 2.1 Requirements

- **Description**: A clear summary of what the symbol does.
- **@param**: Document every parameter, its type, and purpose.
- **@returns**: Document the return value and its type (if not void).
- **@throws**: Document any errors that might be thrown.
- **@example**: Provide a usage example for complex logic.

### 2.2 Example

```typescript
/**
 * calculated the total price of a cart including tax.
 *
 * @param {number} subtotal - The sum of item prices.
 * @param {number} taxRate - The tax rate as a decimal (e.g., 0.1 for 10%).
 * @returns {number} The total price formatted to 2 decimal places.
 * @throws {Error} If the subtotal is negative.
 *
 * @example
 * const total = calculateTotal(100, 0.2); // Returns 120
 */
function calculateTotal(subtotal: number, taxRate: number): number {
    if (subtotal < 0) {
        throw new Error('Subtotal cannot be negative');
    }
    return subtotal * (1 + taxRate);
}
```

## 3. TypeScript

- **Strict Mode**: `strict: true` is enabled in `tsconfig.json`. Do not bypass strict type checks.
- **Explicit Types**: Use explicit return types for functions.
- **No Any**: Avoid `any`. Use `unknown` or define a proper interface/type.
- **Imports**: Use path aliases (e.g., `@core`, `@shared`) instead of relative paths (e.g., `../../score`).

## 4. File Structure

Follow the established project structure:

- **`src/app/core`**: Singleton services, guards, interceptors, models.
- **`src/app/shared`**: Reusable dumb components, pipes, directives.
- **`src/app/features`**: Feature modules and smart components (pages).
- **`src/app/layout`**: Main layout components (header, sidebar).

## 5. Summary Checklist

Before submitting a PR, ensure:

- [ ] Styles use SCSS and BEM, with Tailwind `@apply` for utilities.
- [ ] All functions and classes have JSDoc.
- [ ] Code is formatted (`npm run pretty`).
- [ ] Tests pass (`npm test`).
