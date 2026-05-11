import { ProfileView } from "@/components/swap/ProfileView";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { userId } = await params;
  return <ProfileView userId={userId} />;
}
