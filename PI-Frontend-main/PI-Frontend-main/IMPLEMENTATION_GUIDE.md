# LinkedIn-Inspired Recruiter Dashboard - Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing and customizing the modern, professional recruiter dashboard with LinkedIn-inspired design.

## Architecture

### Directory Structure
```
src/app/recruiter-dashboard/
├── DESIGN_GUIDE.md                 # Design system documentation
├── modern-components.scss           # Reusable component patterns
├── recruiter-dashboard.component.ts   # Main component logic
├── recruiter-dashboard.component.html # Main layout template
├── recruiter-dashboard.component.scss # Main layout styles
│
├── rd-header/
│   ├── rd-header.component.ts
│   ├── rd-header.component.html     # Top navigation bar
│   └── rd-header.component.scss     # Header styling
│
├── rd-sidebar/
│   ├── rd-sidebar.component.ts
│   ├── rd-sidebar.component.html    # Left navigation menu
│   └── rd-sidebar.component.scss    # Sidebar styling
│
├── rd-footer/
│   ├── rd-footer.component.ts
│   ├── rd-footer.component.html    # Bottom footer
│   └── rd-footer.component.scss    # Footer styling
│
├── rd-dashboard/
│   ├── rd-dashboard.component.ts
│   ├── rd-dashboard.component.html # Statistics & overview
│   └── rd-dashboard.component.scss # Dashboard cards
│
└── [Other sub-components...]
```

## Color System

### Primary Colors
- **LinkedIn Blue**: `#0A66C2` - Primary brand, buttons, links
- **LinkedIn Dark**: `#003D7A` - Headings, emphasis
- **LinkedIn Light**: `#E7F3FF` - Subtle backgrounds
- **LinkedIn Gray**: `#F3F2EF` - Main background

### Using Colors in Components
```scss
// Always use CSS variables
div {
    color: var(--linkedin-blue);
    background: var(--linkedin-gray);
    border-color: var(--linkedin-border);
}

// Never hardcode colors
div {
    color: #0A66C2;        // Wrong - breaks theming
}
```

## Layout System

### Fixed Positions
- **Header**: Fixed at top, 64px height
- **Sidebar**: Fixed on left, 260px width
- **Main Content**: Fills remaining space with 24px padding
- **Footer**: Sticky at bottom of content

### Responsive Breakpoints
```scss
// Mobile
@media (max-width: 768px) {
    .recruiter-layout {
        grid-template-columns: 1fr;    // Single column
    }

    .recruiter-sidebar {
        transform: translateX(-260px); // Hidden by default
        
        &.active {
            transform: translateX(0);   // Show on menu toggle
        }
    }
}

// Tablet/Desktop
@media (min-width: 769px) {
    .recruiter-layout {
        grid-template-columns: 260px 1fr;  // Two column with sidebar
    }
}
```

## Component Patterns

### Creating a New Card Component
```html
<!-- Template: new-card.component.html -->
<div class="card">
    <div class="card-header">
        <h4>Card Title</h4>
    </div>
    <div class="card-body">
        <p>Card content goes here</p>
    </div>
</div>
```

```scss
// Styles: new-card.component.scss
:host {
    display: block;
}

.card {
    background: white;
    border: 1px solid var(--linkedin-border);
    border-radius: 8px;
    box-shadow: var(--linkedin-shadow);
    transition: var(--transition);

    &:hover {
        box-shadow: var(--linkedin-shadow-lg);
        border-color: var(--linkedin-blue);
    }
}

.card-header {
    padding: 16px;
    border-bottom: 1px solid var(--linkedin-border);

    h4 {
        margin: 0;
        color: var(--linkedin-dark);
        font-weight: 600;
        font-size: 14px;
    }
}

.card-body {
    padding: 16px;
}
```

### Creating a Button (Correct Pattern)
```html
<!-- Template -->
<button class="btn btn-primary">
    <i class="ri-add-line"></i>
    Add Item
</button>
```

```scss
// Styles
.btn {
    border-radius: 24px;
    font-weight: 600;
    padding: 10px 24px;
    border: none;
    cursor: pointer;
    transition: var(--transition);

    i {
        margin-right: 8px;
    }

    &-primary {
        background: var(--linkedin-blue);
        color: white;

        &:hover {
            background: var(--linkedin-dark);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(10, 102, 194, 0.3);
        }
    }
}
```

### Creating a Stat Card
```html
<!-- Template -->
<div class="stat-card">
    <div class="stat-label">Total Candidates</div>
    <div class="stat-value">245</div>
    <div class="stat-change positive">↑ 12% this week</div>
</div>
```

Use the `.stat-card` styles from `modern-components.scss`.

## Typography

### Font Stack
The system uses the native system font stack for optimal performance:
```scss
--fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', sans-serif;
```

### Size Scale
- **H1**: 28px (page titles)
- **H2**: 20px (section headers)
- **H3**: 16px (subsections)
- **H4**: 14px (card titles)
- **Body**: 13px (default)
- **Small**: 12px (labels, captions)

### Font Weights
- **400**: Regular text
- **500**: Medium (secondary text)
- **600**: Semibold (labels, buttons)
- **700**: Bold (headings)

### Correct Usage
```html
<h1>Page Title</h1>
<h2>Section Title</h2>
<p>Body text with normal weight.</p>
<small>Small caption text.</small>
```

## Spacing System

### Base Unit: 8px
All spacing should be multiples of 8px:
- **8px** - Extra small (icon gaps)
- **16px** - Small (button padding, input padding)
- **24px** - Standard (page padding, section gaps)
- **32px** - Large (major section spacing)

### Correct Usage
```scss
.component {
    padding: 16px;           // ✅ Good
    margin-bottom: 24px;     // ✅ Good
    gap: 8px;                // ✅ Good
    padding: 15px;           // ❌ Wrong
    margin: 20px 25px;       // ❌ Wrong
}
```

## Shadows

### Three-Tier Shadow System
```scss
// Light shadow - default cards
box-shadow: var(--linkedin-shadow);
// 0 2px 4px rgba(0, 0, 0, 0.1)

// Medium shadow - hover/active states
box-shadow: var(--linkedin-shadow-lg);
// 0 4px 12px rgba(0, 0, 0, 0.15)

// Heavy shadow - modals, elevations
box-shadow: var(--linkedin-shadow-xl);
// 0 8px 20px rgba(0, 0, 0, 0.12)
```

## Transitions

### Standard Duration: 0.2s
All interactive elements should use consistent timing:
```scss
// Good
transition: var(--transition);           // all ease 0.2s

// Component-specific
transition: background-color 0.2s ease;
transition: box-shadow 0.2s ease;
```

## Forms

### Input Styling
```html
<div class="form-group">
    <label class="form-label">Email Address</label>
    <input type="email" class="form-control" placeholder="Enter email">
</div>
```

```scss
.form-label {
    color: var(--linkedin-text);
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 8px;
}

.form-control {
    border: 1px solid var(--linkedin-border);
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 13px;
    transition: var(--transition);

    &:focus {
        outline: none;
        border-color: var(--linkedin-blue);
        box-shadow: 0 0 0 3px rgba(10, 102, 194, 0.1);
    }
}
```

## Tables

### Table Structure
```html
<table class="table">
    <thead>
        <tr>
            <th>Candidate Name</th>
            <th>Position</th>
            <th>Status</th>
            <th>Action</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>John Doe</td>
            <td>Frontend Developer</td>
            <td><span class="badge badge-success">Active</span></td>
            <td>
                <button class="btn btn-sm btn-secondary">View</button>
            </td>
        </tr>
    </tbody>
</table>
```

## Common Patterns

### List with Avatar
```html
<div class="list-item">
    <div class="item-avatar">JD</div>
    <div class="item-content">
        <div class="item-title">John Doe</div>
        <div class="item-subtitle">Frontend Developer</div>
    </div>
    <div class="item-action">
        <button class="btn btn-sm btn-secondary">Contact</button>
    </div>
</div>
```

### Status Badge
```html
<span class="badge badge-primary">In Progress</span>
<span class="badge badge-success">Completed</span>
<span class="badge badge-danger">Pending</span>
```

### Empty State
```html
<div class="empty-state">
    <div class="empty-icon">📭</div>
    <div class="empty-title">No Candidates Found</div>
    <div class="empty-description">Try adjusting your filters or search terms.</div>
    <div class="empty-action">
        <button class="btn btn-primary">Clear Filters</button>
    </div>
</div>
```

## Best Practices

### ✅ DO:
1. Use CSS variables for all colors
2. Follow 8px spacing grid
3. Apply transitions to interactive elements
4. Use semantic HTML
5. Test on mobile devices
6. Use descriptive class names
7. Document complex components
8. Keep components reusable

### ❌ DON'T:
1. Use `!important` (bad for maintainability)
2. Use hardcoded colors
3. Use random spacing values
4. Create overly complex selectors
5. Forget mobile responsiveness
6. Use animation for everything
7. Create duplicate components
8. Ignore accessibility

## Testing Checklist

### Visual Testing
- [ ] Component displays correctly on desktop
- [ ] Component displays correctly on tablet (768px)
- [ ] Component displays correctly on mobile (375px)
- [ ] Hover states work smoothly
- [ ] Focus states clear and visible
- [ ] Colors contrast appropriately
- [ ] Spacing is consistent
- [ ] Typography is readable

### Functional Testing
- [ ] Buttons are clickable and responsive
- [ ] Forms accept input correctly
- [ ] Links navigate properly
- [ ] Menus open/close smoothly
- [ ] No console errors
- [ ] Performance is acceptable

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrasts meet WCAG AA
- [ ] Focus indicators visible
- [ ] Form labels properly associated
- [ ] ARIA labels where needed

## Performance Tips

1. **Use CSS variables** - Reduces bundle size
2. **Minimize transitions** - Only on interactive elements
3. **Lazy load images** - Progressive loading
4. **Optimize shadows** - Minimal elevation levels
5. **Use native fonts** - System font stack
6. **Avoid excessive nesting** - Keep specificity low
7. **Compress images** - Reduce file sizes
8. **Tree-shake unused styles** - Clean imports

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Colors not updating?
1. Check CSS variables in `:root`
2. Verify no hardcoded colors override
3. Clear browser cache
4. Restart build process

### Layout broken on mobile?
1. Check responsive media queries
2. Verify grid/flexbox properties
3. Test on actual mobile device
4. Use browser DevTools device mode

### Shadows too dark/light?
1. Use one of three shadow variables
2. Don't create custom box-shadows
3. Check if multiple shadows stack unexpectedly

### Spacing looks off?
1. Verify using 8px grid
2. Check padding vs margin usage
3. Look for inherited margins
4. Use normalize.css for consistency

## Additional Resources

- [LinkedIn Design Language](https://brand.linkedin.com/)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Tricks](https://css-tricks.com/)
- [MDN Web Docs](https://developer.mozilla.org/)

## Support

For questions or issues with the design system:
1. Check the DESIGN_GUIDE.md
2. Review modern-components.scss patterns
3. Test in browser DevTools
4. Compare with existing components
5. Document any custom additions
