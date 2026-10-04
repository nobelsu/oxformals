import { SeatLinkLanding } from "@/components/invites/SeatLinkLanding";

export const metadata = {
  title: "A seat for you · Oxformals",
};

type Props = { params: Promise<{ token: string }> };

export default async function SeatLinkPage({ params }: Props) {
  const { token } = await params;
  return <SeatLinkLanding token={token.toLowerCase()} />;
}
