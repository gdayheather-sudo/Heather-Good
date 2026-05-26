"use client";

import { AppFrame } from "@/components/AppFrame";
import { useParams } from "next/navigation";
import { ProfileView } from "./ProfileView";

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  return (
    <AppFrame>
      <ProfileView userId={userId} />
    </AppFrame>
  );
}
