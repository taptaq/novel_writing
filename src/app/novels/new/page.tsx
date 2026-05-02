import { NovelCreationForm } from "@/components/novel-creation-form";

export default async function NewNovelPage() {
  return (
    <div className="page-stack creation-stack">
      <section className="panel creation-panel">
        <div className="panel-header creation-header">
          <div>
            <p className="panel-eyebrow">第 2 步</p>
            <h1>先建这本书</h1>
            <p className="creation-summary">先填最少的。</p>
            <p className="creation-summary">能开始写就够了。</p>
          </div>
        </div>

        <NovelCreationForm />
      </section>
    </div>
  );
}
