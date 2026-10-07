import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders the MacCal calculator shell', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App />);
  });

  expect(tree?.toJSON()).toBeTruthy();
});
