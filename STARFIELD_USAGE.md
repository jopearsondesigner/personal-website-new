# StarField Animation Components Usage Guide

This document explains how to use the StarField animation components in your portfolio website.

## Overview

There are two StarField implementations available:

1. **StarField.svelte** - A lightweight implementation with basic functionality
2. **StarFieldManager.svelte** - A more comprehensive implementation with additional features

## Which One Should I Use?

### Use StarField.svelte when:
- You need a simple, lightweight star animation
- Performance is a concern on lower-end devices
- You want minimal setup and configuration

### Use StarFieldManager.svelte when:
- You need more control over the animation
- You want event notifications (using dispatched events)
- You need adaptive quality based on device performance
- You want more detailed debugging and logging

## Basic Usage

### StarField.svelte Example:

```svelte
<script>
  import StarField from '$lib/components/effects/StarField.svelte';
  import { onMount } from 'svelte';
  
  let containerElement;
  
  onMount(() => {
    // The component will auto-start by default
  });
</script>

<div bind:this={containerElement} class="bg-black h-screen w-screen">
  <StarField {containerElement} starCount={300} />
  <div class="relative z-10">
    <!-- Your content goes here -->
  </div>
</div>
```

### StarFieldManager.svelte Example:

```svelte
<script>
  import StarFieldManager from '$lib/components/effects/StarFieldManager.svelte';
  import { onMount } from 'svelte';
  
  let containerElement;
  let starFieldManager;
  
  function handleStarFieldEvent(event) {
    console.log('StarField event:', event.detail);
  }
  
  // Example of how to control the animation programmatically
  function handleUserInteraction() {
    starFieldManager.boost();
    setTimeout(() => starFieldManager.unboost(), 1000);
  }
</script>

<div bind:this={containerElement} class="bg-black h-screen w-screen">
  <StarFieldManager 
    bind:this={starFieldManager}
    {containerElement} 
    starCount={300}
    on:initialized={handleStarFieldEvent}
    on:error={handleStarFieldEvent}
  />
  
  <div class="relative z-10">
    <button on:click={handleUserInteraction}>Boost Stars</button>
    <!-- Your content goes here -->
  </div>
</div>
```

## Configuration Options

Both components support the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| containerElement | HTMLElement | null | The container element for the canvas |
| starCount | number | 300 | Number of stars to render |
| enableBoost | boolean | true | Whether to enable boosting with spacebar/touch |
| baseSpeed | number | 0.25 | Base animation speed |
| boostSpeed | number | 2 | Speed during boost |
| maxDepth | number | 32 | Maximum Z-depth for 3D effect |

### Additional props for StarFieldManager:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| enableGlow | boolean | true | Enable glow effects (can be disabled for performance) |
| debugMode | boolean | false | Enable debug mode (disables frame rate limiting) |

## Events (StarFieldManager only)

The StarFieldManager component dispatches the following events:

- **initialized** - When the canvas is initialized
- **error** - When an error occurs
- **stop** - When animation is stopped
- **pause** - When animation is paused
- **resume** - When animation is resumed
- **boost** - When boost is activated
- **unboost** - When boost is deactivated
- **adapted** - When quality is adapted to device capabilities
- **resize** - When the canvas is resized
- **destroyed** - When the component is destroyed

## Performance Tips

1. **Reduce star count** on lower-end devices
   ```svelte
   <StarField starCount={150} />
   ```

2. **Disable glow effects** with StarFieldManager
   ```svelte
   <StarFieldManager enableGlow={false} />
   ```

3. **Check device capabilities** before rendering
   ```svelte
   <script>
     import { deviceCapabilities } from '$lib/utils/device-performance';
     import { onMount } from 'svelte';
     import StarFieldManager from '$lib/components/effects/StarFieldManager.svelte';
     
     let starFieldManager;
     let containerElement;
     
     onMount(() => {
       const capabilities = deviceCapabilities.getCapabilities();
       if (starFieldManager) {
         starFieldManager.adaptToDeviceCapabilities(capabilities);
       }
     });
   </script>
   
   <div bind:this={containerElement}>
     <StarFieldManager bind:this={starFieldManager} {containerElement} />
   </div>
   ```

## Troubleshooting

If you encounter issues:

1. Open your browser's console (F12) to check for errors
2. Enable debug mode in StarFieldManager
   ```svelte
   <StarFieldManager debugMode={true} />
   ```
3. Verify the container element has valid dimensions (width/height > 0)
4. Check if the canvas element is created and correctly sized
5. Try reducing star count for better performance

## Browser Compatibility

The StarField components use standard Canvas API and should work in all modern browsers. For older browsers, consider using a feature detection library to check for Canvas support before rendering.
