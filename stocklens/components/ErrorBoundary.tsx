'use client';
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

// React 제약: ErrorBoundary는 클래스 컴포넌트로만 구현 가능
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="sl-error">
          <h2>문제가 발생했습니다</h2>
          <p>{this.state.message}</p>
          <button className="sl-btn" onClick={this.handleReset}>다시 시도</button>
        </div>
      );
    }
    return this.props.children;
  }
}
