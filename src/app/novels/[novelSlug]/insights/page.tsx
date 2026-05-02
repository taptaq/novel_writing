import { redirect } from "next/navigation";

export default async function InsightsPage({ params }: { params: { novelSlug: string } }) {
  redirect(`/novels/${params.novelSlug}`);
}
