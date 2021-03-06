/* code-preview plugin for Docsify
 *
 * Usage instructions:
 *
 * ```html preview expanded button
 * <ds-button>Button</ds-button>
 * ```
 *
 * List of tags:
 * (1 - html) The language of the snippet.
 * (2 - preview) Enables parsing by this plugin.
 * (3 - expanded) Optional. Expands the code source by default.
 * (4 - controls) Optional. Enable the controls feature for this snippet.
 * (5 - slug) Slug for loading the preview in an isolated window.
 *            Required for controls or loading in an isolated window.
 *
 * Copyright (c) 2021 Kevin Zolkiewicz.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 * This plugin builds upon a similar plugin developed for use with Shoelace <https://shoelace.style/>.
 * Copyright (c) 2020 A Beautiful Site, LLC
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { customElements, getComponent, TAG_PREFIX } from '../shared/cem.js';
import { copyButtonTemplate, handleCopyClick } from '../shared/copy-code.js';
import { kebabToTitleCase } from '../shared/utilities.js';

window.$docsify.plugins.push((hook, vm) => {
  let id = 0;
  let tagName;

  function highlightCode(element) {
    const snippet = element.outerHTML.replace(/(="")/g, '');
    return window.Prism.highlight(snippet, window.Prism.languages.html, 'html');
  }

  function renderSlotControl(slot, element) {
    const isDefault = slot.name === '';
    const slotName = isDefault ? 'default' : slot.name;
    const slotNodes = element.shadowRoot
      .querySelector(isDefault ? 'slot:not([name])' : `slot[name=${slotName}]`)
      .assignedNodes({ flatten: true });

    let slotContents = '';

    slotNodes.map((node) => {
      if (node.nodeName === '#text') {
        slotContents += node.textContent.trim();
      } else {
        slotContents += isDefault ? node.outerHTML.trim() : node.innerHTML.trim();
      }
    });

    return `<textarea name="${slotName}" rows="4">${slotContents}</textarea>`;
  }

  function renderControl(prop, element) {
    const defaultFromCodeSnippet = element.attributes[prop.attribute];

    const getDefaultProp = () => {
      if (defaultFromCodeSnippet) {
        return defaultFromCodeSnippet.value === '' ? true : defaultFromCodeSnippet.value;
      } else {
        return prop.default?.replace(/(['])/g, '') || '';
      }
    };

    const generateOptions = (options) => {
      const optionsArray = options.split('|');

      if (optionsArray.length > 5) {
        return `<select name="${prop.attribute}">${optionsArray
          .map((option) => {
            const value = option.replace(/([' ])/g, '');
            return `
              <option
                value="${value}"
                ${getDefaultProp() === value ? 'selected' : ''}
              >
                ${value}
              </option>`;
          })
          .join('')}</select>`;
      } else {
        return optionsArray
          .map((option) => {
            const value = option.replace(/([' ])/g, '');
            return `
              <label>
                <input
                  type="radio"
                  name="${prop.attribute}"
                  value="${value}"
                  ${getDefaultProp() === value ? 'checked' : ''}
                ></input>
                ${value}
              </label>`;
          })
          .join('');
      }
    };

    switch (prop.type.text) {
      case 'string':
        return `
          <label>
            <span>${prop.attribute}</span>
            <input
              type="text"
              name="${prop.attribute}"
              value="${getDefaultProp()}"
              placeholder="${prop.attribute}"
            ></input>
          </label>`;
      case 'number':
        return `
          <label>
            <span>${prop.attribute}</span>
            <input
              type="number"
              name="${prop.attribute}"
              value="${getDefaultProp()}"
              placeholder="${prop.attribute}"
            ></input>
          </label>`;
      case 'boolean':
        return `
          <label>
            <input
              type="checkbox"
              name="${prop.attribute}"
              ${getDefaultProp() === true ? `checked` : ''}
            ></input>
            ${prop.attribute}
          </label>`;
      default:
        return generateOptions(prop.type.text);
    }
  }

  function handleInputs(inputs, element, code) {
    [...inputs].map((input) => {
      input.addEventListener('input', (e) => {
        if (e.target.type === 'checkbox') {
          if (e.target.checked) {
            element.setAttribute(e.target.name, '');
          } else {
            element.removeAttribute(e.target.name);
          }
        } else if (e.target.type === 'textarea') {
          if (e.target.name === 'default') {
            const defaultSlot = element.querySelectorAll('*:not([slot])');

            console.log(defaultSlot);
            if (defaultSlot.length) {
              // If there are more than one nodes, update just the first one
              // with the new HTML and remove the rest.
              [...defaultSlot].map((node, i) => {
                if (i === 0) {
                  node.outerHTML = e.target.value;
                } else {
                  node.remove();
                }
              });
            } else {
              // Handle updates of single nodes.
              // Note: This method is problematic if there are named slots.
              element.innerHTML = e.target.value;
            }
          } else {
            // Updating a named slot
            const namedSlot = element.querySelector(`[slot=${e.target.name}]`);

            if (namedSlot) {
              // Update existing named slot if it exists
              namedSlot.innerHTML = e.target.value;
            } else {
              // Create a new named slot
              const newSlot = document.createElement('div');
              newSlot.setAttribute('slot', e.target.name);
              newSlot.innerHTML = e.target.value;
              element.appendChild(newSlot);
            }

            if (e.target.value === '') {
              // Remove the named slot if the new value is empty
              namedSlot.remove();
            }
          }
        } else {
          element.setAttribute(e.target.name, e.target.value);
        }

        code.firstChild.innerHTML = `<code>${highlightCode(element)}</code>`;
        code.firstChild.insertAdjacentHTML('beforeend', copyButtonTemplate);
      });
    });
  }

  async function controlInterface() {
    const metadata = await customElements;
    const pathSegments = document.body.dataset.page.split('/');
    tagName = TAG_PREFIX + pathSegments[2].split('.')[0];
    const componentMeta = getComponent(metadata, tagName);

    const element = document.querySelector(tagName);

    const slots = componentMeta.slots;

    const members = componentMeta.members?.filter(
      (member) => member.description && member.privacy !== 'private'
    );

    const props = members?.filter((prop) => {
      return prop.kind === 'field';
    });

    return `
      ${
        slots.length
          ? `
          <table>
            <thead>
              <tr>
                <th scope="col">Slot</th>
                <th scope="col">Description</th>
                <th scope="col">Control</th>
              </tr>
            </thead>
            <tbody>
            ${slots
              .map((slot) => {
                return `
                <tr>
                  <th scope="row">
                    ${slot.name === '' ? 'Default slot' : `<code>${slot.name}</code>`}
                  </th>
                  <td>${slot.description}</td>
                  <td>${renderSlotControl(slot, element)}</td>
                </tr>
              `;
              })
              .join('')}
            <tbody>
          `
          : ''
      }
      <table>
        <thead>
          <tr>
            <th scope="col">Attribute</th>
            <th scope="col">Description</th>
            <th scope="col">Default</th>
            <th scope="col">Control</th>
          </tr>
        </thead>
        <tbody>
          ${props
            .map((prop) => {
              return `<tr>
                <th scope="row"><code>${prop.attribute}</code></th>
                <td>${prop.description.replace(/`(.*?)`/g, '<code>$1</code>')}</td>
                <td>${prop.default ? `<code>${prop.default}</code>` : '&ndash;'}</td>
                <td><div class="controls__group">${renderControl(prop, element)}</div></td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  function runScript(script) {
    const newScript = document.createElement('script');

    if (script.type === 'module') {
      newScript.type = 'module';
      newScript.textContent = script.innerHTML;
    } else {
      newScript.appendChild(document.createTextNode(`(() => { ${script.innerHTML} })();`));
    }

    script.parentNode.replaceChild(newScript, script);
  }

  // Replace code preview blocks with rendered previews.
  hook.afterEach((html, next) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    [...doc.querySelectorAll('code.preview')].map((block) => {
      const pre = block.closest('pre');
      const isExpanded = block.classList.contains('expanded');
      const showControls = block.classList.contains('controls');
      const sourceId = 'code-source-' + id;
      const lastClass = [...block.classList].pop();
      const hasSlug = !['preview', 'expanded', 'controls'].includes(lastClass);

      const slug = () => {
        if (hasSlug) {
          return lastClass;
        } else {
          return id;
        }
      };

      const exampleId = 'example-' + slug();

      const codeBlock = `
        <div class="code-preview ${isExpanded ? 'code-preview--expanded' : ''}">
          <div class="code-preview__preview" id=${exampleId}>
            ${block.textContent}
            <div
              class="code-preview__resizer"
              aria-controls="${exampleId}"
              role="slider"
              tabindex="0"
            >
              <svg width="11" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M.586 3.414A2 2 0 1 0 3.414.586 2 2 0 0 0 .586 3.414ZM.586 9.414a2 2 0 1 0 2.828-2.828A2 2 0 0 0 .586 9.414ZM.586 15.414a2 2 0 1 0 2.828-2.828 2 2 0 0 0-2.828 2.828ZM7.586 3.414A2 2 0 1 0 10.414.586a2 2 0 0 0-2.828 2.828ZM7.586 9.414a2 2 0 1 0 2.828-2.828 2 2 0 0 0-2.828 2.828ZM7.586 15.414a2 2 0 1 0 2.828-2.828 2 2 0 0 0-2.828 2.828Z" fill="currentColor"/></svg>
            </div>
          </div>
          <div class="code-preview__source" id=${sourceId}>${pre.outerHTML}</div>
          <div class="code-preview__actions">
            <button
              class="code-preview__toggle
              aria-expanded="${isExpanded ? 'true' : 'false'}"
              aria-controls="${sourceId}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span>
                ${isExpanded ? 'Hide ' : 'Show'} Code
              </span>
            </button>
            <div class="code-preview__actions-spacer"></div>
            ${
              hasSlug && showControls
                ? `
                  <span>
                    <a href="?controls=${slug()}" target="_blank">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                      </svg>
                      Customize
                    </a>
                  </span>
                  `
                : ''
            }
            ${
              hasSlug
                ? `
                <span>
                  <a href="?preview=${slug()}" target="_blank">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 448 512"><path d="M256 64c0-17.67 14.3-32 32-32h127.1c5.2 0 9.4.86 13.1 2.43 2.9 1.55 7.3 3.84 10.4 6.87 0 .05 0 .1.1.14 6.2 6.22 8.4 14.34 9.3 22.46V192c0 17.7-14.3 32-32 32s-32-14.3-32-32v-50.7L214.6 310.6c-12.5 12.5-32.7 12.5-45.2 0s-12.5-32.7 0-45.2L338.7 96H288c-17.7 0-32-14.33-32-32zM0 128c0-35.35 28.65-64 64-64h96c17.7 0 32 14.33 32 32 0 17.7-14.3 32-32 32H64v288h288v-96c0-17.7 14.3-32 32-32s32 14.3 32 32v96c0 35.3-28.7 64-64 64H64c-35.35 0-64-28.7-64-64V128z" fill="currentColor"/></svg>
                    Open in New Window
                  </a>
                </span>
                  `
                : ''
            }
          </div>
        </div>
      `;

      pre.replaceWith(parser.parseFromString(codeBlock, 'text/html').body);
      id++;
    });

    next(doc.body.innerHTML);
  });

  // Execute script tags.
  // Allow for resizing of preview box.
  hook.doneEach(() => {
    [...document.querySelectorAll('.code-preview__preview script')].map((script) =>
      runScript(script)
    );

    [...document.querySelectorAll('.code-preview')].map((block) => {
      const resizer = block.querySelector('.code-preview__resizer');
      const preview = block.querySelector('.code-preview__preview');

      let startX;
      let startWidth;

      const getStart = (event) => {
        startX = event.changedTouches ? event.changedTouches[0].pageX : event.clientX;
        startWidth = parseInt(document.defaultView.getComputedStyle(preview).width, 10);
      };

      const setWidth = (newWidth) => {
        preview.style.width = `${startWidth + newWidth}px`;
      };

      const mouseDownHandler = (event) => {
        resizer.classList.add('code-preview__resizer--resizing');
        event.preventDefault();
        getStart(event);

        document.addEventListener('mousemove', startDrag);
        document.addEventListener('touchmove', startDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
      };

      const keyDownHandler = (event) => {
        getStart(event);

        if (
          [
            'ArrowDown',
            'ArrowLeft',
            'ArrowUp',
            'ArrowRight',
            'Home',
            'End',
            'PageUp',
            'PageDown',
          ].includes(event.key)
        ) {
          event.preventDefault();

          switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
              setWidth(-10);
              break;
            case 'ArrowRight':
            case 'ArrowUp':
              setWidth(10);
              break;
            case 'PageUp':
              setWidth(100);
              break;
            case 'PageDown':
              setWidth(-100);
              break;
            case 'Home':
              setWidth(-startWidth);
              break;
            case 'End':
              setWidth(10000);
              break;
          }
        }
      };

      const startDrag = (event) => {
        const newX = event.clientX - startX;
        setWidth(newX);
      };

      const stopDrag = () => {
        resizer.classList.remove('code-preview__resizer--resizing');
        document.removeEventListener('mousemove', startDrag);
        document.removeEventListener('touchmove', startDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
      };

      resizer.addEventListener('mousedown', mouseDownHandler);
      resizer.addEventListener('touchstart', mouseDownHandler);
      resizer.addEventListener('keydown', keyDownHandler);
    });
  });

  // Prepare to load a preview in an isolated window.
  hook.mounted(() => {
    if (vm.route.query.preview || vm.route.query.controls) {
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = 0;
      overlay.style.left = 0;
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'white';

      document.body.appendChild(overlay);
    }
  });

  // Load the preview or controls in an isolated window.
  hook.ready(async () => {
    const exampleId = vm.route.query.preview || vm.route.query.controls;

    // Load the preview
    if (exampleId) {
      const preview = document.querySelector(`#example-${exampleId}`);
      preview.classList.add('controls__preview');
      document.body.classList.add('example');
      document.body.innerHTML = '';
      document.body.appendChild(preview);
    }

    if (vm.route.query.preview) {
      document.title = `${document.title} - ${kebabToTitleCase(exampleId)} - Preview`;
    }

    // Load the controls interface
    if (vm.route.query.controls) {
      document.title = `${document.title} - ${kebabToTitleCase(exampleId)} - Customize`;
      document.body.classList.add('controls');

      const controlsInterface = document.createElement('div');
      controlsInterface.classList.add('controls__inputs');
      controlsInterface.innerHTML = await controlInterface();
      document.body.appendChild(controlsInterface);

      const element = document.querySelector(tagName);

      const codeContainer = document.createElement('div');
      codeContainer.classList.add('controls__code');
      codeContainer.innerHTML = `<pre><code></code></pre>`;
      codeContainer.addEventListener('click', handleCopyClick);

      const code = codeContainer.firstChild.firstChild;
      code.innerHTML = highlightCode(element);
      code.insertAdjacentHTML('beforeend', copyButtonTemplate);

      document.body.appendChild(codeContainer);

      const inputs = document.querySelectorAll('input, select, textarea');
      handleInputs(inputs, element, codeContainer);
    }
  });

  // Toggle display of source code
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.code-preview__toggle');

    if (button) {
      const codePreview = event.target.closest('.code-preview');
      codePreview.classList.toggle('code-preview--expanded');

      const isExpanded = codePreview.classList.contains('code-preview--expanded');
      event.target.setAttribute('aria-expanded', isExpanded);
      button.querySelector('span').innerText = `${isExpanded ? 'Hide ' : 'Show'} Code`;
    }
  });
});
