import { InviteLanding } from "@/components/invites/InviteLanding";

export const metadata = {
  title: "You're invited · Oxformals",
};

type Props = { params: Promise<{ code: string }> };

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  return <InviteLanding code={code.toLowerCase()} />;
}
