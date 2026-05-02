import { redirect } from "next/navigation";

export default async function GraphPage({ params }: { params: { novelSlug: string } }) {
  redirect(`/novels/${params.novelSlug}/world`);
}
