import { Component, h, Host } from '@stencil/core';

@Component({
  tag: 'sy-lib-example',
  styleUrl: 'scss/index.scss',
  shadow: true,
})
export class Example {
  render() {
    return (
      <Host>
        <sy-button color="primary" variant="filled">
          Hello SYDLE UI!
        </sy-button>
      </Host>
    );
  }
}
