<!-- ArcadeNavigation.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";

  const dispatch = createEventDispatcher();

  let menuButtonRef: HTMLElement;

  let selectedIndex = 0;
  let isMenuOpen = false;
  let isMobile = false;
  let menuRef: HTMLElement;
  let currentScreen = "main";

  const menuItems = [
    { label: "Main Menu", action: () => handleScreenChange("main") },
    {
      label: "Play Guardians of Lumara",
      action: () => handleScreenChange("game"),
    },
  ];

  function handleScreenChange(screen: string) {
    currentScreen = screen;
    dispatch("changeScreen", screen);
    // Keep menu functional after screen change
    if (menuRef) {
      setTimeout(() => {
        menuRef.focus();
      }, 50);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Only handle keyboard events if menu is visible
    if (isMobile && !isMenuOpen) return;

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % menuItems.length;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      menuItems[selectedIndex].action();
    }
  }

  function toggleMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen && menuRef) {
      setTimeout(() => {
        menuRef.focus();
      }, 50);
    }
  }

  function handleMenuItemClick(index: number) {
    selectedIndex = index;
    menuItems[index].action();

    if (isMobile) {
      toggleMenu();
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;

    // Check if click is on the overlay
    const overlay = document.querySelector(".overlay");
    if (overlay && overlay.contains(target)) {
      isMenuOpen = false;
      return;
    }

    if (menuButtonRef && menuButtonRef.contains(target)) {
      return;
    }

    if (menuRef && menuRef.contains(target)) {
      return;
    }

    isMenuOpen = false;
  }

  onMount(() => {
    // Move the media query logic here
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    isMobile = mediaQuery.matches;

    const handleResize = (e: MediaQueryListEvent) => {
      isMobile = e.matches;
    };

    mediaQuery.addListener(handleResize);

    // Add event listeners inside onMount
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);

    if (menuRef) {
      menuRef.focus();
    }

    // Clean up function
    return () => {
      mediaQuery.removeListener(handleResize);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<nav
  class="arcade-navigation"
  class:mobile={isMobile}
  aria-label="Game navigation"
>
  {#if isMobile}
    <button
      bind:this={menuButtonRef}
      class="menu-button pixel-art"
      on:click|preventDefault|stopPropagation={toggleMenu}
      aria-expanded={isMenuOpen}
      aria-controls="menu-container"
    >
      MENU
    </button>
  {/if}

  {#if isMobile && isMenuOpen}
    <div
      class="overlay fixed inset-0 bg-[#2b2b2b] bg-opacity-70 z-[40]"
      on:click|stopPropagation={() => (isMenuOpen = false)}
      aria-hidden="true"
    />
  {/if}

  <div
    id="menu-container relative"
    class="menu-container pixel-art z-[101] text-link"
    class:hidden={isMobile && !isMenuOpen}
    tabindex="0"
    bind:this={menuRef}
    role="menu"
    aria-label="Game navigation"
  >
    {#if isMobile}
      <button
        class="close-button"
        on:click|stopPropagation={toggleMenu}
        aria-label="Close menu"
      >
        X
      </button>
    {/if}
    {#each menuItems as item, index}
      <button
        class="menu-item z-[50]"
        class:selected={selectedIndex === index}
        on:click|stopPropagation={() => handleMenuItemClick(index)}
        role="menuitem"
        aria-current={selectedIndex === index}
        data-screen={item.label.toLowerCase().replace(/\s+/g, "-")}
      >
        {#if selectedIndex === index}
          <span class="arrow" aria-hidden="true">▶</span>
        {/if}
        <span class="menu-text">{item.label}</span>
      </button>
    {/each}
  </div>
</nav>

<style lang="postcss">
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(43, 43, 43, 0.7);
    z-index: 90;
    pointer-events: auto;
  }

  .hidden {
    display: none !important;
  }

  .arcade-navigation {
    position: absolute;
    top: 1rem;
    left: 1.47rem;
    z-index: 100;
    /* pointer-events: none; */
  }

  .arcade-navigation.mobile {
    /* position: relative; */
    right: auto;
    z-index: 1;
    left: 1.19rem;
    top: 1.17rem;
  }

  .pixel-art {
    font-family: "Press Start 2P", cursive;
    font-size: 0.625rem;
    line-height: 1.65;
    text-transform: uppercase;
  }

  .menu-container {
    background-color: rgba(43, 43, 43, 0.55);
    border: 1px solid theme("colors.arcadeNeonGreen.200");
    padding: 0.35rem;
    border-radius: 4px;
    outline: none;
    pointer-events: auto;
    position: relative;
    z-index: 110;
  }

  .menu-container:focus {
    box-shadow: 0 0 0 1px theme("colors.arcadeNeonGreen.100");
  }

  .mobile .menu-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    pointer-events: auto;
    width: 90%;
    max-width: 400px;
  }

  .menu-item {
    color: var(--arcade-neon-green-100);
    padding: 0.45rem 0.65rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    outline: none;
    pointer-events: auto;
  }

  .menu-item:hover {
    color: theme("colors.arcadeNeonGreen.100");
    background-color: rgba(39, 255, 153, 0.05);
  }

  .menu-item.selected {
    color: theme("colors.arcadeNeonGreen.100");
    background-color: rgba(39, 255, 153, 0.1);
  }

  .mobile .menu-button {
    background-color: rgba(43, 43, 43, 0.55);
    color: var(--arcade-neon-green-100);
    border: 1px solid var(--arcade-neon-green-200);
    padding: 0.45rem 0.65rem;
    border-radius: 4px;
    pointer-events: auto;
  }

  .mobile .menu-item {
    background-color: transparent;
    color: var(--arcade-neon-green-100);
    border: none;
    padding: 0 1rem;
    margin: 0.5rem 0;
    border-radius: 4px;
    width: 80%;
    text-align: center;
    justify-content: center;
  }

  .arrow {
    margin-right: 0.5rem;
    margin-bottom: 5px;
    animation: blink 1s infinite;
    display: inline-block;
    width: 0.75em;
    text-align: center;
  }

  .menu-text {
    display: inline-block;
    vertical-align: middle;
    pointer-events: auto;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background-color: transparent;
    color: var(--arcade-neon-green-100);
    border: none;
    font-size: 0.65rem;
    cursor: pointer;
    pointer-events: auto;
  }
</style>
