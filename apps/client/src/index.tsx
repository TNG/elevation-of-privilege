import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Route, BrowserRouter as Router } from 'react-router-dom';
import App from './pages/app';
import Create from './pages/create';
import About from './pages/about';

ReactDOM.render(
  <Router>
    <div>
      <Route path="/:game/:id/:secret" component={App} />
      <Route exact path="/" component={Create} />
      <Route exact path="/about" component={About} />
    </div>
  </Router>,
  document.getElementById('root'),
);
