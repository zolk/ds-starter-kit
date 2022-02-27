/*
 * This plugin is modeled after a similar plugin built for use with Shoelace <https://shoelace.style/>. MIT License.
 *
 * Copyright (c) 2020 A Beautiful Site, LLC
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
window.$docsify.plugins.push((hook) => {
  // Handles all enhancements using data from the Custom Elements Manifest,
  // including the component headers and documentation tables.
  const TAG_PREFIX = 'ds-';

  const customElements = fetch('/dist/custom-elements.json')
    .then((res) => res.json())
    .catch((err) => console.error(err));

  function generatePropertiesTable(props) {
    return `
      <table>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Attribute</th>
            <th scope="col">Description</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
          </tr>
        </thead>
        <tbody>
          ${props
            .map((prop) => {
              return `<tr>
                <th scope="row"><code>${prop.name}</code></th>
                <td><code>${prop.attribute}</code></td>
                <td>${prop.description.replace(/`(.*?)`/g, '<code>$1</code>')}</td>
                <td><code>${prop.type.text.replace(/^\| /m, '')}</code></td>
                <td>${prop.default ? `<code>${prop.default}</code>` : '&ndash;'}</td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  function generateMethodsList(methods) {
    let result = '';

    methods.map((method) => {
      const hasParams = method.parameters?.length;

      result += `
        <h4><code>${method.name}(${
        hasParams
          ? method.parameters
              .map((param) => `${param.name}${param.optional ? '?' : ''}: ${param.type.text}`)
              .join(', ')
          : ''
      }) => ${method.return ? method.return.type.text : 'void'}</code></h4>
        <p>${method.description}</p>

        ${
          hasParams
            ? `
              <dl class="method-list">
              ${method.parameters.map((param) =>
                param.description
                  ? `<dt><code>${param.name}</code></dt><dd>${param.description}</dd>`
                  : ``
              )}
              </dl>
              `
            : ``
        }
      `;
    });

    return result;
  }

  function generateEventsTable(events) {
    return `
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Description</th>
            <th scope="col">Event Detail</th>
          </tr>
        </thead>
        <tbody>
          ${events
            .map((event) => {
              return `
                <tr>
                  <th scope="row">
                    <code>${event.name}</code>
                  </th>
                  <td>${event.description}</td>
                  <td>${event.type?.text ? `<code>${event.type?.text}</code>` : '-'}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  function generateSlotsTable(slots) {
    return `
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Description</th>
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
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  function generateCssPartsTable(parts) {
    return `
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          ${parts
            .map((part) => {
              return `
                <tr>
                  <th scope="row"><code>${part.name}</code></th>
                  <td>${part.description}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  function generateCssPropertiesTable(properties) {
    return `
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          ${properties
            .map((property) => {
              return `
                <tr>
                  <th scope="row"><code>${property.name}</code></th>
                  <td>${property.description}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  function getAllComponents(metadata) {
    const components = [];

    metadata.modules?.map((module) => {
      module.declarations?.map((declaration) => {
        if (declaration.customElement) {
          components.push(declaration);
        }
      });
    });

    return components;
  }

  function getComponent(metadata, tagName) {
    return getAllComponents(metadata).find((component) => component.tagName === tagName);
  }

  hook.beforeEach(async function (content, next) {
    const metadata = await customElements;
    const pathSegments = document.body.dataset.page.split('/');
    const isComponentPage = pathSegments[1] === 'components';
    const existingHeader = document.querySelector('.content > .markdown-header');

    if (existingHeader) {
      existingHeader.remove();
    }

    if (isComponentPage) {
      const file = pathSegments[2];
      const baseTagName = file.split('.')[0];
      const componentMeta = getComponent(metadata, TAG_PREFIX + baseTagName);

      //
      // Insert component header
      //
      content = content.replace(/^#{1} ([a-zA-Z]+)/, (_, title) => {
        const header = document.createElement('header');
        header.classList.add('markdown-header', 'component-header');
        header.innerHTML = `
          <div class="section">Components</div>
          <div class="header-status">
            <h1>${title}</h1>
            ${
              componentMeta?.status &&
              `<div class="status status--${componentMeta?.status}">${componentMeta?.status}</div>`
            }
          </div>
        `;

        const content = document.querySelector('.content');
        content.prepend(header);

        const dummyHeader = `## Overview`;
        return dummyHeader.replace(/^ +| +$/gm, '');
      });

      //
      // Handle headline
      //
      content = content.replace(/^#> (.+)/gm, (_, headline) => {
        const result = `<p class="headline">${headline}</p>`;

        return result.replace(/^ +| +$/gm, '');
      });

      //
      // Handle component metadata tag
      //
      content = content.replace(/\[component-metadata\]/, () => {
        let result = '';

        const members = componentMeta.members?.filter(
          (member) => member.description && member.privacy !== 'private'
        );
        const props = members?.filter((prop) => {
          return prop.kind === 'field';
        });
        const methods = members?.filter(
          (member) => member.kind === 'method' && member.privacy !== 'private'
        );

        if (props?.length) {
          result += `
          ### Properties
          ${generatePropertiesTable(props)}
        `;
        }

        if (methods?.length) {
          result += `
          ### Methods
          ${generateMethodsList(methods)}
        `;
        }

        if (componentMeta.events?.length) {
          result += `
          ### Events
          ${generateEventsTable(componentMeta.events)}
        `;
        }

        if (componentMeta.slots?.length) {
          result += `
          ### Slots
          ${generateSlotsTable(componentMeta.slots)}
        `;
        }

        if (componentMeta.cssParts?.length) {
          result += `
          ### CSS Parts
          ${generateCssPartsTable(componentMeta.cssParts)}
        `;
        }

        if (componentMeta.cssProperties?.length) {
          result += `
          ### CSS Custom Properties
          ${generateCssPropertiesTable(componentMeta.cssProperties)}
        `;
        }

        return result.replace(/^ +| +$/gm, '');
      });
    }

    next(content);
  });

  // Wrap tables for responsive horizontal scrolling
  hook.doneEach(function () {
    const content = document.querySelector('.content');
    const tables = [...content.querySelectorAll('table')];

    tables.map((table) => {
      table.outerHTML = `
        <div class="table-wrap">
          ${table.outerHTML}
        </div>
      `;
    });
  });
});
