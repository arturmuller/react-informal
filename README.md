# React Informal

> React forms without the ceremony.

Use components — the primary form of abstraction in React — to configure forms. No up-front setup, no state-management boilerplate.

Rules, like field names or validations, are supplied as props to field components, which become registered by to form simply by mounting. If you find this pattern familiar, it is because this is exactly how the regular HTML form elements work! :sparkles:

This approach leads to modular, reusable, and flexible code.

## Installation

```sh
npm install --save react-informal
```


## Barebones Example

Suppose we have the following tiny app:

```js
import React from "react";
import ReactDOM from "react-dom";
import { Form, connectField } from "react-informal";

// Barebones text field component
const TextField = connectField()(({ field, ...rest }) =>
  <input {...rest} {...field.input} />
);

// Main view component
const View = () =>
  <Form onSubmit={data => Promise.resolve(alert(JSON.stringify(data)))}>
    <TextField name="name" />
    <TextField name="email" />
    <TextField name="tel" />
    <button type="submit">Submit</button>
  </Form>;

// Render components to DOM
ReactDOM.render(<View />, document.getElementById("app"));
```

Now, if the user fills in the above form with "John", "john@example.com", and "+44 200 200 200" for name, email, and tel respectively, the `onSubmit` handler would be called with the argument `{name: "John", email: "john@example.com", tel: "+44 200 200 200"}` once the Submit button is clicked.


## API Overview

The library contains three components, all available as named exports.

- `Form` component
- `connectField` higher-order component
- `connectForm` higher-order component

> If you're unsure about what higher-order components are, I recommend these two articles for a quick primer: [Mixins are Dead, Long Live Higher Order Components](https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750), and [Container Components](https://medium.com/@learnreact/container-components-c0e67432e005)


### `Form` Component

<!--
TODO: Mention noValidation default prop
TODO: Mention prevent default
-->

The `Form` component provides top-level form state, exposes it to nested components and handles submissions.

This component has one required prop: `onSubmit`.

`onSubmit` should be passed a function that returns a Promise. This function will be called with form data object (a map of field names to field values) when a valid form is submitted.

All other props will be passed to the underlying DOM element `<form>`.

Once `onSubmit` is triggered, the following things will happen:

1. The form will check whether it is valid and all nested fields will be marked as `submitted`. Any connected component can use this prop to, for instance, show validation messages.
2. If the form is not valid, no further actions take place.
3. If the form is valid, the `onSubmit` handler will be called and form `status` prop set to `"pending"`.
4. If the promise returned from the submit function resolves successfully, the form `status` will be set to `fulfilled`, and the resulting value will be made available under the `data` prop.
5. If the promise returned from the submit function rejects, the form `status` will be set to `rejected`, and the rejected value will be made available under the `error` prop.

<!-- TODO: A state diagram might be handy here. -->

```js
import React from "react";
import { Form } from "react-informal";

const View = () =>
  <Form onSubmit={data => Promise.resolve(alert(JSON.stringify(data)))}>
    {/* children */}
  </Form>;
)
```

Note that just like native DOM `<form>` elements, `<Form>` components cannot be nested.


### `connectField` Higher-Order Component

The `connectField` registers a form field element in the top-level form state upon mounting, and supplies relevant state and methods to the wrapped component so that it can update the state. This is the component you will probably interact with the most.

`connectField` takes two arguments:

- `mapProps`: fn (formState) => props (optional) — Mapping function
- `Component`: React Component

The return value of `connectField(mapProps)(Component)` is an enhanced component that uses three props:

- `name`: string (required) — Used to namespace the value of this component into the `data` object which is passed to the form `onSubmit` handler.
- `defaultValue`: string (optional) — If you want to initialise this form field with something else then an empty string, add it here.
- `validations`: Array of validation objects (optional)

```js
import React from "react";
import { connectField } from "react-informal";

// Plain TextField component
const PlainTextField = ({ label, messages, ...rest }) =>
  <div>
    <div>{label}</div>
    <input {...rest} />
    {messages.length > 0 &&
      messages.map(message => <div key={message}>{message}</div>)
    }
  </div>

// Use `connectField` to connect the plain text field to form state
const mapFieldProps = field => ({ ...field.input, messages: field.messages });
const TextField = connectField(mapFieldProps)(PlainTextField)

// ---

// FormTextField usage
const View = () =>
  <Form onSubmit={data => Promise.resolve(alert(JSON.stringify(data)))}>
    <TextField name="name"/>
    <TextField name="username"/>
    <button type="submit">Submit</button>
  </Form>;
)

```

<!--
TODO: Add example usage
TODO: Specify which props will be passed to
-->

### `connectForm` Higher-Order Component

The `connectForm` subscribes to the entire form state and supplies it as props to the wrapped component.

<!--
TODO: Add example usage
-->

## Tips & Tricks

Use the prop mapping functions in `connectForm` and `connectField` higher-order components to make sure the API of your wrapped components is nice and clean, so that they can be easily used both with and without being enhanced.

For example:

```js
import React from "react";
import { connectField } from "react-informal";

const TextField = ({label, visited, messages, ...rest}) => (
  <div>
    <label>{label}</label>
    <input {...rest} />
    {visited &&
      messages.map(message => <div key={message}>{message}</div>)}
  </div>
);

const mapProps = field => ({
  ...field.input,
  visited: field.visited,
  messages: field.messages
})

export { TextField }
export default connectField(mapProps)(TextField)
```

Now the default export is a "connected" component that expects to be used within the context of a `<Form>`, but the secondary export can just as well be used standalone in cases where `<Form>` might not be needed.

<!--

TODO:
- Handle cases where props to the connectField enhancer change. For instance validations...
- Wrap display names
- Don't require the user to submit a Promise.
- Use Redux style actions to allow for: A) async validation & debouncing and B) middleware compatibility with Redux for stuff like logging.
- Allow submit imperatively through passed props.

Forms have a lot of different state types that can get pretty confusing. In the context of this library, these are the meanings:

- field is `valid` if all validations pass
- field is `active` if it currently has focus
- field is `visited` if it had focus at least once
- field is `edited` if it has been edited at least once
- field is `dirty` if its value differs from its default value
- field is `submitted` if the form has been submitted at least once


Form

Type annotations written in [flow](https://flow.org).

```js

type WithFormProps = {
  status: "initial" | "pending" | "fulfilled" | "rejected",
  valid: boolean,
  touched: boolean,
  submitted: boolean,
  dirty: boolean,
  data: ?any,
  error: ?any,
  fields: {
    [name: string]: Field
  }
}

type WithFieldProps = {
  name: string,
  value: string,
  defaultValue: string,
  active: boolean,
  valid: boolean,
  active: boolean,
  visited: boolean,
  edited: boolean,
  dirty: boolean,
  submitted: boolean,
  messages: Array<?any>,
  validations: Array<?Validation>,
  input: {
    name: string,
    value: string,
    onChange: (event: KeyboardEvent) => void,
    onFocus: () => void,
    onBlur: () => void,
  },
}

type Validation = {
  test: RegExp | (value: any) => boolean,
  message: any,
}
```

-->
