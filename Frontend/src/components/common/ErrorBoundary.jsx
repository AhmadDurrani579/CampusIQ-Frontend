import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('CampusIQ interface error:', error); }
  render() { if (this.state.failed) return <main className="standalone-state"><h1>This view couldn’t be opened</h1><p>Please reload the page. If the problem continues, contact your university administrator.</p><button className="button button-primary" onClick={() => window.location.reload()}>Reload page</button></main>; return this.props.children; }
}
