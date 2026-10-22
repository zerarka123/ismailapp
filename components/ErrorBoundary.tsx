import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    document.body.classList.add('loaded');
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>حدث خطأ غير متوقع</h1>
        <p style={{ opacity: 0.7 }}>أغلق التطبيق وافتحه من جديد. إن تكرر الخطأ راسلنا من خانة «إبلاغ».</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ background: '#093753', color: '#fff', border: 0, borderRadius: 999, padding: '12px 28px', fontWeight: 700 }}
        >
          إعادة التحميل
        </button>
      </div>
    );
  }
}
