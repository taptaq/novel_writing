import { NovelCreationForm } from "@/components/novel-creation-form";

export default async function NewNovelPage() {
  return (
    <div className="page-stack creation-stack">
      <section className="panel creation-panel">
        <div className="panel-header creation-header">
          <div>
            <p className="panel-eyebrow">新建书籍</p>
            <h1>先把项目建起来</h1>
            <p className="creation-summary">填完核心信息，再补几个人物种子，就能直接进入工作区。</p>
          </div>
        </div>

        <NovelCreationForm />
      </section>
    </div>
  );
}
