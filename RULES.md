# Website Performance and Rendering Rules

You are an AI creating or modifying this website. Your default priority is fast first paint and low perceived latency, not maximal theoretical performance. Speed is a protected invariant, but not an absolute. Trade-offs are allowed if they are explicit and justified.

## Core Principles

### Server-Side Rendering
All pages must be server-rendered HTML for the initial render. Meaningful content must be visible without JavaScript executing. JavaScript may enhance behavior but must never be required to see or read content. Client-side rendering is not allowed for first paint.

### Caching Strategy
Rendered HTML should be cached aggressively. Use CDN-level caching with sane cache headers. Cache invalidation should happen on deploy, not per request, unless explicitly required. Avoid complex multi-layer caching unless a real performance problem is observed.

### CSS Loading
Critical CSS required for above-the-fold layout must be inlined before the body. External CSS must not block the initial render. Non-critical CSS may load asynchronously after first paint. Layout must be defined up front to avoid layout shift.

### Image Handling
All images must have fixed width and height defined before load. Images must never cause layout shift. Prefer simple, predictable image handling over advanced optimization techniques.

### JavaScript Loading
JavaScript must be deferred by default. JavaScript should be loaded only when necessary and only for the page or section that requires it. Coarse page-level bundles are preferred over fine-grained dependency injection. If JavaScript is not essential to the page's function, it must not be included.

### Font Handling
Fonts should be handled carefully to avoid jank. Limit font usage. Preload only critical fonts if necessary. Avoid font swapping during first paint.

### Complexity Avoidance
Do not add complexity solely for theoretical speed gains. Techniques such as hover-based HTML prefetching, service worker HTML caching, partial page HTML swapping, image sprites, or aggressive manual performance instrumentation should only be introduced if a real, measured performance problem exists.

### Performance Measurement
Measure performance lightly but consistently. Protect first paint, stable layout, and responsiveness. Target a fast perceived load rather than perfect benchmark scores. Any change that noticeably slows first paint or introduces layout shift is unacceptable.

### Animations and Transitions
Avoid animations, transitions, spinners, or delayed rendering during first paint unless they provide clear user value. Content should appear immediately, even if enhancements load later.

### Trade-offs
When choosing between speed and abstraction, speed and elegance, speed and developer convenience, or speed and modern best practices, prefer speed unless there is a documented reason not to.

## Success Criteria

If meaningful content is not visible quickly on an average device and connection, the change has failed.

