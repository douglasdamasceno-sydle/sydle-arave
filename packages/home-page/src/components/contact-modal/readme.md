# sy-lib-contact-modal



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute         | Description                              | Type      | Default |
| ---------------- | ----------------- | ---------------------------------------- | --------- | ------- |
| `defaultSubject` | `default-subject` | Assunto pré-preenchido ao abrir o modal. | `string`  | `''`    |
| `open`           | `open`            | Controla a abertura do modal.            | `boolean` | `false` |


## Events

| Event                    | Description                                                           | Type                |
| ------------------------ | --------------------------------------------------------------------- | ------------------- |
| `syLibContactModalClose` | Disparado quando o usuário fecha o modal (botão, Esc ou clique fora). | `CustomEvent<void>` |


## Dependencies

### Used by

 - [sy-lib-home](../home)

### Graph
```mermaid
graph TD;
  sy-lib-home --> sy-lib-contact-modal
  style sy-lib-contact-modal fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
