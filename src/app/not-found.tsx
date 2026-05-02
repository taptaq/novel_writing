import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">未找到内容</p>
            <h1>这里还没有内容</h1>
          </div>
        </div>
        <p className="hero-text">先回作品列表，或者先看示例。</p>
        <div className="action-row">
          <Link className="button-primary" href="/novels">
            回作品列表
          </Link>
          <Link className="button-secondary" href="/demo/tide-and-embers">
            先看示例
          </Link>
        </div>
      </section>
    </div>
  );
}
