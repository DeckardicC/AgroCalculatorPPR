/* eslint-disable jest/no-disabled-tests */
/**
 * @format
 */

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({children}: any) => children,
}));

describe.skip('App bootstrap', () => {
  it('renders correctly', async () => {
    const React = require('react');
    const ReactTestRenderer = require('react-test-renderer');
    const App = require('../App').default;

    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(React.createElement(App));
    });
  });
});
