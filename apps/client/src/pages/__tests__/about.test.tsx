import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { it } from 'vitest';

import About from '../about';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(
    <Router>
      <About />
    </Router>,
    div,
  );
  ReactDOM.unmountComponentAtNode(div);
});
