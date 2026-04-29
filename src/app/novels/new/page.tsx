import { NovelCreationForm } from "@/components/novel-creation-form";

export default async function NewNovelPage() {
  return (
    <div className="page-stack creation-stack">
      <section className="panel creation-panel">
        <div className="panel-header creation-header">
          <div>
            <p className="panel-eyebrow">第 2 步</p>
            <h1>先把这本书建起来</h1>
            <p className="creation-summary">先把书建起来，后面再慢慢补细节。</p>
            <p className="creation-summary">先填核心信息，就能进入作品开始写。</p>
          </div>
        </div>

        <NovelCreationForm />
      </section>
    </div>
  );
}
