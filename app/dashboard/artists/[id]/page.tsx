"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ArtistsPluralRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/artist/${id}`);
    } else {
      router.replace("/dashboard/search?type=ARTIST");
    }
  }, [id, router]);

  return (
    <div className="py-24 text-center text-slate-500">
      Đang chuyển hướng tới trang nghệ sĩ...
    </div>
  );
}
