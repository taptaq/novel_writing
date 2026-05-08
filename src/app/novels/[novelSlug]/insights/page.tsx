import { redirect } from "next/navigation";
import { decodeRouteParam, encodeRouteParam } from "@/lib/route-params";

export default async function InsightsPage({ params }: { params: { novelSlug: string } }) {
  const novelSlug = decodeRouteParam(params.novelSlug);
  redirect(`/novels/${encodeRouteParam(novelSlug)}`);
}
