/* navbar-collapse plugin for Docsify
 *
 * Copyright (c) 2021 Kevin Zolkiewicz.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
window.$docsify.plugins.push((hook) => {
  // Custom navigation collapsing support
  hook.doneEach(() => {
    const navbarItems = Array.from(
      document.querySelectorAll('main > .sidebar > .sidebar-nav > ul > li')
    );

    navbarItems.forEach((item) => {
      // Determine if nav item has sub menu
      const submenu = item.querySelector('ul');
      if (submenu) {
        item.classList.add('has-submenu');

        // Allow clicking on an active parent to collapse the sub menu
        const itemLink = item.querySelector('a');
        itemLink.addEventListener('click', () => {
          item.classList.toggle('collapse');
        });
      }

      // Determine if nav item has an active child
      const activeChild = item.querySelector('li.active');
      if (activeChild) {
        item.classList.add('active-child');
        activeChild.classList.add('active-child');
      }
    });

    // Fix a bug where an anchor link would not properly expand the navbar
    const activeAnchor = document.querySelector('.app-sub-sidebar .active-child');
    activeAnchor?.classList.remove('active-child');
    activeAnchor?.closest('li.has-submenu > ul > li')?.classList.add('active-child');

    // Fix a bug where clicking a sidebar anchor link for a top-level item would collapse the menu.
    const topLevelAnchors = document.querySelectorAll(
      '.sidebar-nav > ul > li > .app-sub-sidebar a'
    );

    topLevelAnchors.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.target?.closest('.has-submenu')?.classList.add('active-child');
      });
    });
  });
});
