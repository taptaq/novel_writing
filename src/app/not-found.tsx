import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">未找到内容</p>
            <h1>这个工作区还没有准备好。</h1>
          </div>
        </div>
        <p className="hero-text">你可以先回到作品库，或者直接打开示例工作区继续看页面骨架。</p>
        <div className="action-row">
          <Link className="button-primary" href="/novels">
            回到作品库
          </Link>
          <Link className="button-secondary" href="/novels/tide-and-embers">
            打开示例工作区
          </Link>
        </div>
      </section>
    </div>
  );
}
