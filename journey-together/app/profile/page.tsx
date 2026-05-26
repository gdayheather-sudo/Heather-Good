"use client";

import { AppFrame } from "@/components/AppFrame";
import { useStore } from "@/lib/store";
import { ProfileView } from "../profile/[userId]/ProfileView";

export default function MyProfilePage() {
  const { activeUser } = useStore();
  return (
    <AppFrame>
      <ProfileView userId={activeUser.id} self />
    </AppFrame>
  );
}
