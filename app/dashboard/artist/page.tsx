import { redirect } from "next/navigation";

export default function DashboardArtistPage() {
  redirect("/dashboard/search?type=ARTIST");
}
