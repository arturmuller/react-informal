import React from "react";
import createDebug from "debug";
import invariant from "invariant";
import T from "prop-types";
import R from "ramda";

import * as transforms from "./transforms";

// Loggers

const debugForm = createDebug("react-informal:form");
const debugField = createDebug("react-informal:field");

// Common Structures

const formContextType = T.shape({
  update: T.func.isRequired,
  subscribe: T.func.isRequired,
  getState: T.func.isRequired,
  submit: T.func.isRequired,
}).isRequired;

const validationType = T.shape({
  test: T.oneOfType([T.instanceOf(RegExp), T.func]).isRequired,
  message: T.node,
}).isRequired;

// Components

// `Form` component has several roles:
// - It holds the top-level state of the form
// - It provides context to nested inputs
// - It provdes methods to update the state

export class Form extends React.Component {
  static propTypes = {
    onSubmit: T.func.isRequired,
    noValidate: T.bool,
    children: T.node,
  };

  static defaultProps = {
    noValidate: true,
  };

  static childContextTypes = {
    form: formContextType,
  };

  form = {
    status: "initial", // "initial" | "pending" | "fulfilled" | "rejected"
    submitted: false,
    data: null,
    error: null,
    valid: true,
    touched: false,
    dirty: false,
    fields: {},
  };

  subscriptions = [];

  getChildContext = () => ({
    form: {
      update: this.update,
      subscribe: this.subscribe,
      getState: this.getState,
      submit: this.submit,
    },
  });

  // `getState` is used during initialization of form subscibers. Further
  // updates are received through subscriptions.
  getState = () => {
    return this.form;
  };

  // `update` is used for transforming the form state.
  update = updater => {
    // `updater` param takes previous state and should return updated state
    this.form = updater(this.form);
    debugForm("Form state updated %o", this.form);

    // Notify all subscribers of new state
    this.subscriptions.forEach(cb => cb(this.form));
  };

  // `subscribe` is used by nested form components to receive updates on state
  // change even if intermediate components implement shouldComponentUpdate.
  subscribe = cb => {
    // Add callback to a list of subscriptions
    this.subscriptions.push(cb);

    // Returns an `unsubscribe` function
    return () => {
      this.subscriptions = this.subscriptions.filter(sub => sub !== cb);
    };
  };

  submit = async () => {
    debugForm("Attempting to submit form");
    const { onSubmit: submitForm } = this.props;
    if (this.form.valid) {
      this.update(transforms.onFormSubmit());
      try {
        const result = await submitForm(transforms.getFormValues(this.form));
        debugForm("Form submitted successfully");
        this.update(transforms.onFormSubmitSuccess(result));
        return result;
      } catch (error) {
        debugForm("Form submission failed");
        console.error(error); // eslint-disable-line
        this.update(transforms.onFormSubmitError(error));
        return error;
      }
    }

    debugForm("Form was not submitted due to invalid fields");
    this.update(transforms.onFormSubmitInvalid());
    return null; // Not sure this is a good idea?
  };

  handleSubmit = async event => {
    // Avoid default browser submission
    event.preventDefault();
    this.submit();
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit} noValidate={this.props.noValidate}>
        {this.props.children}
      </form>
    );
  }
}

// `connectForm` enhancer is used to retrieve form state from the `Form`
// component and subscribe to any further changes.

export const connectForm = (mapForm = form => ({ form })) => Component => {
  invariant(
    Component,
    "[react-informal/connectForm] Missing wrapped component"
  );

  return class FormState extends React.Component {
    static contextTypes = {
      form: formContextType,
    };

    componentWillMount() {
      const state = this.context.form.getState();
      this.setState(state);
    }

    componentDidMount() {
      const cb = state => this.setState(state);
      this.unsubscribe = this.context.form.subscribe(cb);
    }

    componentWillUnmount() {
      // Development convenience — if error thows, somehow the listener is not
      // set up properly...
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    }

    render() {
      return (
        <Component
          {...this.props}
          {...mapForm(this.state, this.context.form)}
        />
      );
    }
  };
};

// `connectField` enhancer is used to retrieve form state from the `Form`
// component, subscribe to any further changes, and provide methods for
// transforming top-level state.

export const connectField = (mapField = field => ({ field })) => Component => {
  invariant(
    Component,
    "[react-informal/connectField] Missing wrapped component"
  );

  return class FieldState extends React.Component {
    static contextTypes = {
      form: formContextType,
    };

    static propTypes = {
      name: T.string.isRequired,
      type: T.string,
      defaultValue: T.any,
      validations: T.arrayOf(validationType),
    };

    setValue = value => {
      const { props, context } = this;
      context.form.update(transforms.onFieldChange(props.name, value));
    };

    handleChange = event => {
      const { value } = event.target;
      const { props, context } = this;
      context.form.update(transforms.onFieldChange(props.name, value));
    };

    handleFocus = () => {
      const { props, context } = this;
      context.form.update(transforms.onFieldFocus(props.name));
    };

    handleBlur = () => {
      const { props, context } = this;
      context.form.update(transforms.onFieldBlur(props.name));
    };

    componentWillMount() {
      const { update, getState } = this.context.form;
      const { name, defaultValue, validations } = this.props;

      // Add field to form state
      debugField("Adding field `%s` to form", name);
      update(transforms.addField({ name, defaultValue, validations }));

      // And now populate local state with field data
      this.setState(getState().fields[name]);
    }

    componentDidMount() {
      const cb = state => this.setState(state.fields[this.props.name]);
      this.unsubscribe = this.context.form.subscribe(cb);
    }

    componentWillUnmount() {
      // Development convenience — if error thows, somehow the listener is not
      // set up properly...
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      const { name } = this.props;
      debugField(`Removing field "${name}" from form`);
      this.context.form.update(transforms.removeField(name));
    }

    render() {
      const { state, props: wrapperProps } = this;

      // Omit "consumed" props so that it is easy to spread `this.props`
      // to the final component.
      const props = R.omit(["validations", "defaultValue"], wrapperProps);
      const mapped = mapField(
        {
          ...state,
          setValue: this.setValue,
          input: {
            value: state.value,
            onChange: this.handleChange,
            onFocus: this.handleFocus,
            onBlur: this.handleBlur,
          },
        },
        this.context.form
      );

      return <Component {...mapped} {...props} />;
    }
  };
};
